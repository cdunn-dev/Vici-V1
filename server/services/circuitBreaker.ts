import { logger } from '../utils/logger';

export enum CircuitState {
  CLOSED = 'CLOSED',    // Normal operation, requests flow through
  OPEN = 'OPEN',        // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN' // Testing if the service has recovered
}

export interface CircuitBreakerOptions {
  failureThreshold: number;      // Number of failures before opening the circuit
  resetTimeout: number;          // Time in ms to wait before attempting to reset
  halfOpenTimeout: number;       // Time in ms to wait in half-open state
  monitorInterval: number;       // Interval in ms to check circuit state
}

export class CircuitBreaker {
  private static instance: CircuitBreaker;
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private monitorInterval: NodeJS.Timeout | null = null;
  
  private readonly options: CircuitBreakerOptions = {
    failureThreshold: 5,         // 5 failures before opening
    resetTimeout: 30000,         // 30 seconds before attempting reset
    halfOpenTimeout: 5000,       // 5 seconds in half-open state
    monitorInterval: 10000       // Check every 10 seconds
  };

  private constructor() {
    this.startMonitoring();
  }

  public static getInstance(): CircuitBreaker {
    if (!CircuitBreaker.instance) {
      CircuitBreaker.instance = new CircuitBreaker();
    }
    return CircuitBreaker.instance;
  }

  public configure(options: Partial<CircuitBreakerOptions>): void {
    this.options = { ...this.options, ...options };
    logger.info('Circuit breaker configured with options:', this.options);
  }

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.lastSuccessTime = Date.now();
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed();
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === CircuitState.CLOSED && this.failureCount >= this.options.failureThreshold) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    }
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.options.resetTimeout;
  }

  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    logger.warn('Circuit breaker transitioned to OPEN state');
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    logger.info('Circuit breaker transitioned to HALF-OPEN state');
    
    // Set a timeout to transition back to OPEN if no successful requests
    setTimeout(() => {
      if (this.state === CircuitState.HALF_OPEN) {
        this.transitionToOpen();
      }
    }, this.options.halfOpenTimeout);
  }

  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    logger.info('Circuit breaker transitioned to CLOSED state');
  }

  private startMonitoring(): void {
    this.monitorInterval = setInterval(() => {
      this.checkCircuitState();
    }, this.options.monitorInterval);
  }

  private checkCircuitState(): void {
    const now = Date.now();
    
    // Log circuit state periodically
    logger.debug('Circuit breaker state:', {
      state: this.state,
      failureCount: this.failureCount,
      timeSinceLastFailure: now - this.lastFailureTime,
      timeSinceLastSuccess: now - this.lastSuccessTime
    });
    
    // Auto-reset if in OPEN state for too long
    if (this.state === CircuitState.OPEN && this.shouldAttemptReset()) {
      this.transitionToHalfOpen();
    }
  }

  public getState(): CircuitState {
    return this.state;
  }

  public getStats(): {
    state: CircuitState;
    failureCount: number;
    lastFailureTime: number;
    lastSuccessTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime
    };
  }

  public stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
} 