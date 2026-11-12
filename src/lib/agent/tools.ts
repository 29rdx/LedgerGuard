import { tool } from 'ai';
import { prisma, getTenantDb } from '@/lib/db';
import { paypalClient } from '@/lib/paypal-client';
import { agentEngine } from '@/lib/agent-engine';
import { secureLogger } from '@/lib/secure-logger';
import { computeBlockHash, GENESIS_HASH } from '@/lib/crypto-audit';
import { isDemoFailsafeActive, getMockOrderCreation, getMockOrderCapture } from '@/lib/demo-failsafe';
import {
  createPaypalEscrowSchema,
  paypalCaptureSchema,
  filterLedgerSchema,
  generateInvoiceSchema,
  auditDeliverableSchema,
  CreatePaypalEscrowInput,
  PaypalCaptureInput,
  FilterLedgerInput,
  GenerateInvoiceInput,
  AuditDeliverableInput,
} from './prompt';

/**
 * Appends a verified SHA-256 block to the cryptographic audit trail
 */
export async function appendCryptographicAuditLog(params: {
  organizationId: string;
  actor: 'AI_AGENT' | 'USER' | 'PAYPAL_WEBHOOK' | 'SECURITY_GUARD';
  action: string;
  targetId: string;
  paypalEndpoint?: string;
  httpStatus?: number;
  details: Record<string, unknown> | string;
}) {
  try {
    const latestLog = await prisma.auditLog.findFirst({
      where: { organizationId: params.organizationId },
      orderBy: { timestamp: 'desc' },
      select: { recordHash: true },
    });

    const previousHash = latestLog?.recordHash || GENESIS_HASH;
    const timestampIso = new Date().toISOString();
    const serializedDetails =
      typeof params.details === 'string' ? params.details : JSON.stringify(params.details);

    const recordHash = computeBlockHash(
      previousHash,
      timestampIso,
      params.actor,
      params.action,
      serializedDetails
    );

    return await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        timestamp: new Date(timestampIso),
        actor: params.actor,
        action: params.action,
        targetId: params.targetId,
        paypalEndpoint: params.paypalEndpoint || null,
        httpStatus: params.httpStatus || 200,
        redactedDetails: serializedDetails,
        previousHash,
        recordHash,
      },
    });
  } catch (err) {
    secureLogger.error('Failed to append cryptographic audit log', { error: String(err) });
    return null;
  }
}

/**
 * Execution: Create PayPal Escrow Order
 */
export async function executeCreatePaypalEscrow(
  input: CreatePaypalEscrowInput,
  organizationId: string
) {
  secureLogger.info('[Agent Tool] Executing create_paypal_escrow', { input, organizationId });

  // 1. Enforce $10,000 Autonomous Ceiling
  if (input.amount > 10000) {
    return {
      success: false,
      error: 'POLICY_CEILING_EXCEEDED',
      message: `Disbursement amount ($${input.amount.toFixed(2)}) exceeds the autonomous $10,000.00 ceiling. Requires corporate board governance review.`,
    };
  }

  // 2. Call PayPal Sandbox Orders v2 (with Demo Failsafe support)
  let orderResponse;
  if (isDemoFailsafeActive()) {
    orderResponse = getMockOrderCreation({
      vendorName: input.vendorName,
      amount: input.amount,
      currency: input.currency,
    });
  } else {
    orderResponse = await paypalClient.createOrder({
      amount: input.amount,
      currency: input.currency,
      vendorName: input.vendorName,
      vendorEmail: input.vendorEmail,
      intent: 'AUTHORIZE',
      description: `LedgerGuard Escrow Hold: ${input.vendorName} (${input.deliverableSummary})`,
    });
  }

  const approvalLink =
    paypalClient.hasLiveCredentials() &&
    orderResponse.approvalLink &&
    !orderResponse.approvalLink.includes('token=ORD-')
      ? orderResponse.approvalLink
      : `/sandbox-checkout?orderId=${orderResponse.orderId}&amount=${input.amount.toFixed(2)}&currency=${input.currency}&vendor=${encodeURIComponent(input.vendorName)}`;

  // 3. Persist encrypted record in database
  const tenantDb = getTenantDb(organizationId);
  const transaction = await tenantDb.transactions.create({
    data: {
      paypalOrderId: orderResponse.orderId,
      paypalAuthId: orderResponse.authId || orderResponse.orderId,
      vendorName: input.vendorName,
      vendorEmail: input.vendorEmail,
      category: input.category,
      amount: input.amount,
      currency: input.currency,
      status: 'AUTHORIZED_HOLD',
      deliverableSummary: input.deliverableSummary,
      aiRiskScore: 14,
      aiAuditVerdict: 'PENDING_REVIEW',
      approvalLink,
      rawPaypalResponse: JSON.stringify(orderResponse),
    },
  });

  // 4. Commit SHA-256 block to audit trail
  const auditEntry = await appendCryptographicAuditLog({
    organizationId,
    actor: 'AI_AGENT',
    action: 'PAYPAL_ORDER_AUTHORIZED',
    targetId: transaction.id,
    paypalEndpoint: '/v2/checkout/orders',
    httpStatus: 201,
    details: {
      paypalOrderId: orderResponse.orderId,
      vendorName: input.vendorName,
      amount: input.amount,
      currency: input.currency,
      status: 'AUTHORIZED_HOLD',
    },
  });

  return {
    success: true,
    transactionId: transaction.id,
    paypalOrderId: orderResponse.orderId,
    vendorName: input.vendorName,
    amount: input.amount,
    currency: input.currency,
    status: 'AUTHORIZED_HOLD',
    approvalLink,
    auditRecordHash: auditEntry?.recordHash || '00000000000000000000000000000000',
    message: `PayPal Orders v2 Escrow Authorized: $${input.amount.toFixed(2)} USD held in custody for ${input.vendorName}. Order ID: ${orderResponse.orderId}`,
  };
}

/**
 * Execution: Capture PayPal Authorization
 */
export async function executePaypalCapture(
  input: PaypalCaptureInput,
  organizationId: string
) {
  secureLogger.info('[Agent Tool] Executing paypal_capture', { input, organizationId });

  // 1. Mandatory Institutional Risk Guardrail: If riskScore > 40, require admin confirmation
  if (input.riskScore > 40 && !input.confirmedByAdmin) {
    secureLogger.warn('[Agent Guardrail Triggered] Capture halted: Elevated risk score without admin confirmation', {
      riskScore: input.riskScore,
      transactionId: input.transactionId,
    });
    return {
      success: false,
      requiresConfirmation: true,
      riskScore: input.riskScore,
      transactionId: input.transactionId,
      amount: input.amount,
      error: 'RISK_CONFIRMATION_REQUIRED',
      message: `Risk score is ${input.riskScore}/100 (>40 policy ceiling). Autonomous settlement suspended by LedgerGuard Institutional Safety Guardrail. Explicit admin confirmation required before capturing funds.`,
    };
  }

  // 2. Resolve transaction by internal ID or PayPal Order ID
  const tenantDb = getTenantDb(organizationId);
  let txn = await tenantDb.transactions.findUnique(input.transactionId);
  if (!txn) {
    txn = await tenantDb.transactions.findFirst({
      where: { paypalOrderId: input.transactionId },
    });
  }

  if (!txn) {
    return {
      success: false,
      error: 'TRANSACTION_NOT_FOUND',
      message: `Transaction with ID '${input.transactionId}' not found for this organization.`,
    };
  }

  if (txn.status === 'CAPTURED') {
    return {
      success: false,
      error: 'ALREADY_CAPTURED',
      message: `Transaction ${txn.paypalOrderId} has already been settled and captured.`,
    };
  }

  // 3. Execute PayPal Capture API
  const authOrOrderId = txn.paypalAuthId || txn.paypalOrderId;
  let captureResponse;
  if (isDemoFailsafeActive()) {
    captureResponse = getMockOrderCapture({
      orderId: authOrOrderId,
      amount: input.amount || txn.amount,
    });
  } else {
    captureResponse = await paypalClient.captureOrder(
      txn.paypalOrderId,
      txn.paypalAuthId,
      input.amount || txn.amount,
      txn.currency
    );
  }

  // 4. Update status in database
  const updatedTxn = await tenantDb.transactions.update({
    where: { id: txn.id },
    data: {
      status: 'CAPTURED',
      paypalCaptureId: captureResponse.captureId,
      aiRiskScore: input.riskScore ?? txn.aiRiskScore,
      aiAuditVerdict: 'APPROVED',
      rawPaypalResponse: JSON.stringify(captureResponse),
    },
  });

  // 5. Commit to cryptographic audit chain
  const auditEntry = await appendCryptographicAuditLog({
    organizationId,
    actor: 'AI_AGENT',
    action: 'PAYPAL_ESCROW_CAPTURED',
    targetId: updatedTxn.id,
    paypalEndpoint: `/v2/payments/authorizations/${authOrOrderId}/capture`,
    httpStatus: 200,
    details: {
      paypalOrderId: txn.paypalOrderId,
      paypalCaptureId: captureResponse.captureId,
      amount: input.amount || txn.amount,
      riskScore: input.riskScore,
      confirmedByAdmin: input.confirmedByAdmin,
      status: 'CAPTURED',
    },
  });

  return {
    success: true,
    transactionId: updatedTxn.id,
    paypalOrderId: txn.paypalOrderId,
    paypalCaptureId: captureResponse.captureId,
    status: 'CAPTURED',
    amount: input.amount || txn.amount,
    auditRecordHash: auditEntry?.recordHash || '00000000000000000000000000000000',
    message: `PayPal Capture Settled: $${(input.amount || txn.amount).toFixed(2)} USD successfully disbursed to ${txn.vendorName}. Capture ID: ${captureResponse.captureId}`,
  };
}

/**
 * Execution: Filter AG Grid Blotter Directive
 */
export async function executeFilterLedger(input: FilterLedgerInput) {
  return {
    success: true,
    directive: {
      intent: 'filter_ag_grid_ledger',
      column: input.column,
      value: input.value,
      explanation: input.explanation,
    },
    message: `Applied financial blotter filter on ${input.column} = "${input.value}": ${input.explanation}`,
  };
}

/**
 * Execution: Generate PayPal Invoicing v2 Draft
 */
export async function executeGenerateInvoice(
  input: GenerateInvoiceInput,
  organizationId: string
) {
  secureLogger.info('[Agent Tool] Executing generate_invoice', { input, organizationId });

  const invNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
  let invoiceId: string;
  let invoiceStatus = 'DRAFT';

  if (isDemoFailsafeActive()) {
    invoiceId = `INV2-DEMO-${Date.now().toString(36).toUpperCase()}`;
  } else {
    const res = await paypalClient.createDraftInvoice({
      invoiceNumber: invNumber,
      recipientEmail: input.recipientEmail,
      recipientName: input.recipientName,
      items: [
        {
          name: input.description,
          quantity: 1,
          unitPrice: input.amount,
        },
      ],
      currency: input.currency,
      note: input.description,
    });
    invoiceId = res.invoiceId;
    invoiceStatus = res.status;
  }

  // Commit audit entry
  const auditEntry = await appendCryptographicAuditLog({
    organizationId,
    actor: 'AI_AGENT',
    action: 'PAYPAL_INVOICE_GENERATED',
    targetId: invoiceId,
    paypalEndpoint: '/v2/invoicing/invoices',
    httpStatus: 201,
    details: {
      invoiceId,
      recipientEmail: input.recipientEmail,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
    },
  });

  return {
    success: true,
    invoiceId,
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    amount: input.amount,
    currency: input.currency,
    status: invoiceStatus,
    auditRecordHash: auditEntry?.recordHash,
    message: `PayPal Invoicing v2 Draft Created: Invoice ${invoiceId} generated for ${input.recipientEmail} ($${input.amount.toFixed(2)} ${input.currency}).`,
  };
}

/**
 * Execution: Audit Deliverable Proof
 */
export async function executeAuditDeliverable(
  input: AuditDeliverableInput,
  organizationId: string
) {
  const tenantDb = getTenantDb(organizationId);
  const txn = await tenantDb.transactions.findUnique(input.transactionId);
  if (!txn) {
    return {
      success: false,
      error: 'TRANSACTION_NOT_FOUND',
      message: `Transaction ${input.transactionId} not found.`,
    };
  }

  const policy = await prisma.treasuryPolicy.findFirst({
    where: { organizationId, isActive: true },
  });

  const auditResult = await agentEngine.auditDelivery({
    transactionId: txn.id,
    proofUrl: input.proofUrl || txn.deliverableProofUrl,
    proofHash: input.proofHash || txn.proofFileHash,
    deliverableSummary: txn.deliverableSummary,
    amount: txn.amount,
    maxAutoCaptureAmount: policy?.maxAutoCaptureAmount || 2500.0,
    maxAllowedRiskScore: policy?.maxAllowedRiskScore || 35,
  });

  await tenantDb.transactions.update({
    where: { id: txn.id },
    data: {
      aiRiskScore: auditResult.riskScore,
      aiAuditVerdict: auditResult.verdict,
      aiAuditReasoning: auditResult.reasons.join('; '),
    },
  });

  const auditEntry = await appendCryptographicAuditLog({
    organizationId,
    actor: 'AI_AGENT',
    action: 'DELIVERABLE_AUDITED',
    targetId: txn.id,
    details: {
      verdict: auditResult.verdict,
      riskScore: auditResult.riskScore,
      autoExecutable: auditResult.autoExecutable,
      reasons: auditResult.reasons,
    },
  });

  return {
    success: true,
    transactionId: txn.id,
    verdict: auditResult.verdict,
    riskScore: auditResult.riskScore,
    autoExecutable: auditResult.autoExecutable,
    reasons: auditResult.reasons,
    auditRecordHash: auditEntry?.recordHash,
    message: `Delivery Audit Completed: Verdict ${auditResult.verdict} (Risk Score: ${auditResult.riskScore}/100). Auto-executable: ${auditResult.autoExecutable ? 'YES' : 'NO'}.`,
  };
}

/**
 * Returns Vercel AI SDK Toolset bound to an active tenant organization
 */
export function getAgentTools(organizationId: string) {
  return {
    create_paypal_escrow: tool({
      description: 'Places enterprise B2B funds into an authorized PayPal escrow hold (Orders v2 API intent: AUTHORIZE). Checks the $10,000 policy ceiling and returns the real PayPal Order ID and approval link.',
      inputSchema: createPaypalEscrowSchema,
      execute: async (params: CreatePaypalEscrowInput) => executeCreatePaypalEscrow(params, organizationId),
    }),

    paypal_capture: tool({
      description: 'Executes a final settlement capture on an authorized PayPal escrow hold. STRICT GUARDRAIL: If riskScore > 40, confirmedByAdmin must be explicitly true, otherwise capture is halted.',
      inputSchema: paypalCaptureSchema,
      execute: async (params: PaypalCaptureInput) => executePaypalCapture(params, organizationId),
    }),

    filter_ledger: tool({
      description: 'Applies real-time column, amount, or status filters to the high-velocity AG Grid Financial Blotter display.',
      inputSchema: filterLedgerSchema,
      execute: async (params: FilterLedgerInput) => executeFilterLedger(params),
    }),

    generate_invoice: tool({
      description: 'Generates a formal PayPal Invoicing v2 draft for corporate billing and accounts-payable reconciliations.',
      inputSchema: generateInvoiceSchema,
      execute: async (params: GenerateInvoiceInput) => executeGenerateInvoice(params, organizationId),
    }),

    audit_deliverable: tool({
      description: 'Audits remote proof-of-delivery documents with SSRF validation and cryptographic SHA-256 hash checking against organization treasury policy thresholds.',
      inputSchema: auditDeliverableSchema,
      execute: async (params: AuditDeliverableInput) => executeAuditDeliverable(params, organizationId),
    }),
  };
}
