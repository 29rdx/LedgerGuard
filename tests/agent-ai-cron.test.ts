import { describe, it } from 'node:test';
import assert from 'node:assert';
import { executeCreatePaypalEscrow, executePaypalCapture } from '../src/lib/agent/tools';
import { prisma } from '../src/lib/db';
import { verifyAuditLogChain } from '../src/lib/crypto-audit';

describe('Autonomous Treasury Agent & Guardrail Validation Suite', () => {
  it('should enforce Institutional Safety Guardrail rejecting captures with riskScore > 40 without admin confirmation', async () => {
    // 1. Find or create a test organization
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'Guardrail Test Organization' },
      });
    }

    // 2. Attempt capture with high risk (65/100) and confirmedByAdmin = false
    const result = await executePaypalCapture(
      {
        transactionId: 'TX-HIGH-RISK-TEST',
        amount: 2500,
        riskScore: 65,
        confirmedByAdmin: false,
      },
      org.id
    );

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.requiresConfirmation, true);
    assert.strictEqual(result.error, 'RISK_CONFIRMATION_REQUIRED');
    assert.match(result.message, /policy ceiling.*Explicit admin confirmation required/i);
  });

  it('should successfully execute create_paypal_escrow and commit cryptographic SHA-256 block', async () => {
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'Audit Test Org' },
      });
    }

    const escrowResult = await executeCreatePaypalEscrow(
      {
        vendorName: 'Quantum Hardware Systems',
        vendorEmail: 'procure@quantum-sys.io',
        amount: 1850.0,
        currency: 'USD',
        category: 'CONTRACTOR_ESCROW',
        deliverableSummary: 'Milestone 2 cryogenic cooling unit delivery and benchmark',
        requireProofOfDelivery: true,
      },
      org.id
    );

    assert.strictEqual(escrowResult.success, true);
    assert.ok(escrowResult.paypalOrderId);
    assert.strictEqual(escrowResult.status, 'AUTHORIZED_HOLD');
    assert.ok(escrowResult.auditRecordHash);
    assert.strictEqual(escrowResult.auditRecordHash.length, 64);

    // Verify hash chain mathematical integrity
    const chainCheck = await verifyAuditLogChain(org.id);
    assert.strictEqual(chainCheck.isValid, true);
  });

  it('should enforce $10,000 autonomous escrow ceiling', async () => {
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'Ceiling Test Org' },
      });
    }

    const ceilingResult = await executeCreatePaypalEscrow(
      {
        vendorName: 'MegaCorp Global',
        vendorEmail: 'treasury@megacorp.io',
        amount: 15000.0,
        currency: 'USD',
        category: 'CONTRACTOR_ESCROW',
        deliverableSummary: 'High value capital acquisition',
        requireProofOfDelivery: true,
      },
      org.id
    );

    assert.strictEqual(ceilingResult.success, false);
    assert.strictEqual(ceilingResult.error, 'POLICY_CEILING_EXCEEDED');
    assert.match(ceilingResult.message, /autonomous \$10,000\.00 ceiling/i);
  });
});
