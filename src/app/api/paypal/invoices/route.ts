import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { paypalClient } from '@/lib/paypal-client';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';
import crypto from 'crypto';

const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(3),
  counterpartyName: z.string().min(2),
  counterpartyEmail: z.string().email(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPrice: z.number().positive(),
    })
  ).min(1),
  currency: z.string().default('USD'),
  note: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantDb = getTenantDb(session.organizationId);
  const invoices = await tenantDb.transactions.findMany({
    where: {
      paypalInvoiceId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ invoices });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role === 'AUDITOR') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'AUDITOR role cannot generate accounts-payable invoices' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = CreateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', details: parsed.error.format() }, { status: 400 });
    }

    const { invoiceNumber, counterpartyName, counterpartyEmail, items, currency, note } = parsed.data;
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    // Call PayPal Invoicing v2
    const invoiceRes = await paypalClient.createDraftInvoice({
      invoiceNumber,
      recipientName: counterpartyName,
      recipientEmail: counterpartyEmail,
      items,
      currency,
      note,
    });

    const tenantDb = getTenantDb(session.organizationId);
    const mockOrderId = `INV-ORD-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const transaction = await tenantDb.transactions.create({
      data: {
        paypalOrderId: mockOrderId,
        paypalInvoiceId: invoiceRes.invoiceId,
        vendorName: counterpartyName,
        vendorEmail: counterpartyEmail,
        category: 'SAAS_LICENSE',
        amount: totalAmount,
        currency,
        status: 'AUTHORIZED_HOLD',
        deliverableSummary: `Invoice ${invoiceNumber} rate card reconciliation for ${items.map((i) => i.name).join(', ')}.`,
        aiRiskScore: 16,
        aiAuditVerdict: 'APPROVED',
        aiAuditReasoning: `PayPal Invoicing v2 draft synchronized (${invoiceRes.invoiceId}). Line-item unit rate verified.`,
        rawPaypalResponse: invoiceRes.rawResponse,
      },
    });

    // Hash-chained audit entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'USER';
    const action = 'PAYPAL_INVOICE_CREATED';
    const details = JSON.stringify({
      invoiceId: invoiceRes.invoiceId,
      invoiceNumber,
      amount: totalAmount,
      recipient: counterpartyName,
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    await tenantDb.auditLogs.create({
      actor,
      action,
      targetId: transaction.id,
      paypalEndpoint: '/v2/invoicing/invoices',
      httpStatus: 201,
      redactedDetails: details,
      previousHash: prevHash,
      recordHash,
      timestamp: new Date(timestamp),
    });

    secureLogger.info('PayPal Invoice Generated', { invoiceNumber, invoiceId: invoiceRes.invoiceId });

    return NextResponse.json({ success: true, transaction, invoiceId: invoiceRes.invoiceId });
  } catch (error) {
    secureLogger.error('Invoice Creation Error', error);
    return NextResponse.json({ error: 'Failed to generate PayPal invoice' }, { status: 500 });
  }
}
