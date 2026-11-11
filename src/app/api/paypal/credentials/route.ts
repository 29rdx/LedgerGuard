import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { paypalClient } from '@/lib/paypal-client';

const CredentialsSchema = z.object({
  clientId: z.string().min(5),
  clientSecret: z.string().min(5),
  webhookId: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creds = paypalClient.getActiveCredentials();
  const maskedId = creds.clientId
    ? `${creds.clientId.slice(0, 8)}...${creds.clientId.slice(-4)}`
    : 'Not configured';

  return NextResponse.json({
    hasCredentials: paypalClient.hasLiveCredentials(),
    maskedClientId: maskedId,
    webhookIdConfigured: Boolean(creds.webhookId),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = CredentialsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation Error', details: parsed.error.format() }, { status: 400 });
    }

    paypalClient.setRuntimeCredentials({
      clientId: parsed.data.clientId,
      clientSecret: parsed.data.clientSecret,
      webhookId: parsed.data.webhookId,
    });

    const status = await paypalClient.checkConnectionStatus();

    return NextResponse.json({
      success: true,
      status,
      message: 'Runtime credentials applied and verified.',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to apply credentials', details: String(error) }, { status: 500 });
  }
}
