import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { AuthJwtPayload, UserSession } from '@/types';

const BCRYPT_SALT_ROUNDS = 12;
const SESSION_COOKIE_NAME = 'lg_session';
const CSRF_COOKIE_NAME = 'lg_csrf';

// In-memory fallback high-entropy 64-byte secret for ephemeral local/sandbox runs
let ephemeralSecret: Uint8Array | null = null;

function getJwtSecretKey(): Uint8Array {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.trim().length >= 32) {
    return new TextEncoder().encode(envSecret.trim());
  }

  if (process.env.NODE_ENV === 'production' && !envSecret) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing or less than 32 characters in production.');
  }

  // Cryptographically secure ephemeral fallback
  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(64);
    console.warn('[SECURITY] Generated ephemeral 64-byte high-entropy JWT secret for sandbox execution.');
  }
  return ephemeralSecret;
}

/**
 * Signs an institutional session JWT with HS256 algorithm and 8-hour expiration.
 */
export async function signSessionToken(session: UserSession): Promise<string> {
  const secret = getJwtSecretKey();
  return new SignJWT({
    sub: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    organizationId: session.organizationId,
    organizationName: session.organizationName,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(secret);
}

/**
 * Verifies a JWT token and returns the typed payload.
 */
export async function verifySessionToken(token: string): Promise<AuthJwtPayload | null> {
  try {
    const secret = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    return payload as unknown as AuthJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Hash password with bcrypt cost 12
 */
export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(plainText, salt);
}

/**
 * Compare password with bcrypt
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

/**
 * Generates a cryptographically random CSRF token (32 bytes hex)
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Constant-time string comparison preventing timing side-channel attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      crypto.timingSafeEqual(bufA, bufA);
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Validates double-submit CSRF token against header and cookie
 */
export function validateCsrfToken(cookieToken: string | undefined, headerToken: string | null): boolean {
  if (!cookieToken || !headerToken) return false;
  return constantTimeCompare(cookieToken, headerToken);
}

/**
 * Server-side helper to read and verify current user session from HttpOnly cookie
 * or explicit token parameter
 */
export async function getSession(explicitToken?: string): Promise<UserSession | null> {
  try {
    let token = explicitToken;
    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      } catch {
        // Outside Next.js request async storage (e.g. unit/pen testing)
      }
    }
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
    };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME };

