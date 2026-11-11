import crypto from 'crypto';

// Base32 alphabet for RFC 3548 / RFC 4648
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/**
 * Computes RFC 6238 TOTP token for given secret and counter
 */
export function generateTotp(secretBase32: string, timeStepSeconds = 30, forTimeMs = Date.now()): string {
  const counter = Math.floor(forTimeMs / 1000 / timeStepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));

  const key = base32Decode(secretBase32);
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();

  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Validates a submitted TOTP code with +/- 1 time-step clock drift allowance
 */
export function verifyTotp(submittedToken: string, secretBase32: string): boolean {
  if (!submittedToken || submittedToken.trim().length !== 6) return false;
  const cleanToken = submittedToken.trim();

  // Check current, previous (-30s), and next (+30s) windows
  const now = Date.now();
  for (const offset of [-30000, 0, 30000]) {
    const expected = generateTotp(secretBase32, 30, now + offset);
    if (crypto.timingSafeEqual(Buffer.from(cleanToken), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

/**
 * Convenience helper to return current TOTP code and remaining seconds in time window
 * for institutional step-up MFA testing by judges
 */
export function getDemoMfaCode(secretBase32: string): { code: string; secondsRemaining: number } {
  const now = Date.now();
  const code = generateTotp(secretBase32, 30, now);
  const secondsRemaining = 30 - Math.floor((now / 1000) % 30);
  return { code, secondsRemaining };
}
