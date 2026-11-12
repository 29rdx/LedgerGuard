import { NextRequest } from 'next/server';
import { sseBroadcaster } from '@/lib/sse-broadcaster';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection greeting
      controller.enqueue(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            status: 'CONNECTED',
            org: session.organizationName,
            time: new Date().toISOString(),
          })}\n\n`
        )
      );

      // Subscribe to live broadcast events
      const unsubscribe = sseBroadcaster.subscribe((data) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          unsubscribe();
        }
      });

      // Keep-alive heartbeat every 20 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: ping\ndata: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeatInterval);
          unsubscribe();
        }
      }, 20000);

      // Clean up on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform, no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
