/**
 * Concurrency control utilities for rate limit handling
 * 
 * These utilities allow limiting concurrent operations to prevent:
 * - API rate limit errors
 * - Resource exhaustion (too many open connections/files)
 * - Memory pressure from parallel processing
 */

/**
 * Execute promises in batches with controlled concurrency.
 * 
 * Instead of running all promises at once (Promise.all), this executes
 * them in batches of `maxConcurrency` to prevent overwhelming APIs or resources.
 * 
 * @param tasks - Array of functions that return promises
 * @param maxConcurrency - Maximum number of concurrent promises (default: Infinity = no limit)
 * @returns Promise that resolves when all tasks complete, with results in original order
 * 
 * @example
 * ```typescript
 * // Limit to 3 concurrent API calls
 * const results = await promiseAllBatched(
 *   urls.map(url => () => fetch(url)),
 *   3
 * );
 * ```
 */
export async function promiseAllBatched<T>(
  tasks: Array<() => Promise<T>>,
  maxConcurrency: number = Infinity
): Promise<T[]> {
  // Fast path: no concurrency limit
  if (maxConcurrency === Infinity || maxConcurrency >= tasks.length) {
    return Promise.all(tasks.map(task => task()));
  }

  const results: T[] = new Array(tasks.length);
  let currentIndex = 0;

  // Worker function that processes tasks from the queue
  async function worker(): Promise<void> {
    while (currentIndex < tasks.length) {
      const index = currentIndex++;
      const task = tasks[index];
      results[index] = await task();
    }
  }

  // Create pool of concurrent workers
  const workers = Array.from(
    { length: Math.min(maxConcurrency, tasks.length) },
    () => worker()
  );

  // Wait for all workers to complete
  await Promise.all(workers);

  return results;
}

/**
 * Rate limiter for API calls
 * 
 * Ensures minimum delay between successive calls to prevent rate limit errors.
 * Uses token bucket algorithm for burst tolerance.
 * 
 * @example
 * ```typescript
 * const limiter = new RateLimiter(10, 1000); // 10 calls per second
 * 
 * for (const url of urls) {
 *   await limiter.acquire();
 *   await fetch(url);
 * }
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  /**
   * @param maxTokens - Maximum number of tokens (burst capacity)
   * @param refillIntervalMs - Time to refill one token (ms)
   */
  constructor(
    private readonly maxTokens: number,
    private readonly refillIntervalMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    while (true) {
      this.refillTokens();

      if (this.tokens > 0) {
        this.tokens--;
        return;
      }

      // Wait for next token refill
      const waitTime = this.refillIntervalMs;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillIntervalMs);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}
