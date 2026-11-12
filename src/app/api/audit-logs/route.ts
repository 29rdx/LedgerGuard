import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTenantDb } from '@/lib/db';
import { verifyAuditLogChain } from '@/lib/crypto-audit';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const verify = searchParams.get('verify') === 'true';

  if (verify) {
    const report = await verifyAuditLogChain(session.organizationId);
    return NextResponse.json({ report });
  }

  const tenantDb = getTenantDb(session.organizationId);
  const logs = await tenantDb.auditLogs.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100,
  });

  return NextResponse.json({ logs });
}
