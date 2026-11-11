import { URL } from 'url';

// Approved institutional remote host allowlist for delivery proofs and PayPal webhooks
const ALLOWED_HOSTS = new Set([
  'api-m.sandbox.paypal.com',
  'api-m.paypal.com',
  'api.sandbox.paypal.com',
  'api.paypal.com',
  'github.com',
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'paypaldev.github.io',
  'paypal.com',
  'www.paypal.com',
]);

const BLOCKED_IP_PATTERNS = [
  /^127\./, // Loopback
  /^10\./, // Private RFC 1918 Class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private RFC 1918 Class B
  /^192\.168\./, // Private RFC 1918 Class C
  /^169\.254\./, // Link-local / Cloud metadata (AWS, GCP, Azure, DigitalOcean)
  /^0\./, // Current network
  /^::1$/, // IPv6 loopback
  /^fc00:/i, // IPv6 Unique Local
  /^fe80:/i, // IPv6 Link-Local
];

export interface SsrfValidationResult {
  valid: boolean;
  sanitizedUrl?: string;
  reason?: string;
}

/**
 * Validates untrusted URLs against SSRF vulnerabilities
 * @param inputUrl URL string to validate
 * @param customAllowlist optional additional hosts to permit
 */
export function validateSsrfUrl(inputUrl: string, customAllowlist?: string[]): SsrfValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string' };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl.trim());
  } catch {
    return { valid: false, reason: 'Malformed URL format' };
  }

  // 1. Protocol must be strictly HTTPS
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Insecure protocol: only HTTPS is permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Disallow raw IP addresses or blocked IP patterns
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, reason: 'Target resolves to private or metadata IP range' };
    }
  }

  // 3. Reject localhost, 0.0.0.0, or local internal domains
  if (
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.corp')
  ) {
    return { valid: false, reason: 'Loopback and intranet hostnames are blocked' };
  }

  // 4. Check domain allowlist
  const effectiveAllowlist = new Set(ALLOWED_HOSTS);
  if (customAllowlist) {
    customAllowlist.forEach((h) => effectiveAllowlist.add(h.toLowerCase()));
  }

  const isAllowed =
    effectiveAllowlist.has(hostname) ||
    Array.from(effectiveAllowlist).some((allowed) => hostname.endsWith('.' + allowed));

  if (!isAllowed) {
    return {
      valid: false,
      reason: `Host "${hostname}" is not in the certified institutional allowlist`,
    };
  }

  // 5. Reject userinfo in URL (e.g. https://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Embedded credentials in URL are prohibited' };
  }

  return {
    valid: true,
    sanitizedUrl: parsed.toString(),
  };
}
