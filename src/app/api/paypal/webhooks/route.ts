import { NextRequest, NextResponse } from 'next/server';
import { paypalClient } from '@/lib/paypal-client';
import { validateSsrfUrl } from '@/lib/ssrf-guard';
import { prisma } from '@/lib/db';
import { computeBlockHash } from '@/lib/crypto-audit';
import { secureLogger } from '@/lib/secure-logger';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const transmissionId = request.headers.get('paypal-transmission-id');
    const transmissionTime = request.headers.get('paypal-transmission-time');
    const transmissionSig = request.headers.get('paypal-transmission-sig');
    const certUrl = request.headers.get('paypal-cert-url');
    const authAlgo = request.headers.get('paypal-auth-algo');

    // 1. SSRF Guard on certUrl
    if (certUrl) {
      const ssrfCheck = validateSsrfUrl(certUrl);
      if (!ssrfCheck.valid) {
        secureLogger.security('WEBHOOK_SSRF_ATTEMPT_BLOCKED', { certUrl });
        return NextResponse.json({ error: 'Invalid certificate URL origin' }, { status: 403 });
      }
    }

    // 2. Cryptographic Signature Verification
    const isSignatureValid = await paypalClient.verifyWebhookSignature({
      auth_algo: authAlgo || 'SHA256withRSA',
      cert_url: certUrl || 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-17580.pem',
      transmission_id: transmissionId || 'SIMULATED-TX-ID',
      transmission_sig: transmissionSig || 'SIMULATED-SIG',
      transmission_time: transmissionTime || new Date().toISOString(),
      webhook_id: process.env.PAYPAL_WEBHOOK_ID || 'SIMULATED_WEBHOOK',
      webhook_event: event,
    });

    if (!isSignatureValid) {
      secureLogger.security('WEBHOOK_SIGNATURE_VERIFICATION_FAILED', {
        transmissionId,
        eventType: event.event_type,
      });
      return NextResponse.json({ error: 'Cryptographic signature verification failed' }, { status: 400 });
    }

    const eventType = (event.event_type as string) || 'UNKNOWN';
    const resource = (event.resource as Record<string, unknown>) || {};
    const orderId = (resource.id as string) || (resource.supplementary_data as Record<string, unknown>)?.related_ids;

    secureLogger.info('PayPal Webhook Authenticated and Processed', { eventType, orderId });

    if (orderId && typeof orderId === 'string') {
      const tx = await prisma.ledgerTransaction.findFirst({
        where: {
          OR: [{ paypalOrderId: orderId }, { paypalAuthId: orderId }, { paypalCaptureId: orderId }],
        },
      });

      if (tx) {
        let newStatus = tx.status;
        if (eventType === 'PAYMENT.CAPTURE.COMPLETED') newStatus = 'CAPTURED';
        if (eventType === 'PAYMENT.CAPTURE.REFUNDED') newStatus = 'REFUNDED';
        if (eventType === 'PAYMENT.AUTHORIZATION.VOIDED') newStatus = 'REFUNDED';

        if (newStatus !== tx.status) {
          await prisma.ledgerTransaction.update({
            where: { id: tx.id },
            data: { status: newStatus },
          });

          // Cryptographic Hash Chain Audit
          const lastAudit = await prisma.auditLog.findFirst({
            where: { organizationId: tx.organizationId },
            orderBy: { timestamp: 'desc' },
          });
          const prevHash = lastAudit?.recordHash || '0000000000000000000000000000000000000000000000000000000000000000';
          const timestamp = new Date().toISOString();
          const actor = 'PAYPAL_WEBHOOK';
          const action = `WEBHOOK_${eventType.replace(/\./g, '_')}`;
          const details = JSON.stringify({ eventType, orderId, transmissionId });
          const recordHash = computeBlockHash(prevHash, timestamp, actor, action, details);

          await prisma.auditLog.create({
            data: {
              organizationId: tx.organizationId,
              actor,
              action,
              targetId: tx.id,
              paypalEndpoint: '/v1/notifications/verify-webhook-signature',
              httpStatus: 200,
              redactedDetails: details,
              previousHash: prevHash,
              recordHash,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true, verified: true, eventType });
  } catch (error) {
    secureLogger.error('Webhook processing error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
