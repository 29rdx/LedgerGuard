import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma, getTenantDb } from '@/lib/db';
import { secureLogger } from '@/lib/secure-logger';
import { decryptTransactionRecord } from '@/lib/encryption';

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('lg_session')?.value;
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
  }

  try {
    const tenantDb = getTenantDb(session.organizationId);

    // Fetch latest 100 audit logs and transactions
    const [auditLogs, transactions, org] = await Promise.all([
      tenantDb.auditLogs.findMany({
        take: 100,
        orderBy: { timestamp: 'desc' },
      }),
      tenantDb.transactions.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organization.findUnique({
        where: { id: session.organizationId },
      }),
    ]);

    const csvRows: string[] = [];

    // Compliance Header Banner
    csvRows.push('# ==============================================================================');
    csvRows.push(`# LEDGERGUARD INSTITUTIONAL SOC2 / SOX COMPLIANCE AUDIT EXPORT`);
    csvRows.push(`# Organization: ${org?.name || session.organizationName} (${session.organizationId})`);
    csvRows.push(`# Generated At: ${new Date().toISOString()}`);
    csvRows.push(`# Auditor Identity: ${session.email} (${session.role})`);
    csvRows.push(`# Cryptographic Standard: SHA-256 Merkle Chaining · AES-256-GCM Hardware ALE`);
    csvRows.push('# ==============================================================================');
    csvRows.push('');

    // Table 1: Cryptographic Audit Trail (Non-Repudiation Block Chain)
    csvRows.push('--- SECTION 1: CRYPTOGRAPHIC AUDIT LOGS (SHA-256 CHAIN) ---');
    csvRows.push([
      'Block_Index',
      'Log_UUID',
      'Timestamp_ISO',
      'Actor',
      'Action',
      'Target_Resource_ID',
      'HTTP_Status',
      'Previous_Block_Hash_SHA256',
      'Block_Record_Hash_SHA256',
      'Redacted_Audit_Details',
    ].join(','));

    auditLogs.forEach((log, index) => {
      csvRows.push([
        escapeCsv(auditLogs.length - index),
        escapeCsv(log.id),
        escapeCsv(log.timestamp.toISOString()),
        escapeCsv(log.actor),
        escapeCsv(log.action),
        escapeCsv(log.targetId),
        escapeCsv(log.httpStatus || 200),
        escapeCsv(log.previousHash),
        escapeCsv(log.recordHash),
        escapeCsv(log.redactedDetails),
      ].join(','));
    });

    csvRows.push('');
    csvRows.push('--- SECTION 2: SETTLED & HELD ESCROW TRANSACTIONS (ORDERS V2) ---');
    csvRows.push([
      'Transaction_UUID',
      'PayPal_Order_ID',
      'PayPal_Capture_ID',
      'PayPal_Invoice_ID',
      'Vendor_Name',
      'Vendor_Email_Decrypted',
      'Category',
      'Hold_Amount',
      'Currency',
      'Settlement_Status',
      'Deliverable_Proof_Hash_SHA256',
      'AI_Risk_Score',
      'AI_Audit_Verdict',
      'Created_At',
      'Updated_At',
    ].join(','));

    transactions.forEach((tx) => {
      const dec = decryptTransactionRecord(tx);
      csvRows.push([
        escapeCsv(dec.id),
        escapeCsv(dec.paypalOrderId),
        escapeCsv(dec.paypalCaptureId || 'PENDING_CAPTURE'),
        escapeCsv(dec.paypalInvoiceId || 'N/A'),
        escapeCsv(dec.vendorName),
        escapeCsv(dec.vendorEmail),
        escapeCsv(dec.category),
        escapeCsv(dec.amount.toFixed(2)),
        escapeCsv(dec.currency),
        escapeCsv(dec.status),
        escapeCsv(dec.proofFileHash || 'AWAITING_PROOF'),
        escapeCsv(dec.aiRiskScore),
        escapeCsv(dec.aiAuditVerdict || 'PENDING'),
        escapeCsv(dec.createdAt.toISOString()),
        escapeCsv(dec.updatedAt.toISOString()),
      ].join(','));
    });

    const csvContent = csvRows.join('\r\n');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `LedgerGuard_SOC2_Compliance_Audit_${timestamp}.csv`;

    secureLogger.security('SOC2_COMPLIANCE_REPORT_EXPORTED', {
      organizationId: session.organizationId,
      auditor: session.email,
      auditLogsCount: auditLogs.length,
      transactionsCount: transactions.length,
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    secureLogger.error('Failed to generate SOC2 compliance export', error);
    return NextResponse.json({ error: 'Failed to generate audit export' }, { status: 500 });
  }
}
