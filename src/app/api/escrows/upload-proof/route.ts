import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { validateFileBuffer } from '@/lib/file-validator';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role === 'AUDITOR') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'AUDITOR role cannot upload evidence or mutate escrow records' },
      { status: 403 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const transactionId = formData.get('transactionId') as string | null;

    if (!file || !transactionId) {
      return NextResponse.json({ error: 'Missing required parameters: file and transactionId are required' }, { status: 400 });
    }

    const tenantDb = getTenantDb(session.organizationId);

    // IDOR / BOLA Prevention
    const transaction = await tenantDb.transactions.findUnique(transactionId);
    if (!transaction) {
      return NextResponse.json({ error: 'NotFound', message: 'Target escrow transaction not found or access denied.' }, { status: 404 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Magic-byte & MIME & 2MB size enforcement
    const validation = validateFileBuffer(buffer, file.name);
    if (!validation.valid) {
      secureLogger.security('INVALID_FILE_UPLOAD_BLOCKED', {
        filename: file.name,
        size: file.size,
        reason: validation.error,
      });
      return NextResponse.json({ error: 'FileValidationError', message: validation.error }, { status: 400 });
    }

    const simulatedProofUrl = `https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/${validation.sanitizedFilename}`;

    // Update Transaction with Verified Cryptographic Hash
    const updated = await tenantDb.transactions.update({
      where: { id: transactionId },
      data: {
        proofFileHash: validation.sha256,
        deliverableProofUrl: simulatedProofUrl,
        aiAuditVerdict: 'APPROVED',
        aiAuditReasoning: `Proof-of-delivery file verified. SHA-256: ${validation.sha256}. Magic-byte type: ${validation.detectedType}.`,
      },
    });

    // Hash-chained audit entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'USER';
    const action = 'PROOF_OF_DELIVERY_UPLOADED';
    const details = JSON.stringify({
      transactionId,
      originalFilename: file.name,
      sanitizedFilename: validation.sanitizedFilename,
      sha256: validation.sha256,
      detectedType: validation.detectedType,
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    await tenantDb.auditLogs.create({
      actor,
      action,
      targetId: transactionId,
      paypalEndpoint: null,
      httpStatus: 200,
      redactedDetails: details,
      previousHash: prevHash,
      recordHash,
      timestamp: new Date(timestamp),
    });

    return NextResponse.json({
      success: true,
      sha256: validation.sha256,
      detectedType: validation.detectedType,
      transaction: updated,
    });
  } catch (error) {
    secureLogger.error('Upload proof error', error);
    return NextResponse.json({ error: 'Internal server error processing proof upload' }, { status: 500 });
  }
}
