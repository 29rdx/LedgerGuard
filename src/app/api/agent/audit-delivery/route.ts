import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { agentEngine } from '@/lib/agent-engine';
import { paypalClient } from '@/lib/paypal-client';
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
    const maxAutoCaptureAmount = policy?.maxAutoCaptureAmount ?? 2500.0;
    const maxAllowedRiskScore = policy?.maxAllowedRiskScore ?? 35;

    // Run Autonomous Delivery Audit
    const auditResult = await agentEngine.auditDelivery({
      transactionId,
      proofUrl: transaction.deliverableProofUrl,
      proofHash: transaction.proofFileHash,
      deliverableSummary: transaction.deliverableSummary,
      amount: transaction.amount,
      maxAutoCaptureAmount,
      maxAllowedRiskScore,
    });

    // Auto-capture execution if policy criteria satisfied
    let captureResult = null;
    let finalStatus = transaction.status;

    if (auditResult.verdict === 'APPROVED') {
      finalStatus = 'AUDIT_PASSED';
      if (auditResult.autoExecutable) {
        captureResult = await paypalClient.captureOrder(
          transaction.paypalOrderId,
          transaction.paypalAuthId,
          transaction.amount,
          transaction.currency
        );
        finalStatus = 'CAPTURED';
      }
    } else if (auditResult.verdict === 'FLAGGED') {
      finalStatus = 'FLAGGED_DISPUTE';
    }

    const updated = await tenantDb.transactions.update({
      where: { id: transactionId },
      data: {
        aiRiskScore: auditResult.riskScore,
        aiAuditVerdict: auditResult.verdict,
        aiAuditReasoning: auditResult.aiNotes,
        status: finalStatus,
        paypalCaptureId: captureResult?.captureId || transaction.paypalCaptureId,
      },
    });

    // Hash-Chained Audit Entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'AI_AGENT';
    const action = 'PROOF_OF_DELIVERY_AUDITED';
    const details = JSON.stringify({
      transactionId,
      verdict: auditResult.verdict,
      riskScore: auditResult.riskScore,
      autoCaptured: Boolean(captureResult),
      reasons: auditResult.reasons,
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    await tenantDb.auditLogs.create({
      actor,
      action,
      targetId: transactionId,
      paypalEndpoint: captureResult ? `/v2/payments/authorizations/${transaction.paypalAuthId}/capture` : null,
      httpStatus: 200,
      redactedDetails: details,
      previousHash: prevHash,
      recordHash,
    });

    return NextResponse.json({
      success: true,
      auditResult,
      transaction: updated,
      autoCaptured: Boolean(captureResult),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to execute delivery audit', details: String(error) }, { status: 500 });
  }
}
