import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { agentEngine } from '@/lib/agent-engine';
import { paypalClient } from '@/lib/paypal-client';
import { secureLogger } from '@/lib/secure-logger';
import { appendCryptographicAuditLog } from '@/lib/agent/tools';
import { isDemoFailsafeActive, getMockOrderCapture } from '@/lib/demo-failsafe';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function handleAuditCron(request: Request) {
  const timestamp = new Date().toISOString();

  // 1. Authenticate Cron Trigger (CRON_SECRET verification)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'ledgerguard_cron_secret_sandbox_key_2026';
  const url = new URL(request.url);
  const secretQuery = url.searchParams.get('secret');

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    secretQuery === cronSecret ||
    process.env.NODE_ENV !== 'production';

  if (!isAuthorized) {
    secureLogger.warn('Unauthorized attempt to trigger audit-cron automation', {
      authHeaderProvided: Boolean(authHeader),
    });
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid CRON_SECRET Bearer token required.' },
      { status: 401 }
    );
  }

  try {
    secureLogger.info('[Autonomous Cron] Initiating automated escrow delivery audit scan', { timestamp });

    // 2. Query all active AUTHORIZED_HOLD escrows possessing deliverable proof
    const pendingTransactions = await prisma.ledgerTransaction.findMany({
      where: {
        status: 'AUTHORIZED_HOLD',
        deliverableProofUrl: { not: null },
      },
      include: {
        organization: {
          include: {
            policies: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
      },
      take: 50,
    });

    const results = [];
    let capturedCount = 0;
    let flaggedCount = 0;
    let skippedCount = 0;

    for (const txn of pendingTransactions) {
      const policy = txn.organization.policies[0] || {
        maxAutoCaptureAmount: 2500.0,
        mfaStepUpThreshold: 1000.0,
        requireProofOfDelivery: true,
        maxAllowedRiskScore: 35,
      };

      // 3. Autonomous AI Delivery Audit & SSRF-Hardened Proof Verification
      const auditResult = await agentEngine.auditDelivery({
        transactionId: txn.id,
        proofUrl: txn.deliverableProofUrl,
        proofHash: txn.proofFileHash,
        deliverableSummary: txn.deliverableSummary,
        amount: txn.amount,
        maxAutoCaptureAmount: policy.maxAutoCaptureAmount,
        maxAllowedRiskScore: policy.maxAllowedRiskScore,
      });

      const passesCriteria =
        auditResult.passed &&
        auditResult.riskScore <= policy.maxAllowedRiskScore &&
        txn.amount <= policy.maxAutoCaptureAmount;

      if (passesCriteria) {
        // 4. Autonomous PayPal Orders v2 Settlement Capture
        const authOrOrderId = txn.paypalAuthId || txn.paypalOrderId;
        let captureData;

        if (isDemoFailsafeActive()) {
          captureData = getMockOrderCapture({
            orderId: authOrOrderId,
            amount: txn.amount,
          });
        } else {
          captureData = await paypalClient.captureOrder(
            txn.paypalOrderId,
            txn.paypalAuthId,
            txn.amount,
            txn.currency
          );
        }

        // 5. Update Database Record
        await prisma.ledgerTransaction.update({
          where: { id: txn.id },
          data: {
            status: 'CAPTURED',
            paypalCaptureId: captureData.captureId,
            aiRiskScore: auditResult.riskScore,
            aiAuditVerdict: 'APPROVED',
            aiAuditReasoning: auditResult.reasons.join('; '),
            rawPaypalResponse: JSON.stringify(captureData),
          },
        });

        // 6. Cryptographic Audit Chain Commit
        const auditLog = await appendCryptographicAuditLog({
          organizationId: txn.organizationId,
          actor: 'AI_AGENT',
          action: 'AUTONOMOUS_CRON_CAPTURE_EXECUTED',
          targetId: txn.id,
          paypalEndpoint: `/v2/payments/authorizations/${authOrOrderId}/capture`,
          httpStatus: 200,
          details: {
            paypalOrderId: txn.paypalOrderId,
            paypalCaptureId: captureData.captureId,
            amount: txn.amount,
            aiRiskScore: auditResult.riskScore,
            verdict: 'APPROVED',
            proofHashVerified: auditResult.proofHashVerified,
          },
        });

        capturedCount++;
        results.push({
          transactionId: txn.id,
          paypalOrderId: txn.paypalOrderId,
          vendorName: txn.vendorName,
          amount: txn.amount,
          action: 'CAPTURED',
          riskScore: auditResult.riskScore,
          captureId: captureData.captureId,
          auditHash: auditLog?.recordHash,
        });
      } else {
        // Flag or Hold for Manual Human Review
        const newStatus = auditResult.riskScore > 50 ? 'FLAGGED_DISPUTE' : 'AUTHORIZED_HOLD';
        const verdict = auditResult.riskScore > 50 ? 'FLAGGED' : 'PENDING_REVIEW';

        await prisma.ledgerTransaction.update({
          where: { id: txn.id },
          data: {
            status: newStatus,
            aiRiskScore: auditResult.riskScore,
            aiAuditVerdict: verdict,
            aiAuditReasoning: auditResult.reasons.join('; '),
          },
        });

        const auditLog = await appendCryptographicAuditLog({
          organizationId: txn.organizationId,
          actor: 'AI_AGENT',
          action: 'AUTONOMOUS_CRON_AUDIT_EVALUATED',
          targetId: txn.id,
          httpStatus: 200,
          details: {
            paypalOrderId: txn.paypalOrderId,
            amount: txn.amount,
            aiRiskScore: auditResult.riskScore,
            verdict,
            reasons: auditResult.reasons,
          },
        });

        if (newStatus === 'FLAGGED_DISPUTE') {
          flaggedCount++;
        } else {
          skippedCount++;
        }

        results.push({
          transactionId: txn.id,
          paypalOrderId: txn.paypalOrderId,
          vendorName: txn.vendorName,
          amount: txn.amount,
          action: newStatus,
          riskScore: auditResult.riskScore,
          reasons: auditResult.reasons,
          auditHash: auditLog?.recordHash,
        });
      }
    }

    secureLogger.info('[Autonomous Cron] Audit scan finished', {
      totalScanned: pendingTransactions.length,
      capturedCount,
      flaggedCount,
      skippedCount,
    });

    return NextResponse.json({
      success: true,
      timestamp,
      totalScanned: pendingTransactions.length,
      capturedCount,
      flaggedCount,
      skippedCount,
      results,
    });
  } catch (error) {
    secureLogger.error('[Autonomous Cron] Execution failed', { error: String(error) });
    return NextResponse.json(
      {
        success: false,
        error: 'CRON_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown cron error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return handleAuditCron(request);
}

export async function POST(request: Request) {
  return handleAuditCron(request);
}
