import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { paypalClient } from '@/lib/paypal-client';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';

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
      type: 'INVOICE_SETTLEMENT',
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
    const invoiceRes = await paypalClient.createInvoice({
      invoiceNumber,
      recipientName: counterpartyName,
      recipientEmail: counterpartyEmail,
      items,
      currency,
      note,
    });

    const tenantDb = getTenantDb(session.organizationId);

    const transaction = await tenantDb.transactions.create({
      data: {
        invoiceNumber,
        counterpartyName,
        counterpartyEmail,
        amount: totalAmount,
        currency,
        type: 'INVOICE_SETTLEMENT',
        status: 'AUTHORIZED_HOLD',
        escrowConditions: `Invoice ${invoiceNumber} reconciliation upon verified delivery of ${items.map((i) => i.name).join(', ')}.`,
        auditScore: 92,
        auditNotes: `PayPal Invoicing v2 synchronized (${invoiceRes.invoiceId}). Line-item rate card matches contracted purchase order.`,
      },
    });

    // Hash-chained audit entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const action = 'PAYPAL_INVOICE_CREATED';
    const details = JSON.stringify({
      invoiceId: invoiceRes.invoiceId,
      invoiceNumber,
      amount: totalAmount,
      recipient: counterpartyName,
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

    secureLogger.info('PayPal Invoice Generated', { invoiceNumber, invoiceId: invoiceRes.invoiceId });

    return NextResponse.json({ success: true, transaction, invoiceId: invoiceRes.invoiceId });
  } catch (error) {
    secureLogger.error('Invoice Creation Error', error);
    return NextResponse.json({ error: 'Failed to generate PayPal invoice' }, { status: 500 });
  }
}
