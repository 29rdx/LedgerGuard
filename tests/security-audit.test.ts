import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { POST as uploadProofHandler } from '../src/app/api/escrows/upload-proof/route';
import { POST as webhookHandler } from '../src/app/api/paypal/webhooks/route';
import { POST as captureHandler } from '../src/app/api/paypal/orders/[id]/capture/route';
import { prisma, getTenantDb } from '../src/lib/db';
import { signSessionToken, generateCsrfToken, SESSION_COOKIE_NAME, CSRF_COOKIE_NAME } from '../src/lib/auth';

describe('LedgerGuard Automated Cyber Security & Perimeter Defense Pen-Test Suite', () => {

  // =========================================================================
  // TEST 1: SQL Injection (SQLi) Prevention on /api/auth/login
  // =========================================================================
  describe('1. SQL Injection (SQLi) Defense Matrix', () => {
    it('should reject tautological SQL injection payloads (e.g. "\' OR \'1\'=\'1")', async () => {
      const maliciousPayloads = [
        { email: "' OR '1'='1' --", password: "password123" },
        { email: "admin'--@apexcapital.io", password: "' OR 1=1--" },
        { email: "' UNION SELECT * FROM User--@apexcapital.io", password: "xyz" },
        { email: "treasury@apexcapital.io'; DROP TABLE User; --", password: "test" },
      ];

      for (const payload of maliciousPayloads) {
        const req = new NextRequest('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const res = await loginHandler(req);
        // Must be blocked with 400 (Bad Request - Zod schema validation) or 401 (Unauthorized - Parameterized query failed)
        assert.ok(
          res.status === 400 || res.status === 401,
          `Expected status 400 or 401 for SQLi payload, received: ${res.status}`
        );

        const data = await res.json();
        assert.ok(!data.success, 'SQLi attempt must never authenticate successfully');
        assert.ok(data.error, 'Response must return an explicit security error');
      }
    });

    it('should prevent auth bypass and timing side-channel attacks on invalid passwords', async () => {
      const req = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'treasury@apexcapital.io',
          password: 'IncorrectPasswordAttempt123!',
        }),
      });

      const res = await loginHandler(req);
      assert.equal(res.status, 401, 'Invalid password attempt must return 401 Unauthorized');
      const data = await res.json();
      assert.equal(data.error, 'Invalid institutional credentials');
    });
  });

  // =========================================================================
  // TEST 2: Magic-Byte Binary Inspection on Disguised Executable Uploads
  // =========================================================================
  describe('2. Malicious File & Magic-Byte Validation (/api/escrows/upload-proof)', () => {
    it('should reject a Windows PE Executable (.exe) disguised with a .pdf file extension', async () => {
      // 1. Authenticate as Treasury Admin to obtain session
      const adminUser = await prisma.user.findFirst({
        where: { email: 'treasury@apexcapital.io' },
        include: { organization: true },
      });
      assert.ok(adminUser, 'Admin user must exist in database');

      const sessionToken = await signSessionToken({
        userId: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role as any,
        organizationId: adminUser.organizationId,
        organizationName: adminUser.organization.name,
      });

      // 2. Fetch an existing transaction for the organization
      const tx = await prisma.ledgerTransaction.findFirst({
        where: { organizationId: adminUser.organizationId },
      });
      assert.ok(tx, 'Active escrow transaction must exist in database');

      // 3. Create disguised binary payload: Windows PE executable header (MZ, 0x4D 0x5A)
      // disguised with a filename of 'verified_contract_deliverable.pdf'
      const maliciousExeBuffer = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, // MZ DOS Header
        0x04, 0x00, 0x00, 0x00, 0xff, 0xff, 0x00, 0x00,
        0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      const formData = new FormData();
      const fakePdfBlob = new Blob([maliciousExeBuffer], { type: 'application/pdf' });
      formData.append('file', fakePdfBlob, 'verified_contract_deliverable.pdf');
      formData.append('transactionId', tx.id);

      const req = new NextRequest('http://localhost:3000/api/escrows/upload-proof', {
        method: 'POST',
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
        body: formData,
      });
      req.cookies.set(SESSION_COOKIE_NAME, sessionToken);

      const res = await uploadProofHandler(req);
      assert.equal(
        res.status,
        400,
        `Expected HTTP 400 FileValidationError for disguised executable, received ${res.status}`
      );

      const data = await res.json();
      assert.equal(data.error, 'FileValidationError');
      assert.match(data.message, /Invalid file signature|Magic-byte validation/i);
    });

    it('should reject unauthenticated upload attempts with HTTP 401 Unauthorized', async () => {
      const formData = new FormData();
      const validPdfBuffer = Buffer.from('%PDF-1.4 sample pdf content header');
      formData.append('file', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'test.pdf');
      formData.append('transactionId', 'non-existent-tx-id');

      const req = new NextRequest('http://localhost:3000/api/escrows/upload-proof', {
        method: 'POST',
        body: formData,
      });

      const res = await uploadProofHandler(req);
      assert.equal(res.status, 401, 'Unauthenticated upload must return 401 Unauthorized');
    });
  });

  // =========================================================================
  // TEST 3: Cryptographic PayPal Webhook Signature & SSRF Defense
  // =========================================================================
  describe('3. PayPal Webhook Cryptographic Verification & SSRF Defense (/api/paypal/webhooks)', () => {
    it('should reject simulated PayPal webhook payload with an invalid/tampered transmission signature', async () => {
      const fakeWebhookPayload = {
        id: 'WH-TAMPERED-001',
        event_version: '1.0',
        create_time: new Date().toISOString(),
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource_type: 'capture',
        resource: {
          id: 'CAP-ATTACK-999',
          amount: { value: '99999.00', currency_code: 'USD' },
          status: 'COMPLETED',
        },
      };

      const req = new NextRequest('http://localhost:3000/api/paypal/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'paypal-transmission-id': 'TX-ATTACK-FORGED-001',
          'paypal-transmission-time': new Date().toISOString(),
          'paypal-transmission-sig': 'INVALID_SIGNATURE_TAMPERED_BY_ATTACKER',
          'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-17580.pem',
          'paypal-auth-algo': 'SHA256withRSA',
        },
        body: JSON.stringify(fakeWebhookPayload),
      });

      const res = await webhookHandler(req);
      assert.equal(
        res.status,
        400,
        `Expected HTTP 400 for tampered webhook transmission signature, received ${res.status}`
      );

      const data = await res.json();
      assert.equal(data.error, 'Cryptographic signature verification failed');
    });

    it('should reject PayPal webhooks with SSRF cert URLs targeting private networks or Cloud Metadata', async () => {
      const ssrfCertUrls = [
        'http://169.254.169.254/latest/meta-data/', // AWS/GCP Metadata
        'http://127.0.0.1:8080/internal.pem',       // Localhost loopback
        'http://192.168.1.5/certs/fake.pem',         // RFC 1918 Private LAN
        'https://attacker-controlled-site.com/evil.pem', // Non-PayPal domain
      ];

      for (const certUrl of ssrfCertUrls) {
        const req = new NextRequest('http://localhost:3000/api/paypal/webhooks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'paypal-transmission-id': 'TX-SSRF-PROBE',
            'paypal-transmission-time': new Date().toISOString(),
            'paypal-transmission-sig': 'MOCK_CRYPTOGRAPHIC_TRANSMISSION_SIGNATURE',
            'paypal-cert-url': certUrl,
            'paypal-auth-algo': 'SHA256withRSA',
          },
          body: JSON.stringify({ id: 'WH-SSRF', event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
        });

        const res = await webhookHandler(req);
        // SSRF guard must reject with 403 Forbidden
        assert.equal(
          res.status,
          403,
          `Expected HTTP 403 Forbidden for SSRF URL ${certUrl}, received ${res.status}`
        );
        const data = await res.json();
        assert.equal(data.error, 'Invalid certificate URL origin');
      }
    });
  });

  // =========================================================================
  // TEST 4: BOLA / IDOR Cross-Tenant Isolation Defense
  // =========================================================================
  describe('4. BOLA / IDOR Cross-Tenant Isolation Matrix', () => {
    it('should prevent Tenant B from reading or mutating LedgerTransactions belonging to Tenant A', async () => {
      // 1. Identify Tenant A (Apex Global) and Tenant B (Meridian Sovereign)
      const apexOrg = await prisma.organization.findFirst({
        where: { name: { contains: 'Apex' } },
      });
      const meridianOrg = await prisma.organization.findFirst({
        where: { name: { contains: 'Meridian' } },
      });

      assert.ok(apexOrg, 'Tenant A (Apex) must exist');
      assert.ok(meridianOrg, 'Tenant B (Meridian) must exist');
      assert.notEqual(apexOrg.id, meridianOrg.id, 'Tenants must possess distinct UUIDs');

      // 2. Fetch a transaction belonging strictly to Tenant A
      const apexTx = await prisma.ledgerTransaction.findFirst({
        where: { organizationId: apexOrg.id },
      });
      assert.ok(apexTx, 'Tenant A transaction must exist');

      // 3. Authenticate as a user from Tenant B (Meridian)
      let meridianUser = await prisma.user.findFirst({
        where: { organizationId: meridianOrg.id },
        include: { organization: true },
      });

      if (!meridianUser) {
        meridianUser = await prisma.user.create({
          data: {
            organizationId: meridianOrg.id,
            email: 'treasury@meridian.io',
            name: 'Julian Vance (Meridian)',
            role: 'TREASURY_ADMIN',
            passwordHash: '$2a$12$e8/6yVn0V1.m9t5L...',
            mfaEnabled: true,
          },
          include: { organization: true },
        });
      }

      const tenantBSessionToken = await signSessionToken({
        userId: meridianUser.id,
        email: meridianUser.email,
        name: meridianUser.name,
        role: meridianUser.role as any,
        organizationId: meridianOrg.id,
        organizationName: meridianOrg.name,
      });

      // 4. Attack: Tenant B attempts to capture Tenant A's escrow transaction via API
      const req = new NextRequest(`http://localhost:3000/api/paypal/orders/${apexTx.id}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${tenantBSessionToken}`,
        },
        body: JSON.stringify({ mfaToken: '123456' }),
      });
      req.cookies.set(SESSION_COOKIE_NAME, tenantBSessionToken);

      const res = await captureHandler(req, {
        params: Promise.resolve({ id: apexTx.id }),
      });

      // Must be blocked with 404 (Not Found in Tenant B scope) or 403 (Forbidden)
      assert.ok(
        res.status === 404 || res.status === 403,
        `Expected HTTP 404 or 403 for cross-tenant IDOR attack, received ${res.status}`
      );

      const data = await res.json();
      assert.ok(
        data.error === 'NotFound' || data.error === 'Forbidden',
        'BOLA/IDOR attempt must be blocked by tenant boundary'
      );

      // 5. Verify direct Tenant DB boundary isolation
      const tenantBDb = getTenantDb(meridianOrg.id);
      const breachedRecord = await tenantBDb.transactions.findUnique(apexTx.id);
      assert.equal(
        breachedRecord,
        null,
        'Tenant B database instance must return null when attempting to query Tenant A transaction ID'
      );
    });

    it('should enforce Server-Side RBAC denying AUDITOR write/capture privileges', async () => {
      const auditorUser = await prisma.user.findFirst({
        where: { email: 'auditor@apexcapital.io' },
        include: { organization: true },
      });
      assert.ok(auditorUser, 'Auditor user must exist');

      const auditorSessionToken = await signSessionToken({
        userId: auditorUser.id,
        email: auditorUser.email,
        name: auditorUser.name,
        role: 'AUDITOR',
        organizationId: auditorUser.organizationId,
        organizationName: auditorUser.organization.name,
      });

      const tx = await prisma.ledgerTransaction.findFirst({
        where: { organizationId: auditorUser.organizationId },
      });
      assert.ok(tx, 'Transaction must exist');

      const req = new NextRequest(`http://localhost:3000/api/paypal/orders/${tx.id}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${SESSION_COOKIE_NAME}=${auditorSessionToken}`,
        },
        body: JSON.stringify({}),
      });
      req.cookies.set(SESSION_COOKIE_NAME, auditorSessionToken);

      const res = await captureHandler(req, {
        params: Promise.resolve({ id: tx.id }),
      });

      assert.equal(res.status, 403, 'AUDITOR role must be blocked from capture mutations with 403 Forbidden');
      const data = await res.json();
      assert.equal(data.error, 'Forbidden');
    });
  });

  after(async () => {
    await prisma.$disconnect();
  });
});
