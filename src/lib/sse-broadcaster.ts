export type SSEEventType =
  | 'TRANSACTION_UPDATED'
  | 'TRANSACTION_CREATED'
  | 'WEBHOOK_RECEIVED'
  | 'DISPUTE_RESOLVED'
  | 'PING';

export interface SSEMessagePayload {
  type: SSEEventType;
  transaction?: any;
  event?: string;
  orderId?: string;
  timestamp: string;
  details?: string;
}

type SSEClientCallback = (data: string) => void;

class SSEBroadcaster {
  private clients: Set<SSEClientCallback> = new Set();

  /**
   * Subscribes a new SSE client connection
   */
  public subscribe(callback: SSEClientCallback): () => void {
    this.clients.add(callback);

    // Send initial ping
    try {
      callback(`event: ping\ndata: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`);
    } catch {
      this.clients.delete(callback);
    }

    return () => {
      this.clients.delete(callback);
    };
  }

  /**
   * Broadcasts an event to all active SSE subscribers
   */
  public broadcast(payload: SSEMessagePayload): void {
    const message = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.clients) {
      try {
        client(message);
      } catch {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Returns current count of connected clients
   */
  public getSubscriberCount(): number {
    return this.clients.size;
  }
}

// Global singleton to persist across hot reloads in development
const globalForSSE = globalThis as unknown as { sseBroadcaster: SSEBroadcaster | undefined };

export const sseBroadcaster = globalForSSE.sseBroadcaster ?? new SSEBroadcaster();

if (process.env.NODE_ENV !== 'production') {
  globalForSSE.sseBroadcaster = sseBroadcaster;
}

