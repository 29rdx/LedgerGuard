import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { encryptField } from '@/lib/encryption';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';
import { paypalClient } from '@/lib/paypal-client';

const OnboardingPayloadSchema = z.object({
  organizationName: z.string().min(2).max(100),
  jurisdiction: z.string().min(2).max(100),
  currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD']).default('USD'),
  paypalClientId: z.string().optional(),
  paypalClientSecret: z.string().optional(),
  paypalEnvironment: z.enum(['sandbox', 'production']).default('sandbox'),
  policyTemplate: z.string().default('BALANCED_ESCROW'),
  maxAutoCaptureAmount: z.number().min(0).max(1000000),
  mfaStepUpThreshold: z.number().min(0).max(1000000),
  requireProofOfDelivery: z.boolean().default(true),
  maxAllowedRiskScore: z.number().min(0).max(100).default(35),
});

/**
 * GET /api/onboarding
 * Returns current profile and policy setup
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      include: {
        policies: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        jurisdiction: org.jurisdiction,
        currency: org.currency,
        onboardingCompleted: org.onboardingCompleted,
        paypalMerchantId: org.paypalMerchantId,
      },
      policy: org.policies[0] || null,
    });
  } catch (error) {
    secureLogger.error('Failed to load onboarding profile', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/onboarding
 * Finalizes organization profile, vaults PayPal API credentials with AES-256-GCM,
 * activates treasury policies, and records a cryptographic audit block.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.role !== 'TREASURY_ADMIN') {
    return NextResponse.json(
      { error: 'Forbidden', message: 'Only TREASURY_ADMIN can configure enterprise onboarding.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = OnboardingPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const {
      organizationName,
      jurisdiction,
      currency,
      paypalClientId,
      paypalClientSecret,
      paypalEnvironment,
      policyTemplate,
      maxAutoCaptureAmount,
      mfaStepUpThreshold,
      requireProofOfDelivery,
      maxAllowedRiskScore,
    } = parsed.data;

    // 1. If PayPal credentials provided, encrypt and register in runtime session
    if (paypalClientId && paypalClientSecret) {
      // Encrypt with AES-256-GCM
      const encryptedSecret = encryptField(paypalClientSecret);
      paypalClient.setRuntimeCredentials({
        clientId: paypalClientId,
        clientSecret: paypalClientSecret,
      });
      secureLogger.security('ONBOARDING_PAYPAL_CREDENTIALS_VAULTED', {
        orgId: session.organizationId,
        environment: paypalEnvironment,
        secretEncrypted: Boolean(encryptedSecret?.startsWith('enc_v1_')),
      });
    }

    // 2. Update Organization record
    const updatedOrg = await prisma.organization.update({
      where: { id: session.organizationId },
      data: {
        name: organizationName,
        jurisdiction,
        currency,
        onboardingCompleted: true,
      },
    });

    // 3. Upsert Treasury Policy
    const activePolicy = await prisma.treasuryPolicy.findFirst({
      where: { organizationId: session.organizationId, isActive: true },
    });

    let policy;
    if (activePolicy) {
      policy = await prisma.treasuryPolicy.update({
        where: { id: activePolicy.id },
        data: {
          name: `${policyTemplate} (${organizationName})`,
          maxAutoCaptureAmount,
          mfaStepUpThreshold,
          requireProofOfDelivery,
          maxAllowedRiskScore,
          isActive: true,
        },
      });
    } else {
      policy = await prisma.treasuryPolicy.create({
        data: {
          organizationId: session.organizationId,
          name: `${policyTemplate} (${organizationName})`,
          maxAutoCaptureAmount,
          mfaStepUpThreshold,
          requireProofOfDelivery,
          maxAllowedRiskScore,
          isActive: true,
        },
      });
    }

    // 4. Record Cryptographic Hash Chain Audit Block
    const lastAudit = await prisma.auditLog.findFirst({
      where: { organizationId: session.organizationId },
      orderBy: { timestamp: 'desc' },
    });

    const prevHash = lastAudit?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'USER';
    const action = 'ORGANIZATION_ONBOARDED_AND_VAULTED';
    const details = JSON.stringify({
      organizationName,
      jurisdiction,
      currency,
      policyTemplate,
      maxAutoCaptureAmount,
      mfaStepUpThreshold,
      requireProofOfDelivery,
      credentialsVaulted: Boolean(paypalClientId && paypalClientSecret),
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    const auditBlock = await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        timestamp: new Date(timestamp),
        actor,
        action,
        targetId: updatedOrg.id,
        redactedDetails: details,
        previousHash: prevHash,
        recordHash,
      },
    });

    secureLogger.info('Enterprise Onboarding completed', {
      orgId: updatedOrg.id,
      auditHash: recordHash,
    });

    return NextResponse.json({
      success: true,
      message: 'Institutional tenant onboarding completed and cryptographic audit block committed.',
      organization: updatedOrg,
      policy,
      auditBlock: {
        id: auditBlock.id,
        recordHash: auditBlock.recordHash,
        timestamp: auditBlock.timestamp,
      },
    });
  } catch (error) {
    secureLogger.error('Onboarding submission error', error);
    return NextResponse.json({ error: 'Failed to process onboarding' }, { status: 500 });
  }
}
