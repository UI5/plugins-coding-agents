/**
 * Performance Benchmarking Utility
 * Measures validator execution time, memory usage, and provides detailed performance metrics
 */

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  stdDev: number;
  memoryUsed: number;
  opsPerSecond: number;
}

export interface BenchmarkOptions {
  iterations?: number;
  warmup?: number;
  trackMemory?: boolean;
}

/**
 * Run a benchmark on a given function
 */
export async function benchmark(
  name: string,
  fn: () => Promise<any> | any,
  options: BenchmarkOptions = {},
): Promise<BenchmarkResult> {
  const iterations = options.iterations ?? 100;
  const warmup = options.warmup ?? 10;
  const trackMemory = options.trackMemory ?? true;

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }

  const times: number[] = [];
  const memoryBefore = trackMemory ? process.memoryUsage().heapUsed : 0;

  // Benchmark phase
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const memoryAfter = trackMemory ? process.memoryUsage().heapUsed : 0;
  const memoryUsed = memoryAfter - memoryBefore;

  // Calculate statistics
  const totalTime = times.reduce((sum, t) => sum + t, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const sortedTimes = [...times].sort((a, b) => a - b);
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
  
  // Standard deviation
  const variance = times.reduce((sum, t) => sum + Math.pow(t - averageTime, 2), 0) / iterations;
  const stdDev = Math.sqrt(variance);

  const opsPerSecond = 1000 / averageTime;

  return {
    name,
    iterations,
    totalTime,
    averageTime,
    minTime,
    maxTime,
    medianTime,
    stdDev,
    memoryUsed,
    opsPerSecond,
  };
}

/**
 * Compare multiple benchmarks and return a comparison report
 */
export function compareBenchmarks(results: BenchmarkResult[]): string {
  if (results.length === 0) {
    return 'No benchmarks to compare';
  }

  const baseline = results[0];
  let report = '# Performance Benchmark Results\n\n';
  
  report += '## Summary\n\n';
  report += '| Name | Avg Time | Min | Max | Median | Std Dev | Ops/sec |\n';
  report += '|------|----------|-----|-----|--------|---------|----------|\n';
  
  for (const result of results) {
    report += `| ${result.name} `;
    report += `| ${result.averageTime.toFixed(2)}ms `;
    report += `| ${result.minTime.toFixed(2)}ms `;
    report += `| ${result.maxTime.toFixed(2)}ms `;
    report += `| ${result.medianTime.toFixed(2)}ms `;
    report += `| ${result.stdDev.toFixed(2)}ms `;
    report += `| ${result.opsPerSecond.toFixed(0)} |\n`;
  }

  report += '\n## Comparison to Baseline\n\n';
  report += `Baseline: **${baseline.name}**\n\n`;
  report += '| Name | Relative Speed | Memory Delta |\n';
  report += '|------|----------------|---------------|\n';
  
  for (const result of results) {
    const speedRatio = baseline.averageTime / result.averageTime;
    const speedPercent = ((speedRatio - 1) * 100).toFixed(1);
    const speedLabel = speedRatio >= 1 
      ? `${speedRatio.toFixed(2)}x faster` 
      : `${(1 / speedRatio).toFixed(2)}x slower`;
    
    const memoryDelta = result.memoryUsed - baseline.memoryUsed;
    const memoryLabel = memoryDelta >= 0
      ? `+${(memoryDelta / 1024 / 1024).toFixed(2)} MB`
      : `${(memoryDelta / 1024 / 1024).toFixed(2)} MB`;
    
    report += `| ${result.name} | ${speedLabel} (${speedPercent}%) | ${memoryLabel} |\n`;
  }

  report += '\n## Detailed Metrics\n\n';
  for (const result of results) {
    report += `### ${result.name}\n\n`;
    report += `- **Iterations**: ${result.iterations}\n`;
    report += `- **Total Time**: ${result.totalTime.toFixed(2)}ms\n`;
    report += `- **Average Time**: ${result.averageTime.toFixed(4)}ms\n`;
    report += `- **Min Time**: ${result.minTime.toFixed(4)}ms\n`;
    report += `- **Max Time**: ${result.maxTime.toFixed(4)}ms\n`;
    report += `- **Median Time**: ${result.medianTime.toFixed(4)}ms\n`;
    report += `- **Standard Deviation**: ${result.stdDev.toFixed(4)}ms\n`;
    report += `- **Operations per Second**: ${result.opsPerSecond.toFixed(0)}\n`;
    report += `- **Memory Used**: ${(result.memoryUsed / 1024 / 1024).toFixed(2)} MB\n\n`;
  }

  return report;
}

/**
 * Format a single benchmark result as a string
 */
export function formatBenchmarkResult(result: BenchmarkResult): string {
  return `${result.name}: ${result.averageTime.toFixed(2)}ms avg (${result.minTime.toFixed(2)}ms min, ${result.maxTime.toFixed(2)}ms max) @ ${result.opsPerSecond.toFixed(0)} ops/sec`;
}

/**
 * Benchmark suite for running multiple benchmarks
 */
export class BenchmarkSuite {
  private results: BenchmarkResult[] = [];

  async add(name: string, fn: () => Promise<any> | any, options?: BenchmarkOptions): Promise<void> {
    const result = await benchmark(name, fn, options);
    this.results.push(result);
    console.log(formatBenchmarkResult(result));
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  getComparison(): string {
    return compareBenchmarks(this.results);
  }

  clear(): void {
    this.results = [];
  }
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { benchmark, BenchmarkSuite, compareBenchmarks } from './performance-benchmark.js';
 * 
 * // Single benchmark
 * const result = await benchmark('My Function', async () => {
 *   await myExpensiveOperation();
 * }, { iterations: 100 });
 * 
 * console.log(`Average time: ${result.averageTime.toFixed(2)}ms`);
 * 
 * // Benchmark suite
 * const suite = new BenchmarkSuite();
 * 
 * await suite.add('Sequential', async () => {
 *   await operation1();
 *   await operation2();
 * });
 * 
 * await suite.add('Parallel', async () => {
 *   await Promise.all([operation1(), operation2()]);
 * });
 * 
 * console.log(suite.getComparison());
 * ```
 */
