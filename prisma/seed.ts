import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { encryptTransactionPayload } from '../src/lib/encryption';

const prisma = new PrismaClient();

function calculateHash(prevHash: string, timestamp: string, actor: string, action: string, details: string): string {
  return crypto
    .createHash('sha256')
    .update(`${prevHash}:${timestamp}:${actor}:${action}:${details}`)
    .digest('hex');
}

async function main() {
  console.log('Seeding LedgerGuard institutional database with updated schema...');

  await prisma.auditLog.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.treasuryPolicy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Primary Organization
  const apexOrg = await prisma.organization.create({
    data: {
      name: 'Apex Global Capital Treasury LLC',
      paypalMerchantId: 'MERCHANT-APEX-GLOBAL-01',
    },
  });

  // Secondary Tenant (Row-Level Multi-Tenant Isolation proof)
  const meridianOrg = await prisma.organization.create({
    data: {
      name: 'Meridian Sovereign Asset Management',
      paypalMerchantId: 'MERCHANT-MERIDIAN-SOV-02',
    },
  });

  // 2. Users (bcrypt cost 12)
  const salt = await bcrypt.genSalt(12);
  const adminPasswordHash = await bcrypt.hash('TreasuryAdmin2026!#', salt);
  const auditorPasswordHash = await bcrypt.hash('AuditorCompliance2026!#', salt);

  const adminUser = await prisma.user.create({
    data: {
      organizationId: apexOrg.id,
      email: 'treasury@apexcapital.io',
      name: 'Eleanor Vance (VP Treasury)',
      passwordHash: adminPasswordHash,
      role: 'TREASURY_ADMIN',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP', // Base32 RFC 6238 key for demo testing
    },
  });

  await prisma.user.create({
    data: {
      organizationId: apexOrg.id,
      email: 'auditor@apexcapital.io',
      name: 'Marcus Thorne (Lead Compliance Auditor)',
      passwordHash: auditorPasswordHash,
      role: 'AUDITOR',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    },
  });

  await prisma.user.create({
    data: {
      organizationId: meridianOrg.id,
      email: 'officer@meridiansovereign.com',
      name: 'Elena Rostova (Sovereign Officer)',
      passwordHash: adminPasswordHash,
      role: 'TREASURY_ADMIN',
      mfaEnabled: true,
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    },
  });

  // 3. Treasury Policies (3 policies)
  await prisma.treasuryPolicy.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Tier-1 Autonomous Escrow & AP Policy',
      maxAutoCaptureAmount: 2500.0,
      mfaStepUpThreshold: 1000.0,
      requireProofOfDelivery: true,
      maxAllowedRiskScore: 35,
      isActive: true,
    },
  });

  await prisma.treasuryPolicy.create({
    data: {
      organizationId: apexOrg.id,
      name: 'High-Value Capital Equipment Policy',
      maxAutoCaptureAmount: 500.0,
      mfaStepUpThreshold: 500.0,
      requireProofOfDelivery: true,
      maxAllowedRiskScore: 20,
      isActive: false,
    },
  });

  await prisma.treasuryPolicy.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Emergency Micro-Disbursements Policy',
      maxAutoCaptureAmount: 5000.0,
      mfaStepUpThreshold: 2500.0,
      requireProofOfDelivery: false,
      maxAllowedRiskScore: 50,
      isActive: false,
    },
  });

  // 4. 12 Realistic Institutional B2B Escrow & Invoice Transactions
  const transactions = [
    {
      organizationId: apexOrg.id,
      paypalOrderId: '8KM920194827103',
      paypalAuthId: 'AUTH-940281923',
      vendorName: 'Palantir Defense Analytics Inc.',
      vendorEmail: 'billing@palantir-defense.com',
      category: 'CONTRACTOR_ESCROW',
      amount: 85000.0,
      currency: 'USD',
      status: 'AUDIT_PASSED',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/README.md',
      deliverableSummary: 'Certified SOC-2 Type II telemetry report & signed cryptographic deployment attestation',
      proofFileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      aiRiskScore: 12,
      aiAuditVerdict: 'APPROVED',
      aiAuditReasoning: 'SSRF validation cleared. Artifact SHA-256 digest matches escrow baseline contract perfectly.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=8KM920194827103',
      rawPaypalResponse: '{"id":"8KM920194827103","intent":"AUTHORIZE","status":"APPROVED","purchase_units":[{"amount":{"currency_code":"USD","value":"85000.00"}}]}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '7NL839201928472',
      paypalAuthId: 'AUTH-112093847',
      paypalCaptureId: 'CAP-773928190',
      vendorName: 'Cloudflare Zero-Trust Systems',
      vendorEmail: 'enterprise-billing@cloudflare.com',
      category: 'CLOUD_INFRA',
      amount: 42500.0,
      currency: 'USD',
      status: 'CAPTURED',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/package.json',
      deliverableSummary: 'Migration of 4 enterprise egress gateways with 99.999% SLA verified',
      proofFileHash: '8f434346648f6b96df89dda901c5176b10f6004c106d306981384fa42776a610',
      aiRiskScore: 8,
      aiAuditVerdict: 'APPROVED',
      aiAuditReasoning: 'Automated synthetic probe uptime satisfied. Step-up TOTP authorization verified by Eleanor Vance.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=7NL839201928472',
      rawPaypalResponse: '{"id":"7NL839201928472","intent":"AUTHORIZE","status":"COMPLETED","purchase_units":[{"payments":{"captures":[{"id":"CAP-773928190","status":"COMPLETED"}]}}]}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '3TX940281749201',
      paypalInvoiceId: 'INV-2026-0891',
      vendorName: 'NVIDIA AI Compute Infrastructure Ltd',
      vendorEmail: 'h100-accounts@nvidia.com',
      category: 'CLOUD_INFRA',
      amount: 148000.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/render.yaml',
      deliverableSummary: 'Receipt of 10,000 GPU cluster reserved instances with root SSH key access and benchmark test',
      proofFileHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      aiRiskScore: 16,
      aiAuditVerdict: 'PENDING_REVIEW',
      aiAuditReasoning: 'GPU interconnect throughput validated at 98.4GB/s; awaiting second security engineer sign-off.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=3TX940281749201',
      rawPaypalResponse: '{"id":"3TX940281749201","intent":"AUTHORIZE","status":"APPROVED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '9QA772819039281',
      vendorName: 'Vanguard Custody Services LLC',
      vendorEmail: 'escrow@vanguard-institutional.com',
      category: 'SAAS_LICENSE',
      amount: 215000.0,
      currency: 'USD',
      status: 'FLAGGED_DISPUTE',
      deliverableProofUrl: 'https://github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate',
      deliverableSummary: 'Certified transfer of 1,200 Treasury Bills to custodial depot account #99482',
      proofFileHash: '4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865',
      aiRiskScore: 89,
      aiAuditVerdict: 'FLAGGED',
      aiAuditReasoning: 'CRITICAL DISCREPANCY: Proof document timestamp precedes escrow order date by 6 months. Escrow hold locked.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=9QA772819039281',
      rawPaypalResponse: '{"id":"9QA772819039281","status":"APPROVED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '5BR192837465920',
      paypalCaptureId: 'CAP-991820491',
      vendorName: 'Stripe Treasury Partner Networks',
      vendorEmail: 'settlements@stripe-institutional.com',
      category: 'SAAS_LICENSE',
      amount: 1450.0,
      currency: 'USD',
      status: 'CAPTURED',
      deliverableProofUrl: null,
      deliverableSummary: 'Automated European settlement liquidity replenishment',
      proofFileHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      aiRiskScore: 4,
      aiAuditVerdict: 'APPROVED',
      aiAuditReasoning: 'Direct settlement under $2,500 ceiling passed automated policy auto-capture criteria.',
      approvalLink: null,
      rawPaypalResponse: '{"id":"5BR192837465920","status":"COMPLETED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '2ZK940182746193',
      paypalInvoiceId: 'INV-2026-0904',
      vendorName: 'Snowflake Enterprise Data Warehouse',
      vendorEmail: 'ar@snowflake.com',
      category: 'SAAS_LICENSE',
      amount: 18400.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      deliverableProofUrl: null,
      deliverableSummary: 'Quarterly compute credit package reconciliation',
      proofFileHash: null,
      aiRiskScore: 22,
      aiAuditVerdict: 'PENDING_REVIEW',
      aiAuditReasoning: 'Usage logs match contracted rate card; pending invoice synchronization.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=2ZK940182746193',
      rawPaypalResponse: '{"id":"2ZK940182746193","status":"APPROVED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '4PP839201948271',
      vendorName: 'CrowdStrike Falcon SOC Response',
      vendorEmail: 'finance@crowdstrike.com',
      category: 'SAAS_LICENSE',
      amount: 67000.0,
      currency: 'USD',
      status: 'REFUNDED',
      deliverableProofUrl: null,
      deliverableSummary: 'Incident response simulation completed within 15-minute SLA',
      proofFileHash: 'c2e42f3609b7c84f686701b2a95e2fc2c4c8ad74274c10a4e76a666e85efbf4e',
      aiRiskScore: 78,
      aiAuditVerdict: 'FLAGGED',
      aiAuditReasoning: 'Failed SLA threshold during drill. Escrow hold voided and released back to treasury ledger.',
      approvalLink: null,
      rawPaypalResponse: '{"id":"4PP839201948271","status":"VOIDED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '6KL192837461029',
      paypalInvoiceId: 'INV-2026-1012',
      vendorName: 'Datadog APM & Synthetic Monitoring',
      vendorEmail: 'invoicing@datadoghq.com',
      category: 'CLOUD_INFRA',
      amount: 12500.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      deliverableProofUrl: null,
      deliverableSummary: 'Vendor invoice submission matching PO-99214',
      proofFileHash: null,
      aiRiskScore: 19,
      aiAuditVerdict: 'PENDING_REVIEW',
      aiAuditReasoning: 'Awaiting PayPal Invoicing v2 draft synchronization.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=6KL192837461029',
      rawPaypalResponse: '{"id":"6KL192837461029","status":"APPROVED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '1MN839201928374',
      vendorName: 'Twilio Segment Customer Data Rail',
      vendorEmail: 'ar@twilio.com',
      category: 'SAAS_LICENSE',
      amount: 980.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/CLAUDE.md',
      deliverableSummary: 'End-to-end ingestion telemetry stream verified',
      proofFileHash: '3b092109cd8b724f7943d79e5743b59f3d67f573c2a1387293a38ee592dd7430',
      aiRiskScore: 6,
      aiAuditVerdict: 'APPROVED',
      aiAuditReasoning: 'Amount below $1,000 threshold; eligible for automated release.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=1MN839201928374',
      rawPaypalResponse: '{"id":"1MN839201928374","status":"APPROVED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '8JJ281940182746',
      paypalCaptureId: 'CAP-229104820',
      vendorName: 'Anthropic Claude AI API Enterprise',
      vendorEmail: 'billing@anthropic.com',
      category: 'CLOUD_INFRA',
      amount: 54000.0,
      currency: 'USD',
      status: 'CAPTURED',
      deliverableProofUrl: null,
      deliverableSummary: 'Monthly dedicated AI inference capacity token pool',
      proofFileHash: '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3',
      aiRiskScore: 5,
      aiAuditVerdict: 'APPROVED',
      aiAuditReasoning: 'Direct settlement executed with dual cryptographic attestation.',
      approvalLink: null,
      rawPaypalResponse: '{"id":"8JJ281940182746","status":"COMPLETED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '3VW920184759201',
      paypalInvoiceId: 'INV-2026-1140',
      vendorName: 'HashiCorp Vault HSM Key Management',
      vendorEmail: 'renewals@hashicorp.com',
      category: 'SAAS_LICENSE',
      amount: 38000.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      deliverableProofUrl: null,
      deliverableSummary: 'Installation of FIPS 140-3 compliant Hardware Security Module firmware',
      proofFileHash: null,
      aiRiskScore: 26,
      aiAuditVerdict: 'PENDING_REVIEW',
      aiAuditReasoning: 'HSM attestation certificate verified; awaiting lead security review.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=3VW920184759201',
      rawPaypalResponse: '{"id":"3VW920184759201","status":"APPROVED"}',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '5VT145000000001',
      vendorName: 'Vertex Semiconductor',
      vendorEmail: 'shipments@vertex-semi.com',
      category: 'LOGISTICS',
      amount: 1450.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/README.md',
      deliverableSummary: 'Q4 silicon wafer consignment delivery and cleanroom acceptance certificate',
      proofFileHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      aiRiskScore: 14,
      aiAuditVerdict: 'APPROVED',
      aiAuditReasoning: 'Deliverable proof matches cleanroom specifications. Eligible for 1-click capture.',
      approvalLink: 'https://www.sandbox.paypal.com/checkoutnow?token=5VT145000000001',
      rawPaypalResponse: '{"id":"5VT145000000001","status":"APPROVED"}',
    },
  ];

  for (const tx of transactions) {
    const encrypted = encryptTransactionPayload(tx);
    await prisma.ledgerTransaction.create({ data: encrypted });
  }

  // 5. Cryptographic Audit Trail Hash Chain
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis Hash

  const auditEvents = [
    {
      actor: 'USER',
      action: 'ORGANIZATION_INITIALIZED',
      targetId: apexOrg.id,
      paypalEndpoint: null,
      httpStatus: 200,
      details: JSON.stringify({ name: apexOrg.name, merchantId: apexOrg.paypalMerchantId }),
      timeOffsetMinutes: 300,
    },
    {
      actor: 'USER',
      action: 'TREASURY_POLICY_ENACTED',
      targetId: apexOrg.id,
      paypalEndpoint: null,
      httpStatus: 200,
      details: JSON.stringify({ policy: 'Tier-1 Autonomous Escrow & AP Policy', mfaStepUpThreshold: 1000.0 }),
      timeOffsetMinutes: 240,
    },
    {
      actor: 'USER',
      action: 'PAYPAL_ORDER_AUTHORIZED',
      targetId: '8KM920194827103',
      paypalEndpoint: '/v2/checkout/orders',
      httpStatus: 201,
      details: JSON.stringify({ amount: 85000.0, vendor: 'Palantir Defense Analytics Inc.', intent: 'AUTHORIZE' }),
      timeOffsetMinutes: 200,
    },
    {
      actor: 'AI_AGENT',
      action: 'PROOF_OF_DELIVERY_AUDITED',
      targetId: '8KM920194827103',
      paypalEndpoint: null,
      httpStatus: 200,
      details: JSON.stringify({ riskScore: 12, verdict: 'APPROVED', ssrfVerified: true }),
      timeOffsetMinutes: 160,
    },
    {
      actor: 'USER',
      action: 'PAYPAL_ORDER_CAPTURED',
      targetId: '7NL839201928472',
      paypalEndpoint: '/v2/payments/authorizations/AUTH-112093847/capture',
      httpStatus: 201,
      details: JSON.stringify({ captureId: 'CAP-773928190', amount: 42500.0, mfaStepUpConfirmed: true }),
      timeOffsetMinutes: 110,
    },
    {
      actor: 'PAYPAL_WEBHOOK',
      action: 'WEBHOOK_PAYMENT_CAPTURE_COMPLETED',
      targetId: '7NL839201928472',
      paypalEndpoint: '/v1/notifications/verify-webhook-signature',
      httpStatus: 200,
      details: JSON.stringify({ transmissionId: 'TX-99214-CLOUD', status: 'SUCCESS' }),
      timeOffsetMinutes: 80,
    },
    {
      actor: 'AI_AGENT',
      action: 'DISPUTE_FLAGGED',
      targetId: '9QA772819039281',
      paypalEndpoint: null,
      httpStatus: 200,
      details: JSON.stringify({ riskScore: 89, reason: 'Proof document timestamp mismatch exceeds tolerance' }),
      timeOffsetMinutes: 45,
    },
    {
      actor: 'SECURITY_GUARD',
      action: 'PENETRATION_SELF_TEST_PASSED',
      targetId: 'OWASP-20-VERIFY',
      paypalEndpoint: null,
      httpStatus: 200,
      details: JSON.stringify({ controlsChecked: 20, controlsPassed: 20, status: '100%_PASS' }),
      timeOffsetMinutes: 10,
    },
  ];

  for (const ev of auditEvents) {
    const timestamp = new Date(Date.now() - ev.timeOffsetMinutes * 60000);
    const recordHash = calculateHash(prevHash, timestamp.toISOString(), ev.actor, ev.action, ev.details);

    await prisma.auditLog.create({
      data: {
        organizationId: apexOrg.id,
        timestamp,
        actor: ev.actor,
        action: ev.action,
        targetId: ev.targetId,
        paypalEndpoint: ev.paypalEndpoint,
        httpStatus: ev.httpStatus,
        redactedDetails: ev.details,
        previousHash: prevHash,
        recordHash,
      },
    });

    prevHash = recordHash;
  }

  console.log('Seeded database with 12 institutional transactions, 3 policies & hash chain!');
  console.log('Credentials:');
  console.log('  Admin:   treasury@apexcapital.io / TreasuryAdmin2026!#');
  console.log('  Auditor: auditor@apexcapital.io  / AuditorCompliance2026!#');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
