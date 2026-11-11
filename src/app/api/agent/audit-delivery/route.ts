import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { agentEngine } from '@/lib/agent-engine';
import { computeBlockHash } from '@/lib/crypto-audit';

const AuditSchema = z.object({
  transactionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = AuditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid transactionId is required' }, { status: 400 });
    }

    const { transactionId } = parsed.data;
    const tenantDb = getTenantDb(session.organizationId);

    // IDOR check
    const transaction = await tenantDb.transactions.findUnique(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found or access denied' }, { status: 404 });
    }

    const policy = await tenantDb.policy.findFirst();
    const autoCaptureThreshold = policy?.autoCaptureThreshold ?? 25000.0;

    // Run Autonomous Delivery Audit
    const auditResult = await agentEngine.auditDelivery({
      transactionId,
      proofUrl: transaction.deliverableProofUrl,
      proofHash: transaction.deliverableProofHash,
      escrowConditions: transaction.escrowConditions,
      amount: transaction.amount,
      policyThreshold: autoCaptureThreshold,
    });

    // Update Transaction with Audit Results
    const newStatus = auditResult.passed
      ? transaction.status
      : 'FLAGGED_DISCREPANCY';

    const updated = await tenantDb.transactions.update({
      where: { id: transactionId },
      data: {
        auditScore: auditResult.score,
        auditNotes: auditResult.aiNotes,
        status: newStatus,
      },
    });

    // Hash-Chained Audit Entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const action = 'AGENT_DELIVERY_AUDITED';
    const details = JSON.stringify({
      transactionId,
      score: auditResult.score,
      passed: auditResult.passed,
      autoExecutable: auditResult.autoExecutable,
      reasons: auditResult.reasons,
    });
    const currentHash = computeBlockHash(prevHash, timestamp, action, details);

    await tenantDb.auditLogs.create({
      userId: session.userId,
      action,
      entityType: 'LedgerTransaction',
      entityId: transactionId,
      details,
      previousHash: prevHash,
      currentHash,
    });

    return NextResponse.json({
      success: true,
      auditResult,
      transaction: updated,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to execute delivery audit', details: String(error) }, { status: 500 });
  }
}
