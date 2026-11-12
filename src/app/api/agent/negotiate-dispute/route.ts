import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { executeMultiAgentNegotiation } from '@/lib/agents/negotiator-agent';
import { checkRateLimit } from '@/lib/rate-limit';

const NegotiateSchema = z.object({
  transactionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rateLimit = checkRateLimit(`agent:negotiate:${ip}`, 20, 60000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too Many Requests', message: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = NegotiateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', details: parsed.error.format() }, { status: 400 });
    }

    const result = await executeMultiAgentNegotiation(parsed.data.transactionId, session.organizationId);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: 'Negotiation failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

