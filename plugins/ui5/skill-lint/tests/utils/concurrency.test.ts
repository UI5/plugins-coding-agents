/**
 * Concurrency Utilities Test Suite
 *
 * Tests the promiseAllBatched function for controlled parallel execution.
 */

import { describe, it, expect } from 'vitest';
import { promiseAllBatched } from '../../src/utils/concurrency.js';

describe('promiseAllBatched', () => {
  it('should execute all tasks with no concurrency limit', async () => {
    const tasks = [
      async () => 1,
      async () => 2,
      async () => 3,
    ];

    const results = await promiseAllBatched(tasks);

    expect(results).toEqual([1, 2, 3]);
  });

  it('should execute tasks in batches with concurrency limit', async () => {
    const executionOrder: number[] = [];
    const tasks = [
      async () => { executionOrder.push(1); await delay(10); return 1; },
      async () => { executionOrder.push(2); await delay(10); return 2; },
      async () => { executionOrder.push(3); await delay(10); return 3; },
      async () => { executionOrder.push(4); await delay(10); return 4; },
    ];

    const results = await promiseAllBatched(tasks, 2);

    expect(results).toEqual([1, 2, 3, 4]);
    // With concurrency 2, tasks should execute in pairs
    expect(executionOrder).toHaveLength(4);
  });

  it('should handle empty task array', async () => {
    const tasks: Array<() => Promise<number>> = [];

    const results = await promiseAllBatched(tasks);

    expect(results).toEqual([]);
  });

  it('should handle single task', async () => {
    const tasks = [async () => 42];

    const results = await promiseAllBatched(tasks);

    expect(results).toEqual([42]);
  });

  it('should handle task errors', async () => {
    const tasks = [
      async () => 1,
      async () => { throw new Error('Task failed'); },
      async () => 3,
    ];

    await expect(promiseAllBatched(tasks)).rejects.toThrow('Task failed');
  });

  it('should respect concurrency limit of 1', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const tasks = Array.from({ length: 5 }, (_, i) => async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await delay(5);
      concurrent--;
      return i;
    });

    const results = await promiseAllBatched(tasks, 1);

    expect(results).toEqual([0, 1, 2, 3, 4]);
    expect(maxConcurrent).toBe(1); // Should never exceed 1
  });

  it('should handle Infinity concurrency limit', async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => async () => i);

    const results = await promiseAllBatched(tasks, Infinity);

    expect(results).toHaveLength(10);
    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should execute tasks when concurrency limit equals task count', async () => {
    const tasks = [
      async () => 1,
      async () => 2,
      async () => 3,
    ];

    const results = await promiseAllBatched(tasks, 3);

    expect(results).toEqual([1, 2, 3]);
  });

  it('should execute tasks when concurrency limit exceeds task count', async () => {
    const tasks = [
      async () => 1,
      async () => 2,
    ];

    const results = await promiseAllBatched(tasks, 10);

    expect(results).toEqual([1, 2]);
  });

  it('should preserve result order regardless of completion order', async () => {
    const tasks = [
      async () => { await delay(30); return 'slow'; },
      async () => { await delay(10); return 'fast'; },
      async () => { await delay(20); return 'medium'; },
    ];

    const results = await promiseAllBatched(tasks, 3);

    // Results should be in task order, not completion order
    expect(results).toEqual(['slow', 'fast', 'medium']);
  });

  it('should handle mixed sync and async tasks', async () => {
    const tasks = [
      async () => 1,
      () => Promise.resolve(2),
      async () => { await delay(5); return 3; },
    ];

    const results = await promiseAllBatched(tasks);

    expect(results).toEqual([1, 2, 3]);
  });

  it('should handle large batch sizes', async () => {
    const taskCount = 100;
    const tasks = Array.from({ length: taskCount }, (_, i) => async () => i);

    const results = await promiseAllBatched(tasks, 10);

    expect(results).toHaveLength(taskCount);
    expect(results[0]).toBe(0);
    expect(results[taskCount - 1]).toBe(taskCount - 1);
  });

  it('should handle error in concurrent batch', async () => {
    const tasks = [
      async () => { await delay(5); return 1; },
      async () => { await delay(5); throw new Error('Batch error'); },
      async () => { await delay(5); return 3; },
    ];

    await expect(promiseAllBatched(tasks, 2)).rejects.toThrow('Batch error');
  });

  it('should respect maxConcurrency when processing large batch', async () => {
    let currentConcurrent = 0;
    let maxConcurrent = 0;
    const maxAllowed = 3;

    const tasks = Array.from({ length: 20 }, (_, i) => async () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      await delay(10);
      currentConcurrent--;
      return i;
    });

    await promiseAllBatched(tasks, maxAllowed);

    expect(maxConcurrent).toBeLessThanOrEqual(maxAllowed);
  });

  it('should handle mix of fast and slow tasks with batching', async () => {
    const tasks = [
      async () => { await delay(50); return 'very-slow'; },
      async () => 'instant',
      async () => { await delay(10); return 'fast'; },
      async () => { await delay(30); return 'slow'; },
      async () => 'instant2',
    ];

    const results = await promiseAllBatched(tasks, 2);

    expect(results).toEqual(['very-slow', 'instant', 'fast', 'slow', 'instant2']);
  });
});

// Helper function
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
