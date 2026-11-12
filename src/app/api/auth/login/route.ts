import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  signSessionToken,
  verifyPassword,
  generateCsrfToken,
  SESSION_COOKIE_NAME,
  CSRF_COOKIE_NAME,
} from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { secureLogger } from '@/lib/secure-logger';
import { computeBlockHash } from '@/lib/crypto-audit';
import { verifyTotp, getDemoMfaCode } from '@/lib/mfa';

const LoginSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  totpCode: z.string().optional(),
  ephemeralJudge: z.boolean().optional(),
  role: z.enum(['TREASURY_ADMIN', 'AUDITOR']).optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  // 1. IP Rate Limiting (10 attempts per minute)
  const rateLimit = checkRateLimit(`login:${ip}`, 10, 60000);
  if (!rateLimit.success) {
    secureLogger.security('LOGIN_RATE_LIMITED', { ip });
    return NextResponse.json(
      { error: 'Too Many Requests', message: 'Too many login attempts. Please wait 1 minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', details: parsed.error.format() }, { status: 400 });
    }

    const { email, password, totpCode, ephemeralJudge, role } = parsed.data;

    interface TargetUser {
      id: string;
      email: string;
      name: string;
      role: 'TREASURY_ADMIN' | 'AUDITOR';
      passwordHash: string;
      mfaEnabled: boolean;
      mfaSecret: string;
      organizationId: string;
      organization: { id: string; name: string };
    }

    let targetUser: TargetUser | null = null;

    // A. 1-Click Ephemeral Sandbox Judge Session Provisioning
    if (ephemeralJudge) {
      const selectedRole = role || 'TREASURY_ADMIN';
      const targetEmail = selectedRole === 'TREASURY_ADMIN' ? 'treasury@apexcapital.io' : 'auditor@apexcapital.io';

      const found = await prisma.user.findUnique({
        where: { email: targetEmail },
        include: { organization: true },
      });

      if (!found) {
        return NextResponse.json({ error: 'Seed data not loaded. Please run npm run db:seed' }, { status: 500 });
      }

      targetUser = found as unknown as TargetUser;
      secureLogger.security('EPHEMERAL_JUDGE_SESSION_PROVISIONED', { email: targetEmail, role: selectedRole, ip });
    }
    // B. Standard Institutional Credential Authentication
    else {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      const found = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: { organization: true },
      });

      if (!found) {
        secureLogger.security('LOGIN_FAILED_UNKNOWN_USER', { email, ip });
        return NextResponse.json({ error: 'Invalid institutional credentials' }, { status: 401 });
      }

      const passwordValid = await verifyPassword(password, found.passwordHash);
      if (!passwordValid) {
        secureLogger.security('LOGIN_FAILED_BAD_PASSWORD', { email, ip });
        return NextResponse.json({ error: 'Invalid institutional credentials' }, { status: 401 });
      }

      // Check MFA requirement
      if (found.mfaEnabled) {
        if (!totpCode) {
          const demoMfa = getDemoMfaCode(found.mfaSecret);
          return NextResponse.json({
            requiresMfa: true,
            email: found.email,
            message: 'TOTP 6-digit challenge required for enterprise compliance.',
            demoCode: demoMfa.code,
            secondsRemaining: demoMfa.secondsRemaining,
          });
        }

        const validTotp = verifyTotp(totpCode, found.mfaSecret);
        if (!validTotp) {
          secureLogger.security('LOGIN_MFA_FAILED', { email: found.email, ip });
          return NextResponse.json(
            { error: 'Invalid MFA verification code', message: 'The 6-digit TOTP code is incorrect or expired.' },
            { status: 401 }
          );
        }
      }

      targetUser = found as unknown as TargetUser;
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // 2. Sign JWT Session Token
    const sessionToken = await signSessionToken({
      userId: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetUser.role,
      organizationId: targetUser.organization.id,
      organizationName: targetUser.organization.name,
    });

    // 3. Generate Double-Submit CSRF Token
    const csrfToken = generateCsrfToken();

    // 4. Log to Audit Trail
    const lastAudit = await prisma.auditLog.findFirst({
      where: { organizationId: targetUser.organization.id },
      orderBy: { timestamp: 'desc' },
    });

    const prevHash = lastAudit?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
    const timestamp = new Date().toISOString();
    const actor = 'USER';
    const action = 'USER_AUTHENTICATED';
    const details = JSON.stringify({
      email: targetUser.email,
      role: targetUser.role,
      method: ephemeralJudge ? 'EPHEMERAL_DEMO' : 'PASSWORD_BCRYPT',
      ip,
    });
    const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

    await prisma.auditLog.create({
      data: {
        organizationId: targetUser.organization.id,
        timestamp: new Date(timestamp),
        actor,
        action,
        targetId: targetUser.id,
        redactedDetails: details,
        previousHash: prevHash,
        recordHash,
      },
    });

    // 5. Construct Response with HttpOnly, Secure Cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        organizationId: targetUser.organization.id,
        organizationName: targetUser.organization.name,
      },
      csrfToken,
    });

    const isProd = process.env.NODE_ENV === 'production';

    // Session Cookie (HttpOnly, SameSite=Strict)
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 3600, // 8 hours
    });

    // CSRF Cookie (SameSite=Strict)
    response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // Accessible to script for x-csrf-token header matching
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 3600,
    });

    return response;
  } catch (error) {
    secureLogger.error('Login error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
