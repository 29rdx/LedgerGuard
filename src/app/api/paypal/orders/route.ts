import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { paypalClient } from '@/lib/paypal-client';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';

const CreateOrderSchema = z.object({
  counterpartyName: z.string().min(2),
  counterpartyEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  type: z.enum(['ESCROW_AUTHORIZE', 'INVOICE_SETTLEMENT', 'DIRECT_DISBURSEMENT']).default('ESCROW_AUTHORIZE'),
  escrowConditions: z.string().min(5),
  deliverableProofUrl: z.string().url().optional().nullable(),
  deliverableProofHash: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantDb = getTenantDb(session.organizationId);
  const transactions = await tenantDb.transactions.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ transactions });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RBAC check: AUDITOR cannot create orders
  if (session.role === 'AUDITOR') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Auditor role does not have authorization to create treasury escrows' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', details: parsed.error.format() }, { status: 400 });
    }

    const data = parsed.data;
    const tenantDb = getTenantDb(session.organizationId);

    // 1. Call PayPal Orders v2 with Intent: AUTHORIZE
    const paypalOrder = await paypalClient.createAuthorizeOrder({
      amount: data.amount,
      currency: data.currency,
      description: `Escrow Hold: ${data.escrowConditions.slice(0, 100)}`,
      counterpartyEmail: data.counterpartyEmail,
    });

    // 2. Persist in Multi-Tenant Database
    const transaction = await tenantDb.transactions.create({
      data: {
        counterpartyName: data.counterpartyName,
        counterpartyEmail: data.counterpartyEmail,
        amount: data.amount,
        currency: data.currency,
        type: data.type,
        status: 'AUTHORIZED_HOLD',
        paypalOrderId: paypalOrder.orderId,
        paypalAuthorizationId: paypalOrder.authorizationId,
        escrowConditions: data.escrowConditions,
        deliverableProofUrl: data.deliverableProofUrl,
        deliverableProofHash: data.deliverableProofHash,
        auditScore: 85,
        auditNotes: 'Initial authorized hold placed. Pending milestone proof attestation.',
      },
    });

    // 3. Append to Cryptographic Audit Hash Chain
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const action = 'PAYPAL_ORDER_AUTHORIZED';
    const details = JSON.stringify({
      orderId: paypalOrder.orderId,
      authorizationId: paypalOrder.authorizationId,
      amount: data.amount,
      currency: data.currency,
      counterparty: data.counterpartyName,
    });
    const currentHash = computeBlockHash(prevHash, timestamp, action, details);

    await tenantDb.auditLogs.create({
      userId: session.userId,
      action,
      entityType: 'LedgerTransaction',
      entityId: transaction.id,
      details,
      previousHash: prevHash,
      currentHash,
    });

    secureLogger.info('PayPal Authorize Escrow Created', {
      transactionId: transaction.id,
      paypalOrderId: paypalOrder.orderId,
      amount: data.amount,
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    secureLogger.error('Create Order Error', error);
    return NextResponse.json({ error: 'Failed to create PayPal escrow order' }, { status: 500 });
  }
}
