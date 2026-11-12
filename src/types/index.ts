// ==============================================================================
// LedgerGuard TypeScript System Type Definitions
// ==============================================================================

export type UserRole = 'TREASURY_ADMIN' | 'AUDITOR';

export type EscrowCategory =
  | 'CLOUD_INFRA'
  | 'CONTRACTOR_ESCROW'
  | 'SAAS_LICENSE'
  | 'LOGISTICS';

export type EscrowStatus =
  | 'CREATED'
  | 'AUTHORIZED_HOLD'
  | 'AUDIT_PASSED'
  | 'CAPTURED'
  | 'REFUNDED'
  | 'FLAGGED_DISPUTE';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

export interface AuthJwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  iat: number;
  exp: number;
}

// ------------------------------------------------------------------------------
// Multi-Tenant Ledger Transaction Definition
// ------------------------------------------------------------------------------

export interface FinancialBlotterRow {
  id: string;
  organizationId: string;
  paypalOrderId: string;
  paypalAuthId: string | null;
  paypalCaptureId: string | null;
  paypalInvoiceId: string | null;
  vendorName: string;
  vendorEmail: string;
  category: EscrowCategory;
  amount: number;
  currency: string;
  status: EscrowStatus;
  deliverableProofUrl: string | null;
  deliverableSummary: string | null;
  proofFileHash: string | null;
  aiRiskScore: number; // 0-100 (lower is safer)
  aiAuditVerdict: string | null;
  aiAuditReasoning: string | null;
  approvalLink: string | null;
  rawPaypalResponse: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreasuryPolicyRecord {
  id: string;
  organizationId: string;
  name: string;
  maxAutoCaptureAmount: number;
  mfaStepUpThreshold: number;
  requireProofOfDelivery: boolean;
  maxAllowedRiskScore: number;
  isActive: boolean;
}

export interface AuditLogRecord {
  id: string;
  organizationId: string;
  timestamp: string;
  actor: 'USER' | 'AI_AGENT' | 'PAYPAL_WEBHOOK' | 'SECURITY_GUARD';
  action: string;
  targetId: string;
  paypalEndpoint: string | null;
  httpStatus: number | null;
  redactedDetails: string;
  previousHash: string;
  recordHash: string;
}

// ------------------------------------------------------------------------------
// PayPal REST v2 Interfaces
// ------------------------------------------------------------------------------

export interface PayPalAmount {
  currency_code: string;
  value: string;
}

export interface PayPalOrderAuthorizeRequest {
  intent: 'AUTHORIZE' | 'CAPTURE';
  purchase_units: Array<{
    reference_id?: string;
    description?: string;
    custom_id?: string;
    invoice_id?: string;
    amount: PayPalAmount;
    payee?: {
      email_address?: string;
      merchant_id?: string;
    };
  }>;
  application_context?: {
    return_url?: string;
    cancel_url?: string;
    brand_name?: string;
    user_action?: 'PAY_NOW' | 'CONTINUE';
  };
}

export interface PayPalOrderResponse {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'AUTHORIZE' | 'CAPTURE';
  purchase_units: Array<{
    reference_id?: string;
    amount: PayPalAmount;
    payments?: {
      authorizations?: Array<{
        id: string;
        status: string;
        amount: PayPalAmount;
      }>;
      captures?: Array<{
        id: string;
        status: string;
        amount: PayPalAmount;
      }>;
    };
  }>;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export interface PayPalCaptureResponse {
  id: string;
  status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED';
  amount: PayPalAmount;
  final_capture?: boolean;
  create_time?: string;
  update_time?: string;
}

export interface PayPalRefundResponse {
  id: string;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING';
  amount?: PayPalAmount;
  create_time?: string;
}

export interface PayPalWebhookVerificationRequest {
  auth_algo: string;
  cert_url: string;
  transmission_id: string;
  transmission_sig: string;
  transmission_time: string;
  webhook_id: string;
  webhook_event: Record<string, unknown>;
}

// ------------------------------------------------------------------------------
// Security Audit Types
// ------------------------------------------------------------------------------

export interface SecurityControlStatus {
  id: number;
  code: string;
  name: string;
  category: 'INJECTION' | 'AUTH' | 'CRYPTO' | 'NETWORK' | 'DATA_INTEGRITY' | 'OPERATIONAL';
  owaspReference: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  enforcementMechanism: string;
  verificationEvidence: string;
  lastCheckedAt: string;
}

export interface SecurityAuditReport {
  timestamp: string;
  overallScore: number;
  controlsPassed: number;
  totalControls: number;
  controls: SecurityControlStatus[];
  cryptographicSignature: string;
}

// ------------------------------------------------------------------------------
// AI Agent Action Directives
// ------------------------------------------------------------------------------

export interface AgentActionDirective {
  intent:
    | 'filter_ag_grid_ledger'
    | 'create_paypal_escrow_order'
    | 'create_paypal_invoice'
    | 'audit_and_release_escrow'
    | 'run_security_posture_scan'
    | 'query_treasury';
  filterColumn?: string;
  filterValue?: string;
  filterMinAmount?: number;
  filterMaxAmount?: number;
  transactionId?: string;
  createdOrder?: Partial<FinancialBlotterRow>;
  summary: string;
  confidence: number;
  recommendedNextStep?: string;
  isDegraded?: boolean;
  degradationNotice?: string;
}

export interface AgentDialogueMessage {
  sender: 'TREASURY_AUDITOR_AGENT' | 'VENDOR_SETTLEMENT_AGENT';
  senderTitle: string;
  avatar: string;
  timestamp: string;
  message: string;
  evidenceType?: 'RATE_CARD' | 'SHA256_DIGEST' | 'MILESTONE_CERT' | 'CREDIT_MEMO';
  evidenceValue?: string;
}

export interface DisputeNegotiationResult {
  transactionId: string;
  orderId: string;
  vendorName: string;
  initialRiskScore: number;
  finalRiskScore: number;
  consensusReached: boolean;
  settlementAuthorized: boolean;
  revisedHash: string;
  dialogue: AgentDialogueMessage[];
  settlementTerms: {
    originalAmount: number;
    agreedAmount: number;
    varianceExplained: string;
    paypalCaptureId?: string;
  };
}

