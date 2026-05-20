/**
 * Performance Benchmark Tests
 */

import { describe, it, expect } from 'vitest';
import { benchmark, compareBenchmarks, formatBenchmarkResult, BenchmarkSuite } from '../../src/utils/performance-benchmark.js';

describe('Performance Benchmark', () => {
  describe('benchmark', () => {
    it('should measure function execution time', async () => {
      const result = await benchmark('Test Function', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      }, { iterations: 5, warmup: 1 });

      expect(result.name).toBe('Test Function');
      expect(result.iterations).toBe(5);
      expect(result.averageTime).toBeGreaterThan(9); // ~10ms with some overhead
      expect(result.minTime).toBeGreaterThan(0);
      expect(result.maxTime).toBeGreaterThan(result.minTime);
    });

    it('should calculate statistics correctly', async () => {
      const result = await benchmark('Stats Test', () => {
        // Very fast operation
      }, { iterations: 100, warmup: 10 });

      expect(result.totalTime).toBeGreaterThan(0);
      expect(result.averageTime).toBeCloseTo(result.totalTime / 100, 1);
      expect(result.medianTime).toBeGreaterThanOrEqual(result.minTime);
      expect(result.medianTime).toBeLessThanOrEqual(result.maxTime);
      expect(result.stdDev).toBeGreaterThanOrEqual(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });

    it('should support synchronous functions', async () => {
      const result = await benchmark('Sync Function', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      }, { iterations: 50 });

      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.iterations).toBe(50);
    });

    it('should track memory usage when enabled', async () => {
      const result = await benchmark('Memory Test', () => {
        const arr = new Array(1000).fill(0);
        return arr.length;
      }, { iterations: 10, trackMemory: true });

      expect(result.memoryUsed).toBeDefined();
      // Memory tracking is approximate and can be negative due to GC
      expect(typeof result.memoryUsed).toBe('number');
    });

    it('should support warmup iterations', async () => {
      let callCount = 0;
      const result = await benchmark('Warmup Test', () => {
        callCount++;
      }, { iterations: 10, warmup: 5 });

      // Total calls = warmup + iterations
      expect(callCount).toBe(15);
      expect(result.iterations).toBe(10);
    });
  });

  describe('formatBenchmarkResult', () => {
    it('should format result as readable string', () => {
      const result = {
        name: 'Test',
        iterations: 100,
        totalTime: 1000,
        averageTime: 10,
        minTime: 8,
        maxTime: 15,
        medianTime: 9.5,
        stdDev: 2.1,
        memoryUsed: 1024 * 1024,
        opsPerSecond: 100,
      };

      const formatted = formatBenchmarkResult(result);

      expect(formatted).toContain('Test');
      expect(formatted).toContain('10.00ms');
      expect(formatted).toContain('8.00ms');
      expect(formatted).toContain('15.00ms');
      expect(formatted).toContain('100 ops/sec');
    });
  });

  describe('compareBenchmarks', () => {
    it('should generate comparison report', () => {
      const results = [
        {
          name: 'Baseline',
          iterations: 100,
          totalTime: 1000,
          averageTime: 10,
          minTime: 8,
          maxTime: 12,
          medianTime: 10,
          stdDev: 1.5,
          memoryUsed: 1024 * 1024,
          opsPerSecond: 100,
        },
        {
          name: 'Optimized',
          iterations: 100,
          totalTime: 500,
          averageTime: 5,
          minTime: 4,
          maxTime: 6,
          medianTime: 5,
          stdDev: 0.5,
          memoryUsed: 512 * 1024,
          opsPerSecond: 200,
        },
      ];

      const comparison = compareBenchmarks(results);

      expect(comparison).toContain('Performance Benchmark Results');
      expect(comparison).toContain('Baseline');
      expect(comparison).toContain('Optimized');
      expect(comparison).toContain('10.00ms');
      expect(comparison).toContain('5.00ms');
      expect(comparison).toContain('2.00x faster');
    });

    it('should handle empty results', () => {
      const comparison = compareBenchmarks([]);
      expect(comparison).toBe('No benchmarks to compare');
    });

    it('should show slower performance correctly', () => {
      const results = [
        {
          name: 'Fast',
          iterations: 100,
          totalTime: 500,
          averageTime: 5,
          minTime: 4,
          maxTime: 6,
          medianTime: 5,
          stdDev: 0.5,
          memoryUsed: 512 * 1024,
          opsPerSecond: 200,
        },
        {
          name: 'Slow',
          iterations: 100,
          totalTime: 1000,
          averageTime: 10,
          minTime: 8,
          maxTime: 12,
          medianTime: 10,
          stdDev: 1.5,
          memoryUsed: 1024 * 1024,
          opsPerSecond: 100,
        },
      ];

      const comparison = compareBenchmarks(results);

      expect(comparison).toContain('2.00x slower');
    });
  });

  describe('BenchmarkSuite', () => {
    it('should add and track multiple benchmarks', async () => {
      const suite = new BenchmarkSuite();

      await suite.add('Benchmark 1', () => {
        let sum = 0;
        for (let i = 0; i < 100; i++) sum += i;
      }, { iterations: 10 });

      await suite.add('Benchmark 2', () => {
        let sum = 0;
        for (let i = 0; i < 200; i++) sum += i;
      }, { iterations: 10 });

      const results = suite.getResults();
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Benchmark 1');
      expect(results[1].name).toBe('Benchmark 2');
    });

    it('should generate comparison report', async () => {
      const suite = new BenchmarkSuite();

      await suite.add('Fast', () => {
        // Fast operation
      }, { iterations: 50 });

      await suite.add('Slower', async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
      }, { iterations: 50 });

      const comparison = suite.getComparison();
      expect(comparison).toContain('Performance Benchmark Results');
      expect(comparison).toContain('Fast');
      expect(comparison).toContain('Slower');
    });

    it('should clear results', async () => {
      const suite = new BenchmarkSuite();

      await suite.add('Test 1', () => {}, { iterations: 10 });
      await suite.add('Test 2', () => {}, { iterations: 10 });

      expect(suite.getResults()).toHaveLength(2);

      suite.clear();
      expect(suite.getResults()).toHaveLength(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle high iteration counts', async () => {
      const result = await benchmark('High Iterations', () => {
        return Math.random();
      }, { iterations: 1000, warmup: 100 });

      expect(result.iterations).toBe(1000);
      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.opsPerSecond).toBeGreaterThan(0);
    });

    it('should measure very fast operations', async () => {
      const result = await benchmark('Fast Op', () => {
        return 1 + 1;
      }, { iterations: 1000 });

      expect(result.averageTime).toBeGreaterThan(0);
      expect(result.minTime).toBeGreaterThan(0);
      // Very fast operations should complete in microseconds
      expect(result.averageTime).toBeLessThan(1); // < 1ms average
    });

    it('should measure slower operations accurately', async () => {
      const result = await benchmark('Slow Op', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      }, { iterations: 10, warmup: 2 });

      expect(result.averageTime).toBeGreaterThan(4); // ~5ms
      expect(result.averageTime).toBeLessThan(10); // Should not be way off
    });
  });
});
