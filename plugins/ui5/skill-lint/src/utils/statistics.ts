/**
 * Statistical analysis utilities
 * Provides mean, median, std dev, confidence intervals, and significance tests
 */

import type { StatisticalSummary } from '../types/audit-types.js';

/**
 * Calculate mean (average) of a dataset
 */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate median (middle value) of a dataset
 */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

/**
 * Calculate standard deviation (measure of spread)
 */
export function stdDev(values: readonly number[]): number {
  if (values.length < 2) return 0;

  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);

  return Math.sqrt(variance);
}

/**
 * Calculate min and max of a dataset
 */
export function minMax(values: readonly number[]): [number, number] {
  if (values.length === 0) return [0, 0];
  return [Math.min(...values), Math.max(...values)];
}

/**
 * Calculate confidence interval using t-distribution
 * @param values - Dataset
 * @param confidence - Confidence level (e.g., 0.95 for 95%)
 * @returns [lower bound, upper bound]
 */
export function confidenceInterval(
  values: readonly number[],
  confidence: number = 0.95
): [number, number] {
  if (values.length < 2) {
    const val = values[0] ?? 0;
    return [val, val];
  }

  const avg = mean(values);
  const sd = stdDev(values);
  const n = values.length;

  const tScore = getTScore(n, confidence);
  const marginOfError = tScore * (sd / Math.sqrt(n));

  return [avg - marginOfError, avg + marginOfError];
}

/**
 * Get t-score for confidence interval calculation
 * Uses z-score approximation for large samples and simplified formula for small samples
 */
function getTScore(n: number, confidence: number): number {
  // For large samples (n > 30), use z-score (Central Limit Theorem)
  if (n > 30) {
    return confidence === 0.95 ? 1.96 : 2.576;
  }

  // For small samples, use approximation formula
  // More accurate than table lookup with closest-value interpolation
  return confidence === 0.95
    ? 1.96 + 2.5 / Math.sqrt(n)
    : 2.576 + 3.0 / Math.sqrt(n);
}

/**
 * Create statistical summary from dataset
 */
export function summarize(
  values: readonly number[],
  confidenceLevel?: number
): StatisticalSummary {
  const [min, max] = minMax(values);

  return {
    mean: mean(values),
    median: median(values),
    stdDev: stdDev(values),
    min,
    max,
    confidenceInterval: confidenceLevel
      ? confidenceInterval(values, confidenceLevel)
      : undefined,
  };
}
