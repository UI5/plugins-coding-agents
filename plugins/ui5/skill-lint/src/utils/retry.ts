/**
 * Retry Utilities
 * Provides exponential backoff retry logic for file system operations
 * 
 * Handles transient errors:
 * - EMFILE (too many open files)
 * - EBUSY (resource busy)
 * - EACCES (permission denied - temporary)
 * - EAGAIN (resource temporarily unavailable)
 * - ENFILE (file table overflow)
 */

/**
 * Error codes that should trigger a retry
 */
const RETRYABLE_ERROR_CODES = new Set([
  'EMFILE',   // Too many open files
  'EBUSY',    // Resource busy or locked
  'EACCES',   // Permission denied (may be temporary)
  'EAGAIN',   // Resource temporarily unavailable
  'ENFILE',   // File table overflow
  'EPERM',    // Operation not permitted (may be temporary)
]);

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as NodeJS.ErrnoException;
  return err.code ? RETRYABLE_ERROR_CODES.has(err.code) : false;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 100) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 5000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Calculate delay for next retry using exponential backoff
 * 
 * Formula: delay = min(initialDelay * (backoffMultiplier ^ attempt), maxDelay)
 * With jitter: delay = delay * (0.5 + random(0, 0.5))
 */
function calculateDelay(
  attempt: number,
  config: Required<RetryConfig>
): number {
  const { initialDelay, maxDelay, backoffMultiplier, jitter } = config;
  
  // Exponential backoff: 100ms, 200ms, 400ms, 800ms, etc.
  let delay = Math.min(
    initialDelay * Math.pow(backoffMultiplier, attempt),
    maxDelay
  );

  // Add jitter to prevent thundering herd
  // Randomly reduce delay by 0-50% to spread out retries
  if (jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @param operation - The async function to retry
 * @param config - Retry configuration
 * @returns Result of the operation
 * @throws Error if all retries are exhausted or error is not retryable
 * 
 * @example
 * ```typescript
 * const data = await retryOperation(
 *   () => readFile('file.txt', 'utf-8'),
 *   { maxRetries: 3, initialDelay: 100 }
 * );
 * ```
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= fullConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // If we've exhausted retries, throw
      if (attempt >= fullConfig.maxRetries) {
        throw error;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(attempt, fullConfig);
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Retry a synchronous operation (wraps in Promise)
 * 
 * @param operation - The sync function to retry
 * @param config - Retry configuration
 * @returns Result of the operation
 */
export async function retrySyncOperation<T>(
  operation: () => T,
  config: RetryConfig = {}
): Promise<T> {
  return retryOperation(() => Promise.resolve(operation()), config);
}

/**
 * Create a retryable version of an async function
 * 
 * @param fn - The async function to make retryable
 * @param config - Retry configuration
 * @returns A new function with automatic retry logic
 * 
 * @example
 * ```typescript
 * const retryableReadFile = withRetry(
 *   (path: string) => readFile(path, 'utf-8'),
 *   { maxRetries: 3 }
 * );
 * const data = await retryableReadFile('file.txt');
 * ```
 */
export function withRetry<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  config: RetryConfig = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs) => {
    return retryOperation(() => fn(...args), config);
  };
}
