/**
 * Audit-specific types
 * Extends core LintResult with statistical analysis and historical tracking
 */

import type { ValidationResult, LintResult } from './index.js';

export interface AuditOptions {
  /** Number of iterations to run (default: 1) */
  iterations?: number;
  /** Include performance benchmarking */
  benchmark?: boolean;
  /** Output format: text, markdown, html, json */
  format?: 'text' | 'markdown' | 'html' | 'json';
  /** Path to save audit report */
  output?: string;
  /** Compare against historical baseline */
  baseline?: string;
  /** Confidence level for statistical tests (default: 0.95) */
  confidenceLevel?: number;
}

export interface AuditIteration {
  readonly iterationNumber: number;
  readonly timestamp: string;
  readonly result: ValidationResult;
  readonly harnessMetadata?: HarnessIterationMetadata;
}

export interface HarnessIterationMetadata {
  readonly totalCases: number;
  readonly passed: number;
  readonly failed: number;
  readonly accuracy: number;
  readonly totalTokens: number;
  readonly averageLatency: number;
  readonly totalCost: number;
}

export interface StatisticalSummary {
  readonly mean: number;
  readonly median: number;
  readonly stdDev: number;
  readonly min: number;
  readonly max: number;
  readonly confidenceInterval?: [number, number];
}

export interface AuditResult {
  readonly skill: string;
  readonly skillPath: string;
  readonly timestamp: string;
  readonly totalDuration: number;
  readonly iterations: readonly AuditIteration[];

  readonly statistics: {
    readonly accuracy: StatisticalSummary;
    readonly latency: StatisticalSummary;
    readonly tokenUsage: StatisticalSummary;
    readonly cost: StatisticalSummary;
  };

  readonly aggregated: {
    readonly totalTests: number;
    readonly totalPassed: number;
    readonly totalFailed: number;
    readonly overallAccuracy: number;
    readonly totalTokens: number;
    readonly totalCost: number;
  };

  readonly assessment: {
    readonly grade: 'A' | 'B' | 'C' | 'D' | 'F';
    readonly score: number;
    readonly passed: boolean;
    readonly issues: readonly string[];
    readonly recommendations: readonly string[];
  };

  readonly baseline?: {
    readonly accuracyDelta: number;
    readonly latencyDelta: number;
    readonly tokenDelta: number;
    readonly improved: boolean;
  };
}

export interface AuditConfig {
  readonly iterations: number;
  readonly benchmark: boolean;
  readonly format: 'text' | 'markdown' | 'html' | 'json';
  readonly output?: string;
  readonly baseline?: string;
  readonly confidenceLevel: number;

  readonly thresholds: {
    readonly minAccuracy: number;
    readonly maxLatency: number;
    readonly maxTokensPerTest: number;
  };
}
