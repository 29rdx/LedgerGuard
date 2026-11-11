import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { agentEngine } from '@/lib/agent-engine';
import { checkRateLimit } from '@/lib/rate-limit';

const CommandSchema = z.object({
  prompt: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting for AI queries
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rateLimit = checkRateLimit(`agent:${ip}`, 30, 60000);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too Many Requests', message: 'AI rate limit exceeded.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = CommandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid command prompt' }, { status: 400 });
    }

    const directive = await agentEngine.processCommand(parsed.data.prompt);
    return NextResponse.json({ success: true, directive });
  } catch {
    return NextResponse.json({ error: 'Failed to process AI agent command' }, { status: 500 });
  }
}

