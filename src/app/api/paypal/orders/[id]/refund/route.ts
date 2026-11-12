import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { paypalClient } from '@/lib/paypal-client';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'TREASURY_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'RBAC Enforcement: AUDITOR role does not possess refund/void privileges.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.organizationId);

  const transaction = await tenantDb.transactions.findUnique(id);
  if (!transaction) {
    return NextResponse.json({ error: 'NotFound', message: 'Transaction not found or access denied.' }, { status: 404 });
  }

  try {
    const refundRes = await paypalClient.refundCapture(
      transaction.paypalCaptureId || `CAP-${transaction.paypalOrderId}`,
      transaction.amount,
      transaction.currency,
      'Treasury policy void/refund'
    );

    const updated = await tenantDb.transactions.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        aiAuditVerdict: 'FLAGGED',
        aiAuditReasoning: `Void/Refund executed (${refundRes.refundId}). Funds released back to treasury.`,
        rawPaypalResponse: refundRes.rawResponse,
      },
    });

    // Hash-chained audit entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'USER';
    const action = 'PAYPAL_ORDER_REFUNDED';
    const details = JSON.stringify({
      transactionId: id,
      refundId: refundRes.refundId,
      amount: transaction.amount,
      executedBy: session.email,
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    await tenantDb.auditLogs.create({
      actor,
      action,
      targetId: id,
      paypalEndpoint: `/v2/payments/captures/${transaction.paypalCaptureId || 'cap'}/refund`,
      httpStatus: 201,
      redactedDetails: details,
      previousHash: prevHash,
      recordHash,
      timestamp: new Date(timestamp),
    });

    secureLogger.info('PayPal Order Refunded', { transactionId: id, refundId: refundRes.refundId });

    return NextResponse.json({ success: true, transaction: updated, refundId: refundRes.refundId });
  } catch (error) {
    secureLogger.error('Refund Error', error);
    return NextResponse.json({ error: 'Failed to process refund or void' }, { status: 500 });
  }
}
