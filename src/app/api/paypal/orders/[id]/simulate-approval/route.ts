import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.organizationId);

  const tx = await tenantDb.transactions.findUnique(id);
  if (!tx) {
    return NextResponse.json({ error: 'NotFound', message: 'Transaction not found' }, { status: 404 });
  }

  const mockCaptureId = tx.paypalCaptureId || `CAP-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  // Update transaction status to CAPTURED
  const updated = await tenantDb.transactions.update({
    where: { id },
    data: {
      status: 'CAPTURED',
      paypalCaptureId: mockCaptureId,
      aiAuditVerdict: 'APPROVED',
      aiAuditReasoning: `Simulated Sandbox Buyer Approval & Settlement executed for order ${tx.paypalOrderId}.`,
    },
  });

  // Log in AuditLog
  const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
  const prevHash = lastAudit[0]?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
  const timestamp = new Date().toISOString();
  const actor = 'PAYPAL_WEBHOOK';
  const action = 'SIMULATED_BUYER_APPROVAL_SETTLEMENT';
  const details = JSON.stringify({
    orderId: tx.paypalOrderId,
    captureId: mockCaptureId,
    amount: tx.amount,
    currency: tx.currency,
  });
  const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

  await tenantDb.auditLogs.create({
    actor,
    action,
    targetId: id,
    paypalEndpoint: '/v2/checkout/orders',
    httpStatus: 200,
    redactedDetails: details,
    previousHash: prevHash,
    recordHash,
  });

  secureLogger.info('Simulated Sandbox Buyer Approval & Settle Executed', { orderId: tx.paypalOrderId });

  return NextResponse.json({
    success: true,
    transaction: updated,
    captureId: mockCaptureId,
    message: 'Simulated Sandbox Buyer Approval & Settlement completed successfully.',
  });
}
