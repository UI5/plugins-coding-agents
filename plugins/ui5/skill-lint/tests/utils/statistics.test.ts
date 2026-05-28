/**
 * Tests for statistical utilities
 */

import { describe, it, expect } from 'vitest';
import {
  mean,
  median,
  stdDev,
  minMax,
  confidenceInterval,
  summarize,
} from '../../src/utils/statistics.js';

describe('statistics', () => {
  describe('mean', () => {
    it('should calculate mean correctly', () => {
      expect(mean([1, 2, 3, 4, 5])).toBe(3);
      expect(mean([10, 20, 30])).toBe(20);
      expect(mean([100])).toBe(100);
    });

    it('should return 0 for empty array', () => {
      expect(mean([])).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(mean([-1, -2, -3])).toBe(-2);
    });

    it('should handle decimal numbers', () => {
      expect(mean([1.5, 2.5, 3.5])).toBeCloseTo(2.5);
    });
  });

  describe('median', () => {
    it('should calculate median for odd-length array', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
      expect(median([10, 20, 30, 40, 50])).toBe(30);
    });

    it('should calculate median for even-length array', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
      expect(median([10, 20, 30, 40])).toBe(25);
    });

    it('should return 0 for empty array', () => {
      expect(median([])).toBe(0);
    });

    it('should handle unsorted arrays', () => {
      expect(median([5, 1, 3, 2, 4])).toBe(3);
      expect(median([40, 10, 30, 20])).toBe(25);
    });

    it('should handle single element', () => {
      expect(median([42])).toBe(42);
    });
  });

  describe('stdDev', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      expect(stdDev(values)).toBeCloseTo(2.0, 1);
    });

    it('should return 0 for arrays with less than 2 elements', () => {
      expect(stdDev([])).toBe(0);
      expect(stdDev([42])).toBe(0);
    });

    it('should return 0 for identical values', () => {
      expect(stdDev([5, 5, 5, 5])).toBe(0);
    });

    it('should handle negative numbers', () => {
      expect(stdDev([-1, 0, 1])).toBeCloseTo(0.816, 2);
    });
  });

  describe('minMax', () => {
    it('should return min and max correctly', () => {
      expect(minMax([1, 2, 3, 4, 5])).toEqual([1, 5]);
      expect(minMax([10, 5, 20, 15])).toEqual([5, 20]);
    });

    it('should return [0, 0] for empty array', () => {
      expect(minMax([])).toEqual([0, 0]);
    });

    it('should handle single element', () => {
      expect(minMax([42])).toEqual([42, 42]);
    });

    it('should handle negative numbers', () => {
      expect(minMax([-10, -5, 0, 5, 10])).toEqual([-10, 10]);
    });
  });

  describe('confidenceInterval', () => {
    it('should calculate 95% confidence interval', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const [lower, upper] = confidenceInterval(values, 0.95);
      expect(lower).toBeLessThan(mean(values));
      expect(upper).toBeGreaterThan(mean(values));
    });

    it('should return [value, value] for single element', () => {
      const [lower, upper] = confidenceInterval([42]);
      expect(lower).toBe(42);
      expect(upper).toBe(42);
    });

    it('should have narrower interval with more samples of similar variance', () => {
      // Use samples with similar variance for fair comparison
      const small = [48, 49, 50, 51, 52]; // n=5, mean=50, small range
      const large = Array.from({ length: 100 }, () => 50 + (Math.random() - 0.5) * 4); // n=100, mean≈50, similar range

      const [smallLower, smallUpper] = confidenceInterval(small, 0.95);
      const [largeLower, largeUpper] = confidenceInterval(large, 0.95);

      const smallWidth = smallUpper - smallLower;
      const largeWidth = largeUpper - largeLower;

      // With 20x more samples, CI should be narrower (approximately by factor of sqrt(20) ≈ 4.5)
      expect(largeWidth).toBeLessThan(smallWidth);
    });

    it('should use default confidence level of 0.95', () => {
      const values = [1, 2, 3, 4, 5];
      const explicit = confidenceInterval(values, 0.95);
      const defaultCI = confidenceInterval(values);
      expect(explicit).toEqual(defaultCI);
    });
  });

  describe('summarize', () => {
    it('should create complete statistical summary', () => {
      const values = [1, 2, 3, 4, 5];
      const summary = summarize(values, 0.95);

      expect(summary.mean).toBe(3);
      expect(summary.median).toBe(3);
      expect(summary.min).toBe(1);
      expect(summary.max).toBe(5);
      expect(summary.stdDev).toBeGreaterThan(0);
      expect(summary.confidenceInterval).toBeDefined();
      expect(summary.confidenceInterval![0]).toBeLessThan(3);
      expect(summary.confidenceInterval![1]).toBeGreaterThan(3);
    });

    it('should omit confidence interval when not requested', () => {
      const values = [1, 2, 3, 4, 5];
      const summary = summarize(values);

      expect(summary.mean).toBe(3);
      expect(summary.median).toBe(3);
      expect(summary.confidenceInterval).toBeUndefined();
    });

    it('should handle empty array gracefully', () => {
      const summary = summarize([]);

      expect(summary.mean).toBe(0);
      expect(summary.median).toBe(0);
      expect(summary.stdDev).toBe(0);
      expect(summary.min).toBe(0);
      expect(summary.max).toBe(0);
    });
  });

});
