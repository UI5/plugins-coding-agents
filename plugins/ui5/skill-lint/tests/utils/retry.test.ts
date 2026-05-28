/**
 * Tests for Retry Utilities
 * Critical testing for exponential backoff and retry logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  retryOperation,
  retrySyncOperation,
  withRetry,
  type RetryConfig,
} from '../../src/utils/retry.js';

describe('Retry Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('retryOperation', () => {
    describe('Success Cases', () => {
      it('should return result on first success', async () => {
        const operation = vi.fn().mockResolvedValue('success');
        
        const result = await retryOperation(operation);
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should work with complex return types', async () => {
        const data = { id: 1, name: 'test', nested: { value: 42 } };
        const operation = vi.fn().mockResolvedValue(data);
        
        const result = await retryOperation(operation);
        
        expect(result).toEqual(data);
      });
    });

    describe('Retryable Errors', () => {
      it('should retry on EMFILE error', async () => {
        const error = new Error('Too many open files') as NodeJS.ErrnoException;
        error.code = 'EMFILE';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const promise = retryOperation(operation, { initialDelay: 100 });
        
        // Fast-forward through retries
        await vi.advanceTimersByTimeAsync(100);
        await vi.advanceTimersByTimeAsync(200);
        
        const result = await promise;
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(3);
      });

      it('should retry on EBUSY error', async () => {
        const error = new Error('Resource busy') as NodeJS.ErrnoException;
        error.code = 'EBUSY';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const promise = retryOperation(operation, { initialDelay: 100 });
        await vi.advanceTimersByTimeAsync(100);
        
        const result = await promise;
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(2);
      });

      it('should retry on EACCES error', async () => {
        const error = new Error('Permission denied') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const promise = retryOperation(operation, { initialDelay: 100 });
        await vi.advanceTimersByTimeAsync(100);
        
        const result = await promise;
        
        expect(result).toBe('success');
      });

      it('should retry on EAGAIN error', async () => {
        const error = new Error('Resource temporarily unavailable') as NodeJS.ErrnoException;
        error.code = 'EAGAIN';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const promise = retryOperation(operation, { initialDelay: 100 });
        await vi.advanceTimersByTimeAsync(100);
        
        const result = await promise;
        
        expect(result).toBe('success');
      });

      it('should retry on ENFILE error', async () => {
        const error = new Error('File table overflow') as NodeJS.ErrnoException;
        error.code = 'ENFILE';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const promise = retryOperation(operation, { initialDelay: 100 });
        await vi.advanceTimersByTimeAsync(100);
        
        const result = await promise;
        
        expect(result).toBe('success');
      });

      it('should retry on EPERM error', async () => {
        const error = new Error('Operation not permitted') as NodeJS.ErrnoException;
        error.code = 'EPERM';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const promise = retryOperation(operation, { initialDelay: 100 });
        await vi.advanceTimersByTimeAsync(100);
        
        const result = await promise;
        
        expect(result).toBe('success');
      });
    });

    describe('Non-Retryable Errors', () => {
      it('should NOT retry on ENOENT error', async () => {
        const error = new Error('File not found') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        
        const operation = vi.fn().mockRejectedValue(error);

        await expect(retryOperation(operation)).rejects.toThrow('File not found');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should NOT retry on EISDIR error', async () => {
        const error = new Error('Is a directory') as NodeJS.ErrnoException;
        error.code = 'EISDIR';
        
        const operation = vi.fn().mockRejectedValue(error);

        await expect(retryOperation(operation)).rejects.toThrow('Is a directory');
        expect(operation).toHaveBeenCalledTimes(1);
      });

      it('should NOT retry on generic errors', async () => {
        const error = new Error('Generic error');
        
        const operation = vi.fn().mockRejectedValue(error);

        await expect(retryOperation(operation)).rejects.toThrow('Generic error');
        expect(operation).toHaveBeenCalledTimes(1);
      });
    });

    describe('Exponential Backoff', () => {
      it('should use exponential backoff (100ms, 200ms, 400ms)', async () => {
        const error = new Error('EMFILE') as NodeJS.ErrnoException;
        error.code = 'EMFILE';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockRejectedValueOnce(error)
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const config: RetryConfig = {
          maxRetries: 3,
          initialDelay: 100,
          backoffMultiplier: 2,
          jitter: false, // Disable jitter for predictable testing
        };

        const promise = retryOperation(operation, config);
        
        // First retry after 100ms
        await vi.advanceTimersByTimeAsync(100);
        // Second retry after 200ms
        await vi.advanceTimersByTimeAsync(200);
        // Third retry after 400ms
        await vi.advanceTimersByTimeAsync(400);
        
        const result = await promise;
        
        expect(result).toBe('success');
        expect(operation).toHaveBeenCalledTimes(4);
      });

      it('should respect maxDelay cap', async () => {
        const error = new Error('EMFILE') as NodeJS.ErrnoException;
        error.code = 'EMFILE';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const config: RetryConfig = {
          maxRetries: 2,
          initialDelay: 1000,
          maxDelay: 1500,
          backoffMultiplier: 2,
          jitter: false,
        };

        const promise = retryOperation(operation, config);
        
        // First retry: 1000ms
        await vi.advanceTimersByTimeAsync(1000);
        // Second retry: capped at 1500ms (not 2000ms)
        await vi.advanceTimersByTimeAsync(1500);
        
        const result = await promise;
        
        expect(result).toBe('success');
      });

      it('should add jitter when enabled', async () => {
        const error = new Error('EMFILE') as NodeJS.ErrnoException;
        error.code = 'EMFILE';
        
        const operation = vi.fn()
          .mockRejectedValueOnce(error)
          .mockResolvedValue('success');

        const config: RetryConfig = {
          maxRetries: 1,
          initialDelay: 100,
          jitter: true,
        };

        // Mock Math.random to return predictable value
        const originalRandom = Math.random;
        Math.random = vi.fn().mockReturnValue(0.5);

        const promise = retryOperation(operation, config);
        
        // With jitter=0.5, delay = 100 * (0.5 + 0.5*0.5) = 75ms
        await vi.advanceTimersByTimeAsync(75);
        
        const result = await promise;
        
        expect(result).toBe('success');
        
        // Restore Math.random
        Math.random = originalRandom;
      });
    });

    describe('Max Retries', () => {
      it('should stop after maxRetries exhausted', async () => {
        vi.useRealTimers(); // Use real timers to avoid unhandled rejection artifacts
        
        const error = new Error('EMFILE') as NodeJS.ErrnoException;
        error.code = 'EMFILE';
        
        const operation = vi.fn().mockRejectedValue(error);

        const config: RetryConfig = {
          maxRetries: 2,
          initialDelay: 10, // Use shorter delay with real timers
        };

        await expect(retryOperation(operation, config)).rejects.toThrow('EMFILE');
        expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
      });

      it('should use default maxRetries=3', async () => {
        vi.useRealTimers(); // Use real timers to avoid unhandled rejection artifacts
        
        const error = new Error('EMFILE') as NodeJS.ErrnoException;
        error.code = 'EMFILE';
        
        const operation = vi.fn().mockRejectedValue(error);

        const config: RetryConfig = {
          initialDelay: 10, // Use shorter delay with real timers
        };

        await expect(retryOperation(operation, config)).rejects.toThrow('EMFILE');
        expect(operation).toHaveBeenCalledTimes(4); // Initial + 3 retries
      });
    });
  });

  describe('retrySyncOperation', () => {
    it('should wrap synchronous operation', async () => {
      const operation = vi.fn().mockReturnValue('sync-success');
      
      const result = await retrySyncOperation(operation);
      
      expect(result).toBe('sync-success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle sync errors', async () => {
      const error = new Error('EMFILE') as NodeJS.ErrnoException;
      error.code = 'EMFILE';
      
      const operation = vi.fn()
        .mockImplementationOnce(() => { throw error; })
        .mockReturnValue('success');

      const promise = retrySyncOperation(operation, { initialDelay: 100 });
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('withRetry', () => {
    it('should create retryable version of function', async () => {
      const originalFn = vi.fn().mockResolvedValue('result');
      const retryableFn = withRetry(originalFn, { maxRetries: 2 });
      
      const result = await retryableFn('arg1', 'arg2');
      
      expect(result).toBe('result');
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve function arguments', async () => {
      const originalFn = vi.fn((a: number, b: string) => Promise.resolve(`${a}-${b}`));
      const retryableFn = withRetry(originalFn);
      
      const result = await retryableFn(42, 'test');
      
      expect(result).toBe('42-test');
      expect(originalFn).toHaveBeenCalledWith(42, 'test');
    });

    it('should retry with configured options', async () => {
      const error = new Error('EMFILE') as NodeJS.ErrnoException;
      error.code = 'EMFILE';
      
      const originalFn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const retryableFn = withRetry(originalFn, { initialDelay: 100 });
      
      const promise = retryableFn();
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(originalFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle file system contention', async () => {
      // Simulate EMFILE errors during high file I/O
      const emfileError = new Error('EMFILE: too many open files') as NodeJS.ErrnoException;
      emfileError.code = 'EMFILE';
      
      const readFileOperation = vi.fn()
        .mockRejectedValueOnce(emfileError)
        .mockRejectedValueOnce(emfileError)
        .mockResolvedValue('file content');

      const promise = retryOperation(readFileOperation, { initialDelay: 50 });
      
      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(100);
      
      const content = await promise;
      
      expect(content).toBe('file content');
      expect(readFileOperation).toHaveBeenCalledTimes(3);
    });

    it('should handle resource busy errors', async () => {
      // Simulate file locked by another process
      const ebusyError = new Error('EBUSY: resource busy') as NodeJS.ErrnoException;
      ebusyError.code = 'EBUSY';
      
      const writeOperation = vi.fn()
        .mockRejectedValueOnce(ebusyError)
        .mockResolvedValue(undefined);

      const promise = retryOperation(writeOperation, { initialDelay: 100 });
      await vi.advanceTimersByTimeAsync(100);
      
      await expect(promise).resolves.toBeUndefined();
      expect(writeOperation).toHaveBeenCalledTimes(2);
    });

    it('should fail fast on permanent errors', async () => {
      // File doesn't exist - no point retrying
      const enoentError = new Error('ENOENT: no such file') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      
      const operation = vi.fn().mockRejectedValue(enoentError);

      await expect(retryOperation(operation)).rejects.toThrow('ENOENT');
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });
  });
});
