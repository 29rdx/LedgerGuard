import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function calculateHash(prevHash: string, timestamp: string, action: string, details: string): string {
  return crypto
    .createHash('sha256')
    .update(`${prevHash}:${timestamp}:${action}:${details}`)
    .digest('hex');
}

async function main() {
  console.log('Seeding LedgerGuard institutional database...');

  // Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.ledgerTransaction.deleteMany();
  await prisma.treasuryPolicy.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // 1. Primary Organization: Apex Global Capital Treasury LLC
  const apexOrg = await prisma.organization.create({
    data: {
      name: 'Apex Global Capital Treasury LLC',
      slug: 'apex-treasury',
    },
  });

  // 2. Secondary Tenant (To prove Row-Level Multi-Tenant Isolation): Meridian Sovereign Assets
  const meridianOrg = await prisma.organization.create({
    data: {
      name: 'Meridian Sovereign Asset Management',
      slug: 'meridian-sovereign',
    },
  });

  // Passwords hashed with bcrypt cost 12
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
      mfaSecret: 'JBSWY3DPEHPK3PXP', // Default Base32 secret for instant demo verification
    },
  });

  const auditorUser = await prisma.user.create({
    data: {
      organizationId: apexOrg.id,
      email: 'auditor@apexcapital.io',
      name: 'Marcus Thorne (Lead Compliance Auditor)',
      passwordHash: auditorPasswordHash,
      role: 'AUDITOR',
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    },
  });

  // Secondary Tenant User
  await prisma.user.create({
    data: {
      organizationId: meridianOrg.id,
      email: 'officer@meridiansovereign.com',
      name: 'Elena Rostova',
      passwordHash: adminPasswordHash,
      role: 'TREASURY_ADMIN',
      mfaSecret: 'JBSWY3DPEHPK3PXP',
    },
  });

  // Treasury Policies
  await prisma.treasuryPolicy.create({
    data: {
      organizationId: apexOrg.id,
      name: 'Apex Institutional Escrow & Discrepancy Policy v3.2',
      maxHoldAmount: 750000.0,
      autoCaptureThreshold: 25000.0,
      requireMfaAbove: 10000.0,
      requireProofOfDelivery: true,
      allowedCurrencies: 'USD,EUR,GBP,SGD',
      aiAuditStrictness: 'STRICT',
    },
  });

  await prisma.treasuryPolicy.create({
    data: {
      organizationId: meridianOrg.id,
      name: 'Meridian Sovereign Ultra-Conservative Policy',
      maxHoldAmount: 2000000.0,
      autoCaptureThreshold: 5000.0,
      requireMfaAbove: 5000.0,
      requireProofOfDelivery: true,
      allowedCurrencies: 'USD,EUR',
      aiAuditStrictness: 'STRICT',
    },
  });

  // 12 Institutional B2B Escrows & Invoices
  const transactions = [
    {
      organizationId: apexOrg.id,
      paypalOrderId: '8KM920194827103',
      paypalAuthorizationId: 'AUTH-940281923',
      counterpartyName: 'Palantir Defense Analytics Inc.',
      counterpartyEmail: 'billing@palantir-defense.com',
      type: 'ESCROW_AUTHORIZE',
      amount: 85000.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      escrowConditions: 'Delivery of classified SOC-2 Type II telemetry report and signed cryptographic deployment attestation.',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/README.md',
      deliverableProofHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      auditScore: 96,
      auditNotes: 'Verified SHA-256 binary hash matches certified release artifact. Delivery milestone confirmed.',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '7NL839201928472',
      paypalCaptureId: 'CAP-773928190',
      paypalAuthorizationId: 'AUTH-112093847',
      counterpartyName: 'Cloudflare Zero-Trust Systems',
      counterpartyEmail: 'enterprise-billing@cloudflare.com',
      type: 'ESCROW_AUTHORIZE',
      amount: 42500.0,
      currency: 'USD',
      status: 'CAPTURED',
      escrowConditions: 'Migration of 4 enterprise egress gateways with 99.999% SLA uptime verification.',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/package.json',
      deliverableProofHash: '8f434346648f6b96df89dda901c5176b10f6004c106d306981384fa42776a610',
      auditScore: 98,
      auditNotes: 'Automated synthetic uptime probes satisfied. Step-up MFA confirmed by Eleanor Vance.',
      capturedAt: new Date(Date.now() - 3600000 * 24 * 2),
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '3TX940281749201',
      invoiceNumber: 'INV-2026-0891',
      counterpartyName: 'NVIDIA AI Compute Infrastructure Ltd',
      counterpartyEmail: 'h100-accounts@nvidia.com',
      type: 'INVOICE_SETTLEMENT',
      amount: 148000.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      escrowConditions: 'Receipt of 10,000 GPU cluster reserved instances with root SSH key access and cluster readiness test.',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/render.yaml',
      deliverableProofHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      auditScore: 91,
      auditNotes: 'GPU benchmark throughput validated at 98.4GB/s interconnect speed.',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '5BR192837465920',
      counterpartyName: 'Stripe Treasury Partner Networks',
      counterpartyEmail: 'settlements@stripe-institutional.com',
      type: 'DIRECT_DISBURSEMENT',
      amount: 320000.0,
      currency: 'USD',
      status: 'CAPTURED',
      escrowConditions: 'Daily liquidity replenishment for European payment settlement rail.',
      deliverableProofUrl: null,
      deliverableProofHash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      auditScore: 100,
      auditNotes: 'Direct treasury routing cleared with dual cryptographic signature.',
      capturedAt: new Date(Date.now() - 3600000 * 48),
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '9QA772819039281',
      counterpartyName: 'Vanguard Custody Services LLC',
      counterpartyEmail: 'escrow@vanguard-institutional.com',
      type: 'ESCROW_AUTHORIZE',
      amount: 215000.0,
      currency: 'USD',
      status: 'FLAGGED_DISCREPANCY',
      escrowConditions: 'Verified legal transfer of 1,200 Treasury Bills to custodian account #99482.',
      deliverableProofUrl: 'https://github.com/paypaldev/hackathon-paypal-ag-grid-boilerplate',
      deliverableProofHash: '4355a46b19d348dc2f57c046f8ef63d4538ebb936000f3c9ee954a27460dd865',
      auditScore: 28,
      auditNotes: 'CRITICAL AUDIT MISMATCH: Submitted proof document date precedes order creation by 6 months. Release blocked.',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '2ZK940182746193',
      invoiceNumber: 'INV-2026-0904',
      counterpartyName: 'Snowflake Enterprise Data Warehouse',
      counterpartyEmail: 'ar@snowflake.com',
      type: 'INVOICE_SETTLEMENT',
      amount: 18400.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      escrowConditions: 'Quarterly usage credit reconciliation and query performance compliance.',
      deliverableProofUrl: null,
      deliverableProofHash: null,
      auditScore: 84,
      auditNotes: 'Usage logs match contracted baseline; pending final credit balance sync.',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '4PP839201948271',
      counterpartyName: 'CrowdStrike Falcon SOC Response',
      counterpartyEmail: 'finance@crowdstrike.com',
      type: 'ESCROW_AUTHORIZE',
      amount: 67000.0,
      currency: 'USD',
      status: 'REFUNDED',
      escrowConditions: 'Incident response drill completion within 15-minute response SLA.',
      deliverableProofUrl: null,
      deliverableProofHash: 'c2e42f3609b7c84f686701b2a95e2fc2c4c8ad74274c10a4e76a666e85efbf4e',
      auditScore: 41,
      auditNotes: 'Failed 15m SLA target during emergency simulation. Escrow voided and authorized hold released back to treasury.',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '6KL192837461029',
      invoiceNumber: 'INV-2026-1012',
      counterpartyName: 'Datadog APM & Synthetic Monitoring',
      counterpartyEmail: 'invoicing@datadoghq.com',
      type: 'INVOICE_SETTLEMENT',
      amount: 12500.0,
      currency: 'USD',
      status: 'PENDING_INVOICE',
      escrowConditions: 'Vendor invoice submission matching signed Purchase Order PO-99214.',
      deliverableProofUrl: null,
      deliverableProofHash: null,
      auditScore: 75,
      auditNotes: 'Awaiting formal PayPal Invoicing v2 draft synchronization.',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '1MN839201928374',
      counterpartyName: 'Twilio Segment Customer Data Rail',
      counterpartyEmail: 'ar@twilio.com',
      type: 'ESCROW_AUTHORIZE',
      amount: 9800.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      escrowConditions: 'End-to-end event ingestion verification for Q4 data warehouse pipeline.',
      deliverableProofUrl: 'https://raw.githubusercontent.com/paypaldev/hackathon-paypal-ag-grid-boilerplate/main/CLAUDE.md',
      deliverableProofHash: '3b092109cd8b724f7943d79e5743b59f3d67f573c2a1387293a38ee592dd7430',
      auditScore: 99,
      auditNotes: 'Below $25,000 threshold; eligible for automated release upon final check.',
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '8JJ281940182746',
      counterpartyName: 'Anthropic Claude AI API Enterprise',
      counterpartyEmail: 'billing@anthropic.com',
      type: 'DIRECT_DISBURSEMENT',
      amount: 54000.0,
      currency: 'USD',
      status: 'CAPTURED',
      escrowConditions: 'Monthly committed AI inference tokens allocation.',
      deliverableProofUrl: null,
      deliverableProofHash: '2c624232cdd221771294dfbb310aca000a0df6ac8b66b696d90ef06fdefb64a3',
      auditScore: 100,
      auditNotes: 'Direct settlement executed. Cryptographic receipt logged.',
      capturedAt: new Date(Date.now() - 3600000 * 72),
    },
    {
      organizationId: apexOrg.id,
      paypalOrderId: '3VW920184759201',
      invoiceNumber: 'INV-2026-1140',
      counterpartyName: 'HashiCorp Vault HSM Key Management',
      counterpartyEmail: 'renewals@hashicorp.com',
      type: 'INVOICE_SETTLEMENT',
      amount: 38000.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      escrowConditions: 'Installation of FIPS 140-3 compliant Hardware Security Module firmware.',
      deliverableProofUrl: null,
      deliverableProofHash: null,
      auditScore: 88,
      auditNotes: 'HSM attestation certificate verified; awaiting lead security signoff.',
    },
    // Secondary Tenant record (proves multi-tenant isolation)
    {
      organizationId: meridianOrg.id,
      paypalOrderId: '9SOV839201948201',
      counterpartyName: 'Swiss Banking Consortium Zurich',
      counterpartyEmail: 'settlements@swiss-consortium.ch',
      type: 'ESCROW_AUTHORIZE',
      amount: 1250000.0,
      currency: 'USD',
      status: 'AUTHORIZED_HOLD',
      escrowConditions: 'Confidential sovereign bond custodial settlement.',
      deliverableProofUrl: null,
      deliverableProofHash: 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
      auditScore: 95,
      auditNotes: 'Meridian isolated treasury holding. Inaccessible by Apex users.',
    },
  ];

  for (const tx of transactions) {
    await prisma.ledgerTransaction.create({ data: tx });
  }

  // Cryptographic Audit Trail Hash Chain
  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis Hash

  const auditEvents = [
    {
      action: 'ORGANIZATION_INITIALIZED',
      entityType: 'Organization',
      entityId: apexOrg.id,
      details: JSON.stringify({ name: apexOrg.name, complianceTier: 'Institutional Level-1' }),
      timeOffsetMinutes: 240,
    },
    {
      action: 'TREASURY_POLICY_ENACTED',
      entityType: 'TreasuryPolicy',
      entityId: apexOrg.id,
      details: JSON.stringify({ autoCaptureThreshold: 25000, requireMfaAbove: 10000, strictness: 'STRICT' }),
      timeOffsetMinutes: 210,
    },
    {
      action: 'PAYPAL_ORDER_AUTHORIZED',
      entityType: 'LedgerTransaction',
      entityId: '8KM920194827103',
      details: JSON.stringify({ amount: 85000, counterparty: 'Palantir Defense Analytics Inc.', intent: 'AUTHORIZE' }),
      timeOffsetMinutes: 180,
    },
    {
      action: 'PROOF_OF_DELIVERY_UPLOADED',
      entityType: 'LedgerTransaction',
      entityId: '8KM920194827103',
      details: JSON.stringify({ proofHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', mimeType: 'text/markdown' }),
      timeOffsetMinutes: 150,
    },
    {
      action: 'AGENT_DELIVERY_AUDITED',
      entityType: 'LedgerTransaction',
      entityId: '8KM920194827103',
      details: JSON.stringify({ auditScore: 96, outcome: 'PASSED', verifier: 'Autonomous Treasury Agent v2.4' }),
      timeOffsetMinutes: 120,
    },
    {
      action: 'PAYPAL_ORDER_CAPTURED',
      entityType: 'LedgerTransaction',
      entityId: '7NL839201928472',
      details: JSON.stringify({ amount: 42500, captureId: 'CAP-773928190', mfaMethod: 'TOTP_STEP_UP' }),
      timeOffsetMinutes: 90,
    },
    {
      action: 'DISCREPANCY_FLAGGED',
      entityType: 'LedgerTransaction',
      entityId: '9QA772819039281',
      details: JSON.stringify({ score: 28, reason: 'Proof document timestamp discrepancy exceeds tolerance' }),
      timeOffsetMinutes: 60,
    },
    {
      action: 'SECURITY_CONTROL_SCAN',
      entityType: 'SecurityAudit',
      entityId: 'OWASP-20-VERIFY',
      details: JSON.stringify({ status: 'ALL_20_PASSING', csrf: 'STRICT', csp: 'ENFORCED', sqli: 'PRISMA_PARAMETRIC' }),
      timeOffsetMinutes: 15,
    },
  ];

  for (const ev of auditEvents) {
    const timestamp = new Date(Date.now() - ev.timeOffsetMinutes * 60000).toISOString();
    const currentHash = calculateHash(prevHash, timestamp, ev.action, ev.details);

    await prisma.auditLog.create({
      data: {
        organizationId: apexOrg.id,
        userId: adminUser.id,
        action: ev.action,
        entityType: ev.entityType,
        entityId: ev.entityId,
        details: ev.details,
        ipAddress: '198.51.100.42',
        previousHash: prevHash,
        currentHash: currentHash,
        createdAt: new Date(timestamp),
      },
    });

    prevHash = currentHash;
  }

  console.log('Seed completed successfully!');
  console.log('Default Judge Credentials:');
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
