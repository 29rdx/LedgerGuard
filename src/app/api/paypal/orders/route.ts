import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { paypalClient } from '@/lib/paypal-client';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';

const CreateOrderSchema = z.object({
  vendorName: z.string().min(2),
  vendorEmail: z.string().email(),
  category: z.enum(['CLOUD_INFRA', 'CONTRACTOR_ESCROW', 'SAAS_LICENSE', 'LOGISTICS']).default('CONTRACTOR_ESCROW'),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  deliverableSummary: z.string().min(5),
  deliverableProofUrl: z.string().url().optional().nullable(),
  proofFileHash: z.string().optional().nullable(),
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

  if (session.role === 'AUDITOR') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'AUDITOR role cannot initiate PayPal escrow authorizations' },
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

    // 1. Call PayPal Orders v2 (intent: AUTHORIZE)
    const paypalRes = await paypalClient.createOrder({
      amount: data.amount,
      currency: data.currency,
      vendorName: data.vendorName,
      vendorEmail: data.vendorEmail,
      description: `Escrow Hold: ${data.deliverableSummary.slice(0, 100)}`,
      intent: 'AUTHORIZE',
    });

    // 2. Persist in Database
    const transaction = await tenantDb.transactions.create({
      data: {
        paypalOrderId: paypalRes.orderId,
        paypalAuthId: paypalRes.authId,
        vendorName: data.vendorName,
        vendorEmail: data.vendorEmail,
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        status: 'AUTHORIZED_HOLD',
        deliverableSummary: data.deliverableSummary,
        deliverableProofUrl: data.deliverableProofUrl || null,
        proofFileHash: data.proofFileHash || null,
        aiRiskScore: 14,
        aiAuditVerdict: 'PENDING_REVIEW',
        aiAuditReasoning: 'Authorized hold placed. Awaiting final proof artifact delivery.',
        approvalLink: paypalRes.approvalLink,
        rawPaypalResponse: paypalRes.rawResponse,
      },
    });

    // 3. Cryptographic Hash Chain Audit Entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'USER';
    const action = 'PAYPAL_ORDER_AUTHORIZED';
    const details = JSON.stringify({
      orderId: paypalRes.orderId,
      amount: data.amount,
      vendor: data.vendorName,
      category: data.category,
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    await tenantDb.auditLogs.create({
      actor,
      action,
      targetId: transaction.id,
      paypalEndpoint: '/v2/checkout/orders',
      httpStatus: 201,
      redactedDetails: details,
      previousHash: prevHash,
      recordHash,
      timestamp: new Date(timestamp),
    });

    secureLogger.info('PayPal Escrow Order Placed', { orderId: paypalRes.orderId, amount: data.amount });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    secureLogger.error('Create Order Error', error);
    return NextResponse.json({ error: 'Failed to create PayPal escrow order' }, { status: 500 });
  }
}
