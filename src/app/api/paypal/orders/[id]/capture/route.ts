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

  // 1. Server-Side RBAC Enforcement
  if (session.role !== 'TREASURY_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'RBAC Enforcement: AUDITOR role does not possess disbursement privileges.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const tenantDb = getTenantDb(session.organizationId);

  // 2. IDOR / BOLA Prevention: Verify organization ownership
  const transaction = await tenantDb.transactions.findUnique(id);
  if (!transaction) {
    return NextResponse.json(
      { error: 'NotFound', message: 'Transaction not found or access denied.' },
      { status: 404 }
    );
  }

  if (transaction.status === 'CAPTURED') {
    return NextResponse.json(
      { error: 'Conflict', message: 'Transaction has already been captured and settled.' },
      { status: 409 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = CaptureSchema.safeParse(body);
    const mfaToken = parsed.success ? parsed.data.mfaToken : undefined;

    // 3. Step-Up MFA Policy Enforcement for High-Value Captures
    const policy = await tenantDb.policy.findFirst();
    const mfaThreshold = policy?.requireMfaAbove ?? 10000.0;

    if (transaction.amount >= mfaThreshold) {
      if (!mfaToken) {
        return NextResponse.json(
          {
            error: 'MFA_REQUIRED',
            message: `Step-up MFA verification required: Transaction amount ($${transaction.amount.toLocaleString()}) exceeds the institutional policy threshold of $${mfaThreshold.toLocaleString()}.`,
            threshold: mfaThreshold,
          },
          { status: 403 }
        );
      }

      // Fetch user's MFA secret
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
          { error: 'INVALID_MFA_TOKEN', message: 'The 6-digit Step-Up confirmation code is invalid or has expired.' },
          { status: 401 }
        );
      }

      secureLogger.security('MFA_VERIFICATION_PASSED', {
        userId: session.userId,
        transactionId: id,
        amount: transaction.amount,
      });
    }

    // 4. Execute PayPal Orders v2 / Authorization Capture
    const captureResult = await paypalClient.captureOrderOrAuthorization({
      orderId: transaction.paypalOrderId,
      authorizationId: transaction.paypalAuthorizationId,
      amount: transaction.amount,
      currency: transaction.currency,
    });

    // 5. Update Transaction State in Database
    const updated = await tenantDb.transactions.update({
      where: { id },
      data: {
        status: 'CAPTURED',
        paypalCaptureId: captureResult.captureId,
        capturedAt: new Date(),
        auditNotes: `Released and captured via PayPal Orders v2 rail (${captureResult.captureId}). Verified by ${session.name}.`,
      },
    });

    // 6. Append to SHA-256 Hash-Chained Audit Trail
    const lastAudit = await tenantDb.auditLogs.findMany({ take: 1 });
    const prevHash = lastAudit[0]?.currentHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const action = 'PAYPAL_ORDER_CAPTURED';
    const details = JSON.stringify({
      transactionId: id,
      paypalOrderId: transaction.paypalOrderId,
      captureId: captureResult.captureId,
      amount: transaction.amount,
      currency: transaction.currency,
      mfaVerified: transaction.amount >= mfaThreshold,
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

    return NextResponse.json({
      success: true,
      transaction: updated,
      captureId: captureResult.captureId,
      message: 'Escrow release successfully executed on PayPal network.',
    });
  } catch (error) {
    secureLogger.error('Capture Escrow Error', error);
    return NextResponse.json({ error: 'Failed to capture PayPal escrow hold' }, { status: 500 });
  }
}
