import crypto from 'crypto';
import { FinancialBlotterRow, DisputeNegotiationResult } from '@/types';

export const DEMO_FAILSAFE_COOKIE = 'ledgerguard_demo_failsafe';
export const DEMO_FAILSAFE_HEADER = 'x-demo-failsafe';
export const DEMO_FAILSAFE_STORAGE_KEY = 'ledgerguard_god_mode_failsafe';

// In-memory runtime override for server or test environments
let globalDemoFailsafeActive = false;

/**
 * Returns whether God Mode demo failsafe is active for the current context.
 * Checks request headers, request cookies, environment variables, or global memory.
 */
export function isDemoFailsafeActive(
  req?: Request | { headers?: Headers | Record<string, string | string[] | undefined> }
): boolean {
  if (globalDemoFailsafeActive) return true;
  if (process.env.DEMO_FAILSAFE_ACTIVE === 'true') return true;

  if (!req) {
    if (typeof window !== 'undefined') {
      try {
        return window.localStorage?.getItem(DEMO_FAILSAFE_STORAGE_KEY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  }

  // Check headers if available
  if ('headers' in req && req.headers) {
    const headers = req.headers;
    if (typeof (headers as Headers).get === 'function') {
      const headerVal = (headers as Headers).get(DEMO_FAILSAFE_HEADER);
      if (headerVal === 'true' || headerVal === '1') return true;

      const cookieVal = (headers as Headers).get('cookie');
      if (cookieVal && cookieVal.includes(`${DEMO_FAILSAFE_COOKIE}=1`)) return true;
    } else {
      const rawHeaders = headers as Record<string, string | string[] | undefined>;
      const headerVal = rawHeaders[DEMO_FAILSAFE_HEADER] || rawHeaders[DEMO_FAILSAFE_HEADER.toLowerCase()];
      if (headerVal === 'true' || headerVal === '1') return true;

      const cookieVal = rawHeaders['cookie'] || rawHeaders['Cookie'];
      if (typeof cookieVal === 'string' && cookieVal.includes(`${DEMO_FAILSAFE_COOKIE}=1`)) return true;
    }
  }

  return false;
}

/**
 * Explicitly sets the server memory demo failsafe status (useful in unit tests or CLI runs)
 */
export function setGlobalDemoFailsafe(active: boolean): void {
  globalDemoFailsafeActive = active;
}

/**
 * Instant Zero-Latency Mock: PayPal Orders v2 Authorize Creation
 */
export function getMockOrderCreation(params: {
  vendorName: string;
  amount: number;
  currency?: string;
  description?: string;
}) {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const orderId = `ORD-FAILSAFE-${hex}`;
  const authId = `AUTH-FAILSAFE-${hex}`;
  const amountStr = params.amount.toFixed(2);
  const currency = params.currency || 'USD';

  return {
    orderId,
    authId,
    status: 'AUTHORIZED_HOLD',
    approvalLink: `/sandbox-checkout?orderId=${orderId}&amount=${amountStr}&currency=${currency}&vendor=${encodeURIComponent(params.vendorName)}`,
    rawResponse: JSON.stringify({
      id: orderId,
      status: 'APPROVED',
      intent: 'AUTHORIZE',
      payer: {
        name: { given_name: 'Apex', surname: 'Treasury' },
        email_address: 'treasury@apexcapital.internal',
      },
      purchase_units: [
        {
          reference_id: `REF-${hex}`,
          description: params.description || `Autonomous escrow hold for ${params.vendorName}`,
          amount: { currency_code: currency, value: amountStr },
          payee: { email_address: `${params.vendorName.toLowerCase().replace(/[^a-z0-9]/g, '')}@vendor.sandbox` },
          payments: {
            authorizations: [
              {
                id: authId,
                status: 'CREATED',
                amount: { currency_code: currency, value: amountStr },
              },
            ],
          },
        },
      ],
    }),
  };
}

/**
 * Instant Zero-Latency Mock: PayPal Payments v2 Capture
 */
export function getMockOrderCapture(params: {
  orderId: string;
  authId?: string | null;
  amount: number;
  currency?: string;
}) {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  const captureId = `CAP-FAILSAFE-${hex}`;
  const amountStr = params.amount.toFixed(2);
  const currency = params.currency || 'USD';

  return {
    captureId,
    status: 'COMPLETED',
    amount: {
      value: amountStr,
      currency_code: currency,
    },
    rawResponse: JSON.stringify({
      id: captureId,
      status: 'COMPLETED',
      amount: { currency_code: currency, value: amountStr },
      final_capture: true,
      seller_protection: { status: 'ELIGIBLE' },
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString(),
      disbursement_mode: 'INSTANT',
    }),
  };
}

/**
 * Instant Zero-Latency Mock: AI Delivery Audit & Risk Verdict
 */
export function getMockDeliveryAudit(params: {
  transactionId: string;
  vendorName: string;
  amount: number;
}) {
  const sha = crypto.createHash('sha256').update(`FAILSAFE_${params.transactionId}_${Date.now()}`).digest('hex');

  return {
    passed: true,
    score: 96,
    riskScore: 7,
    verdict: 'APPROVED' as const,
    reasons: [
      'God Mode Demo Failsafe: Deliverable SHA-256 Merkle chain verified with zero cryptographic drift.',
      'Milestone acceptance criteria fulfilled according to smart contract escrow policy.',
      'Vendor KYC reputation and deliverable telemetry authenticated in nominal bounds.',
    ],
    proofHashVerified: true,
    autoExecutable: params.amount <= 10000,
    aiNotes: `Zero-Latency Autonomous Verification: All contractual obligations for ${params.vendorName} verified. Risk evaluated at 7/100 (Nominal Institutional Grade). SHA-256 Digest: ${sha.slice(0, 16)}...`,
  };
}

/**
 * Instant Zero-Latency Mock: Multi-Agent Dispute Resolution
 */
export function getMockDisputeNegotiation(params: {
  transactionId: string;
  orderId: string;
  vendorName: string;
  originalAmount: number;
}): DisputeNegotiationResult {
  const revisedAmount = Number((params.originalAmount * 0.95).toFixed(2));
  const variance = Number((params.originalAmount - revisedAmount).toFixed(2));
  const revisedHash = crypto
    .createHash('sha256')
    .update(`FAILSAFE_REVISED_${params.transactionId}_${Date.now()}`)
    .digest('hex');
  const captureId = `CAP-FAILSAFE-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  return {
    transactionId: params.transactionId,
    orderId: params.orderId,
    vendorName: params.vendorName,
    initialRiskScore: 88,
    finalRiskScore: 14,
    consensusReached: true,
    settlementAuthorized: true,
    revisedHash,
    dialogue: [
      {
        sender: 'TREASURY_AUDITOR_AGENT',
        senderTitle: 'Autonomous AP Treasury Controller',
        avatar: '🤖',
        timestamp: new Date(Date.now() - 4000).toISOString(),
        message: `Discrepancy detected for ${params.vendorName}: Deliverable milestone hash drift detected. Holding disbursement of $${params.originalAmount.toFixed(2)} pending revised credit memo adjustment.`,
        evidenceType: 'SHA256_DIGEST',
        evidenceValue: `drift_delta_${params.transactionId.slice(0, 8)}`,
      },
      {
        sender: 'VENDOR_SETTLEMENT_AGENT',
        senderTitle: `${params.vendorName} Autonomous Settlement Agent`,
        avatar: '🏢',
        timestamp: new Date(Date.now() - 2000).toISOString(),
        message: `Acknowledged discrepancy. Submitting revised attestation for $${revisedAmount.toFixed(2)} with a $${variance.toFixed(2)} credit memo concession to achieve instant PayPal settlement.`,
        evidenceType: 'CREDIT_MEMO',
        evidenceValue: `CREDIT-${revisedHash.slice(0, 8).toUpperCase()}`,
      },
      {
        sender: 'TREASURY_AUDITOR_AGENT',
        senderTitle: 'Autonomous AP Treasury Controller',
        avatar: '🤖',
        timestamp: new Date().toISOString(),
        message: `Concession accepted. Cryptographic hash verified. Executed conditional PayPal Payments v2 Capture (${captureId}) for $${revisedAmount.toFixed(2)}. Escrow closed.`,
        evidenceType: 'MILESTONE_CERT',
        evidenceValue: revisedHash,
      },
    ],
    settlementTerms: {
      originalAmount: params.originalAmount,
      agreedAmount: revisedAmount,
      varianceExplained: `Vendor autonomous credit concession ($${variance.toFixed(2)}) applied for milestone alignment.`,
      paypalCaptureId: captureId,
    },
  };
}

