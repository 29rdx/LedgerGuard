import { NextResponse } from 'next/server';
import { paypalClient } from '@/lib/paypal-client';

export async function GET() {
  const status = await paypalClient.checkConnectionStatus();
  return NextResponse.json(status);
}
