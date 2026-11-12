import { z } from 'zod';

/**
 * ==============================================================================
 * LEDGERGUARD AUTONOMOUS TREASURY AGENT: CORE SYSTEM PROMPT & POLICY MATRIX
 * ==============================================================================
 * Institutional Guardrails, Risk Ceiling Limits, and Proof-of-Delivery Verification.
 */
export const LEDGERGUARD_SYSTEM_PROMPT = `
You are the LedgerGuard Autonomous Treasury Agent — an institutional-grade, cryptographically verifiable financial AI controller built for enterprise treasury management.

YOUR SOLE PURPOSE:
1. Manage enterprise B2B escrow holds using the PayPal Orders v2 API rail (Intent: AUTHORIZE).
2. Audit cryptographic proof-of-delivery documents against organization Treasury Policies (SHA-256 hash attestation & SSRF-hardened endpoint scans).
3. Execute automated PayPal settlements (Intent: CAPTURE) strictly when risk thresholds and deliverable criteria are met.
4. Generate PayPal Invoicing v2 billing drafts for accounts-payable operations.
5. Provide real-time filtering and analysis directives for the high-velocity AG Grid Financial Blotter.

STRICT INSTITUTIONAL GUARDRAILS (ZERO TOLERANCE FOR BYPASS):
- You do NOT offer general conversational assistance, chit-chat, or off-topic guidance.
- RISK THRESHOLD CEILING: If a transaction's AI Risk Score exceeds 40 (out of 100), you MUST NOT execute the 'paypal_capture' tool automatically. You must explicitly halt execution, explain the elevated risk factors to the user, and demand explicit human confirmation ('confirmedByAdmin: true') before any capture can proceed.
- ESCROW CEILING: Any escrow hold request exceeding $10,000.00 USD is rejected for autonomous placement and must be routed for board-level governance review.
- PROOF-OF-DELIVERY INTEGRITY: Delivery proof URLs must satisfy SSRF validation (no internal metadata IPs, RFC 1918 private subnets, or unapproved domains). Deliverable payloads must match their SHA-256 cryptographic digest.
- CRYPTOGRAPHIC RECORDING: Every tool execution mutates the cryptographically chained SHA-256 Audit Log. Never simulate or invent transaction identifiers.

When interacting with the user:
- Be concise, institutional, authoritative, and audit-ready.
- State amounts with precision (e.g., "$1,450.00 USD").
- Reference relevant cryptographic verification hashes and PayPal API identifiers.
`.trim();

/**
 * Zod Schemas for Strict Tool Calling Validation
 */

export const createPaypalEscrowSchema = z.object({
  vendorName: z
    .string()
    .min(2, 'Vendor name must be at least 2 characters')
    .describe('The institutional vendor or contractor name receiving the escrow hold (e.g. Vertex Semiconductor)'),
  vendorEmail: z
    .string()
    .email('Valid vendor email required')
    .describe('The institutional contact or payment email of the recipient'),
  amount: z
    .number()
    .positive('Disbursement amount must be greater than zero')
    .max(10000, 'Autonomous escrow placement is capped at $10,000.00 USD')
    .describe('The total USD amount to place into authorized PayPal escrow hold'),
  currency: z
    .enum(['USD', 'EUR', 'GBP'])
    .default('USD')
    .describe('Three-letter ISO currency code'),
  category: z
    .enum(['CONTRACTOR_ESCROW', 'CLOUD_INFRA', 'SAAS_LICENSE', 'LOGISTICS'])
    .default('CONTRACTOR_ESCROW')
    .describe('Operational accounting category for chart-of-accounts allocation'),
  deliverableSummary: z
    .string()
    .min(5, 'Deliverable specification summary is required')
    .describe('Clear statement of deliverables required before funds release (e.g., Q4 silicon wafer cleanroom certificate)'),
  requireProofOfDelivery: z
    .boolean()
    .default(true)
    .describe('Whether cryptographic SHA-256 proof-of-delivery is mandated prior to capture'),
});

export const paypalCaptureSchema = z.object({
  transactionId: z
    .string()
    .min(3, 'Valid LedgerTransaction ID or PayPal Order ID is required')
    .describe('The internal LedgerGuard transaction ID or PayPal Order ID to settle and capture'),
  amount: z
    .number()
    .positive('Capture amount must be positive')
    .describe('The exact dollar amount to capture from the authorized hold'),
  riskScore: z
    .number()
    .min(0)
    .max(100)
    .default(15)
    .describe('The evaluated AI risk score (0-100). If > 40, confirmedByAdmin MUST be true'),
  confirmedByAdmin: z
    .boolean()
    .default(false)
    .describe('Explicit human/admin override flag. Mandatory if riskScore > 40'),
  reason: z
    .string()
    .optional()
    .describe('Auditable reason for capture execution or risk override'),
});

export const filterLedgerSchema = z.object({
  column: z
    .enum(['status', 'category', 'minAmount', 'maxAmount', 'vendorName', 'all'])
    .describe('The financial blotter attribute to filter on'),
  value: z
    .union([z.string(), z.number()])
    .describe('The target filter value (e.g. "AUTHORIZED_HOLD", "FLAGGED_DISPUTE", 1000)'),
  explanation: z
    .string()
    .describe('Concise operational summary explaining why the blotter view was filtered'),
});

export const generateInvoiceSchema = z.object({
  recipientEmail: z
    .string()
    .email('Valid billing recipient email is required')
    .describe('Corporate email address to deliver the PayPal Invoicing v2 draft to'),
  recipientName: z
    .string()
    .min(2, 'Recipient corporate name is required')
    .describe('Legal billing name of customer or vendor'),
  amount: z
    .number()
    .positive('Invoice total must be positive')
    .describe('Total invoice amount in USD'),
  currency: z
    .enum(['USD', 'EUR', 'GBP'])
    .default('USD')
    .describe('Currency code'),
  description: z
    .string()
    .min(3, 'Line-item service description required')
    .describe('Line-item accounting description of services rendered'),
  dueDate: z
    .string()
    .optional()
    .describe('Net-30 or specific ISO-8601 payment due date'),
});

export const auditDeliverableSchema = z.object({
  transactionId: z
    .string()
    .min(3, 'Transaction ID is required')
    .describe('The transaction ID possessing deliverable proof to inspect and score'),
  proofUrl: z
    .string()
    .url('Proof URL must be a valid HTTPS resource')
    .optional()
    .describe('Remote URL pointing to the certified delivery proof or manifest'),
  proofHash: z
    .string()
    .optional()
    .describe('Expected SHA-256 hexadecimal hash digest of the delivery proof'),
});

export type CreatePaypalEscrowInput = z.infer<typeof createPaypalEscrowSchema>;
export type PaypalCaptureInput = z.infer<typeof paypalCaptureSchema>;
export type FilterLedgerInput = z.infer<typeof filterLedgerSchema>;
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
export type AuditDeliverableInput = z.infer<typeof auditDeliverableSchema>;

