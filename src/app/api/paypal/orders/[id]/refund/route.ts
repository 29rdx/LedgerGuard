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
    // Execute refund or void
    const result = await paypalClient.refundOrVoid({
      captureId: transaction.paypalCaptureId,
      authorizationId: transaction.paypalAuthorizationId,
      amount: transaction.amount,
      currency: transaction.currency,
    });

    const updated = await tenantDb.transactions.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        auditNotes: `Void/Refund executed on PayPal network (${result.refundId}). Funds returned to treasury.`,
      },
    });

    // Hash-chained audit entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const action = 'PAYPAL_ORDER_REFUNDED';
    const details = JSON.stringify({
      transactionId: id,
      refundId: result.refundId,
      amount: transaction.amount,
      currency: transaction.currency,
      executedBy: session.email,
    });
    const currentHash = computeBlockHash(prevHash, timestamp, action, details);

    await tenantDb.auditLogs.create({
      userId: session.userId,
      action,
      entityType: 'LedgerTransaction',
      entityId: id,
      details,
      previousHash: prevHash,
      currentHash,
    });

    secureLogger.info('PayPal Order Refunded/Voided', { transactionId: id, refundId: result.refundId });

    return NextResponse.json({ success: true, transaction: updated, refundId: result.refundId });
  } catch (error) {
    secureLogger.error('Refund Error', error);
    return NextResponse.json({ error: 'Failed to process refund or void' }, { status: 500 });
  }
}
