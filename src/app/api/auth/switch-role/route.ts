import { NextRequest, NextResponse } from 'next/server';
import { getSession, signSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const newRole = body.role === 'AUDITOR' ? 'AUDITOR' : 'TREASURY_ADMIN';

  // Update in user record
  await prisma.user.update({
    where: { id: session.userId },
    data: { role: newRole },
  });

  const updatedSession = {
    ...session,
    role: newRole as 'TREASURY_ADMIN' | 'AUDITOR',
  };

  const newJwt = await signSessionToken(updatedSession);

  const response = NextResponse.json({
    success: true,
    user: updatedSession,
    message: `Active RBAC role switched to ${newRole}`,
  });

  response.cookies.set(SESSION_COOKIE_NAME, newJwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 3600,
  });

  return response;
}

