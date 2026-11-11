// ==============================================================================
// LedgerGuard TypeScript System Type Definitions
// ==============================================================================

export type UserRole = 'TREASURY_ADMIN' | 'AUDITOR';

export interface UserSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

export interface AuthJwtPayload {
  sub: string; // userId
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
  iat: number;
  exp: number;
}

// ------------------------------------------------------------------------------
// PayPal REST v2 Types
// ------------------------------------------------------------------------------

export interface PayPalAmount {
  currency_code: string;
  value: string; // e.g. "42500.00"
}

export interface PayPalOrderAuthorizeRequest {
  intent: 'AUTHORIZE';
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
}

export interface PayPalOrderResponse {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'AUTHORIZE' | 'CAPTURE';
  purchase_units: Array<{
    reference_id: string;
    amount: PayPalAmount;
    payments?: {
      authorizations?: Array<{
        id: string;
        status: 'CREATED' | 'CAPTURED' | 'DENIED' | 'EXPIRED' | 'PARTIALLY_CAPTURED' | 'VOIDED' | 'PENDING';
        amount: PayPalAmount;
        create_time: string;
        update_time: string;
        expiration_time?: string;
      }>;
      captures?: Array<{
        id: string;
        status: 'COMPLETED' | 'DECLINED' | 'PARTIALLY_REFUNDED' | 'PENDING' | 'REFUNDED';
        amount: PayPalAmount;
        create_time: string;
      }>;
      refunds?: Array<{
        id: string;
        status: 'COMPLETED' | 'CANCELLED' | 'PENDING';
        amount: PayPalAmount;
      }>;
    };
  }>;
  create_time: string;
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
  create_time: string;
  update_time: string;
}

export interface PayPalRefundResponse {
  id: string;
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING';
  amount: PayPalAmount;
  create_time: string;
}

export interface PayPalInvoiceItem {
  name: string;
  description?: string;
  quantity: string;
  unit_amount: PayPalAmount;
}

export interface PayPalInvoiceRequest {
  detail: {
    invoice_number: string;
    reference?: string;
    invoice_date: string;
    currency_code: string;
    note?: string;
  };
  invoicer: {
    name: {
      given_name: string;
      surname: string;
    };
    email_address: string;
  };
  primary_recipients: Array<{
    billing_info: {
      name: {
        given_name: string;
        surname: string;
      };
      email_address: string;
    };
  }>;
  items: PayPalInvoiceItem[];
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

export interface PayPalWebhookVerificationResponse {
  verification_status: 'SUCCESS' | 'FAILURE';
}

// ------------------------------------------------------------------------------
// Financial Blotter & Escrow Types
// ------------------------------------------------------------------------------

export interface FinancialBlotterRow {
  id: string;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  paypalAuthorizationId: string | null;
  invoiceNumber: string | null;
  counterpartyName: string;
  counterpartyEmail: string;
  type: string;
  amount: number;
  currency: string;
  status: 'AUTHORIZED_HOLD' | 'CAPTURED' | 'REFUNDED' | 'PENDING_INVOICE' | 'FLAGGED_DISCREPANCY';
  escrowConditions: string | null;
  deliverableProofUrl: string | null;
  deliverableProofHash: string | null;
  auditScore: number | null;
  auditNotes: string | null;
  capturedAt: string | null;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// Security Audit & OWASP Verification Matrix Types
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
  overallScore: number; // e.g. 100
  controlsPassed: number;
  totalControls: number;
  controls: SecurityControlStatus[];
  cryptographicSignature: string;
}

// ------------------------------------------------------------------------------
// Autonomous Agent Engine Types
// ------------------------------------------------------------------------------

export interface AgentActionDirective {
  intent: 'FILTER_GRID' | 'AUDIT_DELIVERY' | 'CAPTURE_ESCROW' | 'RELEASE_HOLD' | 'QUERY_TREASURY' | 'UNKNOWN';
  filterColumn?: string;
  filterValue?: string;
  transactionId?: string;
  summary: string;
  confidence: number;
  recommendedNextStep?: string;
  auditPass?: boolean;
}
