import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getTenantDb, prisma } from '@/lib/db';
import { paypalClient } from '@/lib/paypal-client';
import { verifyTotp } from '@/lib/mfa';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';

const CaptureSchema = z.object({
  mfaToken: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Server-Side RBAC Enforcement
  if (session.role !== 'TREASURY_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'RBAC Enforcement: AUDITOR role does not possess disbursement privileges.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.organizationId);

  // IDOR / BOLA Prevention
  const transaction = await tenantDb.transactions.findUnique(id);
  if (!transaction) {
    return NextResponse.json({ error: 'NotFound', message: 'Transaction not found or access denied.' }, { status: 404 });
  }

  if (transaction.status === 'CAPTURED') {
    return NextResponse.json({ error: 'Conflict', message: 'Transaction has already been captured and settled.' }, { status: 409 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = CaptureSchema.safeParse(body);
    const mfaToken = parsed.success ? parsed.data.mfaToken : undefined;

    // Step-Up MFA Policy Enforcement (mfaStepUpThreshold from policy, default $1,000)
    const policy = await tenantDb.policy.findFirst();
    const mfaThreshold = policy?.mfaStepUpThreshold ?? 1000.0;

    if (transaction.amount >= mfaThreshold) {
      if (!mfaToken) {
        return NextResponse.json(
          {
            error: 'MFA_REQUIRED',
            message: `Step-Up MFA required: Hold amount ($${transaction.amount.toLocaleString()}) exceeds policy threshold ($${mfaThreshold.toLocaleString()}).`,
            threshold: mfaThreshold,
          },
          { status: 403 }
        );
      }

      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { mfaSecret: true },
      });

      const isValidMfa = user && verifyTotp(mfaToken, user.mfaSecret);
      if (!isValidMfa) {
        secureLogger.security('MFA_VERIFICATION_FAILED', {
          userId: session.userId,
          transactionId: id,
          amount: transaction.amount,
        });
        return NextResponse.json(
          { error: 'INVALID_MFA_TOKEN', message: 'The 6-digit confirmation code is invalid or has expired.' },
          { status: 401 }
        );
      }
    }

    // Call PayPal Orders v2 Capture
    const captureResult = await paypalClient.captureOrder(
      transaction.paypalOrderId,
      transaction.paypalAuthId,
      transaction.amount,
      transaction.currency
    );

    // Update in Database
    const updated = await tenantDb.transactions.update({
      where: { id },
      data: {
        status: 'CAPTURED',
        paypalCaptureId: captureResult.captureId,
        aiAuditVerdict: 'APPROVED',
        aiAuditReasoning: `Captured via PayPal Orders v2 rail (${captureResult.captureId}) by ${session.name}.`,
        rawPaypalResponse: captureResult.rawResponse,
      },
    });

    // Hash-Chained Audit Trail Entry
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'USER';
    const action = 'PAYPAL_ORDER_CAPTURED';
    const details = JSON.stringify({
      transactionId: id,
      paypalOrderId: transaction.paypalOrderId,
      captureId: captureResult.captureId,
      amount: transaction.amount,
      mfaVerified: transaction.amount >= mfaThreshold,
      executedBy: session.email,
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    await tenantDb.auditLogs.create({
      actor,
      action,
      targetId: id,
      paypalEndpoint: transaction.paypalAuthId ? `/v2/payments/authorizations/${transaction.paypalAuthId}/capture` : `/v2/checkout/orders/${transaction.paypalOrderId}/capture`,
      httpStatus: 201,
      redactedDetails: details,
      previousHash: prevHash,
      recordHash,
      timestamp: new Date(timestamp),
    });

    return NextResponse.json({
      success: true,
      transaction: updated,
      captureId: captureResult.captureId,
    });
  } catch (error) {
    secureLogger.error('Capture Error', error);
    return NextResponse.json({ error: 'Failed to capture PayPal hold' }, { status: 500 });
  }
}
