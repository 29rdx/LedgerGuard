import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { checkRateLimit } from '@/lib/rate-limit';

const SESSION_COOKIE_NAME = 'lg_session';
const CSRF_COOKIE_NAME = 'lg_csrf';

function getJwtSecretKey(): Uint8Array {
  const envSecret = process.env.JWT_SECRET || 'ledgerguard_super_secure_institutional_jwt_secret_32bytes_min';
  return new TextEncoder().encode(envSecret.padEnd(32, '0'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';

  // 1. Enforce Sliding-Window Rate Limiting
  const isAuthPath = pathname.startsWith('/api/auth');
  const rateLimitKey = `${ip}:${isAuthPath ? 'auth' : 'general'}`;
  const rateLimitMax = isAuthPath ? 25 : 150;
  const rateCheck = checkRateLimit(rateLimitKey, rateLimitMax, 60000);

  if (!rateCheck.success) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please wait before retrying.',
        retryAfter: rateCheck.resetSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': rateCheck.resetSeconds.toString(),
          'X-RateLimit-Limit': rateLimitMax.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. Bypass static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.css')
  ) {
    return NextResponse.next();
  }

  // 3. Construct Security Headers & Strict CSP
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://*.paypal.com https://*.paypalobjects.com https://avatars.githubusercontent.com;
    font-src 'self' data:;
    connect-src 'self' https://api-m.sandbox.paypal.com https://api-m.paypal.com https://api.openai.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
  `
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 4. Public unauthenticated paths
  const isGuestOnlyPage = pathname === '/login';
  const isPublicPage = pathname === '/login' || pathname === '/sandbox-checkout';
  const isPublicApi =
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/magic-link') ||
    pathname.startsWith('/api/auth/me') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname === '/api/paypal/webhooks' ||
    pathname === '/api/security/verify-all' ||
    pathname === '/api/chat' ||
    pathname === '/api/automation/audit-cron';

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let verifiedPayload: Record<string, unknown> | null = null;

  if (sessionToken) {
    try {
      const { payload } = await jwtVerify(sessionToken, getJwtSecretKey());
      verifiedPayload = payload;
    } catch {
      // Invalid or expired token
    }
  }

  // 5. Double-Submit CSRF Protection on mutating API routes
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (
    pathname.startsWith('/api/') &&
    mutatingMethods.includes(request.method) &&
    pathname !== '/api/auth/login' &&
    !pathname.startsWith('/api/auth/magic-link') &&
    pathname !== '/api/auth/logout' &&
    pathname !== '/api/paypal/webhooks' && // PayPal webhooks authenticate via transmission headers
    pathname !== '/api/automation/audit-cron' && // Cron automation authenticates via CRON_SECRET Bearer token
    !pathname.includes('/simulate-approval') // Simulated sandbox buyer approval execution
  ) {
    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const csrfHeader = request.headers.get('x-csrf-token');
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const isSameOrigin = !origin || (host && origin.includes(host));

    // Strict Double-Submit verification when both are present
    if (csrfCookie && csrfHeader) {
      if (csrfCookie !== csrfHeader) {
        return new NextResponse(
          JSON.stringify({
            error: 'Forbidden',
            message: 'CSRF token mismatch. Request blocked by Double-Submit CSRF defense.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (!isSameOrigin) {
      // Non-same-origin mutating requests must provide valid double-submit CSRF headers
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: 'CSRF token mismatch or missing. Request blocked by Double-Submit CSRF defense.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 6. Access Control & Route Protection
  if (!verifiedPayload && !isPublicPage && !isPublicApi) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and visiting /login, redirect to /
  if (verifiedPayload && isGuestOnlyPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 7. Server-Side RBAC Enforcement on Mutating Routes
  if (
    verifiedPayload &&
    pathname.startsWith('/api/') &&
    mutatingMethods.includes(request.method)
  ) {
    const role = verifiedPayload.role as string;
    const isSensitiveMutation =
      pathname.includes('/capture') ||
      pathname.includes('/refund') ||
      pathname.includes('/upload-proof');

    if (isSensitiveMutation && role === 'AUDITOR') {
      return new NextResponse(
        JSON.stringify({
          error: 'Forbidden',
          message: 'RBAC Authorization Failure: The AUDITOR role does not possess write privileges for treasury disbursements.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 8. Generate response with CSP & Security Headers
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Strict CORS on API routes
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (origin && host && origin.includes(host)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token');
    }
  }

  // Ensure Double-Submit CSRF cookie is initialized for client scripts
  if (!request.cookies.get(CSRF_COOKIE_NAME)) {
    const isProd = process.env.NODE_ENV === 'production';
    const autoCsrf = 'csrf_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    response.cookies.set(CSRF_COOKIE_NAME, autoCsrf, {
      httpOnly: false,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 3600,
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
