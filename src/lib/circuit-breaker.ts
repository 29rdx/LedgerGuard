import { secureLogger } from './secure-logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number; // consecutive failures to trip circuit (default: 3)
  recoveryTimeoutMs?: number; // ms to wait before moving from OPEN to HALF_OPEN (default: 30,000ms)
  callTimeoutMs?: number; // per-call timeout (default: 5,000ms)
}

export class CircuitBreakerOpenException extends Error {
  constructor(public readonly serviceName: string, message?: string) {
    super(message || `Circuit breaker for service '${serviceName}' is OPEN. Failing fast to fallback.`);
    this.name = 'CircuitBreakerOpenException';
  }
}

export class CircuitBreaker {
  public readonly name: string;
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly recoveryTimeoutMs: number;
  private readonly callTimeoutMs: number;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 3;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs ?? 30000;
    this.callTimeoutMs = options.callTimeoutMs ?? 5000;
  }

  public getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  public isDegraded(): boolean {
    return this.getState() !== 'CLOSED';
  }

  private evaluateState(): void {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        secureLogger.info(`[CIRCUIT_BREAKER] Service '${this.name}' transitioned from OPEN to HALF_OPEN probe state.`);
      }
    }
  }

  /**
   * Executes target asynchronous network operation with timeout, failure tracking,
   * and automatic failover.
   */
  public async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T> | T
  ): Promise<T> {
    this.evaluateState();

    if (this.state === 'OPEN') {
      secureLogger.warn(
        `[CIRCUIT_BREAKER] Fast-failing call to '${this.name}'. Consecutive failures: ${this.consecutiveFailures}. State: OPEN.`
      );
      if (fallback) {
        return fallback();
      }
      throw new CircuitBreakerOpenException(this.name);
    }

    // Wrap operation in timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject(new Error(`Timeout: Service '${this.name}' failed to respond within ${this.callTimeoutMs}ms`));
      }, this.callTimeoutMs);
      if (id.unref) id.unref();
    });

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      if (fallback) {
        secureLogger.info(`[CIRCUIT_BREAKER] Executing graceful degradation fallback for '${this.name}'.`);
        return fallback();
      }
      throw error;
    }
  }

  private recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      secureLogger.info(`[CIRCUIT_BREAKER] Service '${this.name}' successfully recovered. State: CLOSED.`);
    }
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  private recordFailure(error: unknown): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    secureLogger.error(
      `[CIRCUIT_BREAKER] Service '${this.name}' failed (${this.consecutiveFailures}/${this.failureThreshold}).`,
      error
    );

    if (this.consecutiveFailures >= this.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      secureLogger.security('CIRCUIT_BREAKER_TRIPPED', {
        service: this.name,
        consecutiveFailures: this.consecutiveFailures,
        state: 'OPEN',
        recoveryTimeoutMs: this.recoveryTimeoutMs,
      });
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }
}

// Pre-configured Singletons for External Dependencies
export const paypalCircuitBreaker = new CircuitBreaker({
  name: 'PayPal_REST_API',
  failureThreshold: 3,
  recoveryTimeoutMs: 30000,
  callTimeoutMs: 6000,
});

export const aiCircuitBreaker = new CircuitBreaker({
  name: 'OpenAI_LLM_API',
  failureThreshold: 3,
  recoveryTimeoutMs: 30000,
  callTimeoutMs: 4000,
});

