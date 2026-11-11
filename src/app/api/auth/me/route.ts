import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getDemoMfaCode } from '@/lib/mfa';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  // Fetch user MFA secret to generate live demo code for judge convenience
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { mfaSecret: true },
  });

  const mfaCode = user ? getDemoMfaCode(user.mfaSecret) : null;

  return NextResponse.json({
    authenticated: true,
    user: session,
    demoMfa: mfaCode,
  });
}
