/**
 * Audit Command
 * Runs comprehensive harness validation with statistical analysis and reporting.
 *
 * Usage:
 *   skill-lint audit <skill-path> [options]
 *
 * Features:
 * - Multiple iterations for statistical confidence
 * - Performance benchmarking
 * - Cost tracking
 * - Historical baseline comparison
 * - Multiple output formats (text, markdown, HTML, JSON)
 */

import { resolve } from 'path';
import { readFile } from 'fs/promises';
import { HarnessValidator } from '../../validators/harness-validator.js';
import { loadSkill } from '../../utils/file-utils.js';
import { loadConfig, mergeWithDefaults } from '../../config/loader.js';
import { Logger } from '../../utils/logger.js';
import { summarize } from '../../utils/statistics.js';
import type {
  AuditOptions,
  AuditResult,
  AuditIteration,
  AuditConfig,
  HarnessIterationMetadata,
} from '../../types/audit-types.js';
import type { ValidationResult } from '../../types/index.js';

/**
 * Claude Sonnet 4.6 pricing configuration
 * @see https://www.anthropic.com/pricing
 */
const PRICING_CONFIG = {
  model: 'claude-sonnet-4.6',
  inputCostPerMillion: 3,  // USD per 1M input tokens
  outputCostPerMillion: 15, // USD per 1M output tokens
  averageCostPerMillion: 9, // Approximate average (assuming 50/50 input/output)
  effectiveDate: '2026-05-01',
} as const;

const TOKENS_PER_MILLION = 1_000_000 as const;

/**
 * Grade thresholds based on industry-standard academic grading scale
 */
const GRADE_THRESHOLDS = {
  A: 90, // Excellent: ready for production
  B: 80, // Good: minor improvements needed
  C: 70, // Acceptable: significant improvements recommended
  D: 60, // Poor: major issues must be addressed
  F: 0,  // Failing: unsuitable for production
} as const;

/**
 * Calculate letter grade from numerical score
 */
function calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= GRADE_THRESHOLDS.A) return 'A';
  if (score >= GRADE_THRESHOLDS.B) return 'B';
  if (score >= GRADE_THRESHOLDS.C) return 'C';
  if (score >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  iterations: 1,
  format: 'text',
  confidenceLevel: 0.95,
  thresholds: {
    minAccuracy: 80,
    maxLatency: 3000,
    maxTokensPerTest: 1000,
  },
};

/**
 * Run comprehensive harness audit with statistical analysis
 *
 * Executes the harness validator multiple times and provides detailed
 * statistical analysis including mean, median, standard deviation, and
 * confidence intervals for accuracy, latency, and token usage.
 *
 * @param skillPath - Absolute or relative path to skill directory or SKILL.md
 * @param options - Audit configuration options
 * @returns Exit code: 0 for pass, 1 for fail, 2 for execution error
 * @throws {Error} When skill path is invalid or cannot be loaded
 *
 * @example
 * ```typescript
 * // Basic audit
 * const exitCode = await auditCommand('../skills/my-skill');
 *
 * // Statistical confidence with 10 iterations
 * const exitCode = await auditCommand('../skills/my-skill', {
 *   iterations: 10,
 *   format: 'html',
 *   output: 'reports/audit.html',
 *   baseline: 'baselines/v1.0.0.json'
 * });
 * ```
 */
export async function auditCommand(
  skillPath: string,
  options: AuditOptions = {},
): Promise<number> {
  const startTime = Date.now();

  try {
    if (!skillPath || typeof skillPath !== 'string' || skillPath.trim().length === 0) {
      throw new Error('Invalid skill path: must be a non-empty string');
    }

    const config = await buildAuditConfig(options);

    const resolvedPath = resolve(process.cwd(), skillPath);
    const skill = await loadSkill(resolvedPath);

    Logger.start(`🔍 Auditing harness for "${skill.metadata.name}"`);
    Logger.info(`Running ${config.iterations} iteration(s) with ${config.format} format`);

    const iterations: AuditIteration[] = [];
    const validator = new HarnessValidator();

    for (let i = 0; i < config.iterations; i++) {
      Logger.info(`\n📊 Iteration ${i + 1}/${config.iterations}...`);

      const lintConfig = await loadConfig();
      const result = await validator.validate(skill, {
        ...lintConfig,
        scenarios: { ...lintConfig.scenarios, harness: true },
      });

      const iteration: AuditIteration = {
        iterationNumber: i + 1,
        timestamp: new Date().toISOString(),
        result,
        harnessMetadata: extractHarnessMetadata(result),
      };

      iterations.push(iteration);
    }

    Logger.info('\n📈 Computing statistical analysis...');

    let baselineData: AuditResult | undefined;
    if (config.baseline) {
      try {
        const data = await readFile(config.baseline, 'utf-8');
        const parsed = JSON.parse(data);

        // Validate baseline structure
        if (!parsed.statistics?.accuracy?.mean ||
            !parsed.statistics?.latency?.mean ||
            !parsed.statistics?.tokenUsage?.mean ||
            !parsed.timestamp) {
          throw new Error('Invalid baseline format: missing required statistics or timestamp');
        }

        baselineData = parsed as AuditResult;
        Logger.info(`Loaded baseline from ${config.baseline}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.warning(`Failed to load baseline: ${message}`);
        Logger.info('Continuing without baseline comparison');
      }
    }

    const auditResult = await computeAuditResult(
      skill.metadata.name,
      resolvedPath,
      iterations,
      config,
      baselineData,
    );

    const formatter = await getAuditFormatter(config.format);
    const output = formatter.format(auditResult);

    process.stdout.write(output + '\n');

    if (config.output) {
      await formatter.writeToFile(auditResult, config.output);
      Logger.success(`\n📄 Report saved to ${config.output}`);
    }

    const totalDuration = Date.now() - startTime;
    Logger.success(`\n✅ Audit complete in ${(totalDuration / 1000).toFixed(2)}s`);

    return auditResult.assessment.passed ? 0 : 1;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Audit failed: ${message}`);
    return 2;
  }
}

/**
 * Extract harness metadata from validation result with runtime type checking
 */
function extractHarnessMetadata(result: ValidationResult): HarnessIterationMetadata | undefined {
  const metadata = result.metrics;
  if (!metadata) return undefined;

  const getNumber = (value: unknown): number => {
    return typeof value === 'number' && !isNaN(value) ? value : 0;
  };

  return {
    totalCases: getNumber(metadata.totalCases),
    passed: getNumber(metadata.passed),
    failed: getNumber(metadata.failed),
    accuracy: getNumber(metadata.accuracy),
    totalTokens: getNumber(metadata.totalTokens),
    averageLatency: getNumber(metadata.averageLatency),
  };
}

/**
 * Extract a specific metric from iterations
 * @param iterations - Array of audit iterations
 * @param key - Metadata key to extract
 * @returns Array of metric values (includes zeros, excludes missing metadata)
 */
function extractMetric(
  iterations: readonly AuditIteration[],
  key: keyof HarnessIterationMetadata
): number[] {
  return iterations
    .filter(it => it.harnessMetadata !== undefined)
    .map(it => {
      const value = it.harnessMetadata![key];
      return typeof value === 'number' && !isNaN(value) ? value : 0;
    });
}

async function computeAuditResult(
  skillName: string,
  skillPath: string,
  iterations: readonly AuditIteration[],
  config: AuditConfig,
  baselineData?: AuditResult,
): Promise<AuditResult> {
  const accuracies = extractMetric(iterations, 'accuracy');
  const latencies = extractMetric(iterations, 'averageLatency');
  const tokens = extractMetric(iterations, 'totalTokens');

  const costs = tokens.map(t => (t / TOKENS_PER_MILLION) * PRICING_CONFIG.averageCostPerMillion);

  const statistics = {
    accuracy: summarize(accuracies, config.confidenceLevel),
    latency: summarize(latencies, config.confidenceLevel),
    tokenUsage: summarize(tokens, config.confidenceLevel),
    cost: summarize(costs, config.confidenceLevel),
  };

  const aggregated = {
    totalTests: iterations.reduce((sum, it) => sum + (it.harnessMetadata?.totalCases ?? 0), 0),
    totalPassed: iterations.reduce((sum, it) => sum + (it.harnessMetadata?.passed ?? 0), 0),
    totalFailed: iterations.reduce((sum, it) => sum + (it.harnessMetadata?.failed ?? 0), 0),
    overallAccuracy: statistics.accuracy.mean,
    totalTokens: tokens.reduce((sum, val) => sum + val, 0),
    totalCost: costs.reduce((sum, val) => sum + val, 0),
  };

  const assessment = assessQuality(statistics, aggregated, config);

  const result: AuditResult = {
    skill: skillName,
    skillPath,
    timestamp: new Date().toISOString(),
    totalDuration: iterations.reduce((sum, it) => sum + it.result.duration, 0),
    iterations,
    statistics,
    aggregated,
    assessment,
  };

  if (baselineData) {
    return {
      ...result,
      baseline: compareWithBaseline(result, baselineData),
    };
  }

  return result;
}

/**
 * Assess audit quality and assign grade based on performance metrics
 */
function assessQuality(
  statistics: AuditResult['statistics'],
  aggregated: AuditResult['aggregated'],
  config: AuditConfig,
): AuditResult['assessment'] {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // Handle edge case: no tests executed
  if (aggregated.totalTests === 0) {
    issues.push('No test cases were executed');
    return {
      grade: 'F',
      score: 0,
      passed: false,
      issues,
      recommendations: ['Ensure harness validator has valid test cases'],
    };
  }

  if (statistics.accuracy.mean < config.thresholds.minAccuracy) {
    issues.push(`Accuracy ${statistics.accuracy.mean.toFixed(1)}% is below ${config.thresholds.minAccuracy}% threshold`);
    recommendations.push('Improve skill description and trigger keywords');
    score -= 30;
  } else if (statistics.accuracy.mean < 90) {
    recommendations.push('Consider adding more specific trigger keywords for higher accuracy');
    score -= 10;
  }

  if (statistics.latency.mean > config.thresholds.maxLatency) {
    issues.push(`Average latency ${statistics.latency.mean.toFixed(0)}ms exceeds ${config.thresholds.maxLatency}ms threshold`);
    recommendations.push('Simplify skill instructions to reduce response time');
    score -= 20;
  }

  const tokensPerTest = aggregated.totalTokens / aggregated.totalTests;
  if (tokensPerTest > config.thresholds.maxTokensPerTest) {
    issues.push(`Average tokens per test ${tokensPerTest.toFixed(0)} exceeds ${config.thresholds.maxTokensPerTest} threshold`);
    recommendations.push('Reduce skill content size or use reference files');
    score -= 15;
  }

  if (statistics.accuracy.stdDev > 15) {
    issues.push(`High accuracy variance (σ=${statistics.accuracy.stdDev.toFixed(1)}%) indicates unreliable triggering`);
    recommendations.push('Add more specific detection patterns to improve consistency');
    score -= 10;
  }

  const grade = calculateGrade(score);
  const passed = score >= GRADE_THRESHOLDS.C && statistics.accuracy.mean >= config.thresholds.minAccuracy;

  return {
    grade,
    score: Math.max(0, score),
    passed,
    issues,
    recommendations,
  };
}

/**
 * Compare current audit results with historical baseline
 * Warns if baseline is stale or iteration counts differ significantly
 */
function compareWithBaseline(
  current: AuditResult,
  baseline: AuditResult,
): AuditResult['baseline'] {
  // Warn if baseline is old (> 30 days)
  const baselineDate = new Date(baseline.timestamp);
  const daysSinceBaseline = (Date.now() - baselineDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceBaseline > 30) {
    Logger.warning(`Baseline is ${Math.floor(daysSinceBaseline)} days old - consider updating`);
  }

  // Warn if iteration counts differ significantly
  if (Math.abs(current.iterations.length - baseline.iterations.length) > 2) {
    Logger.warning('Baseline used different iteration count - comparison may be less reliable');
  }

  const accuracyDelta = current.statistics.accuracy.mean - baseline.statistics.accuracy.mean;
  const latencyDelta = current.statistics.latency.mean - baseline.statistics.latency.mean;
  const tokenDelta = current.statistics.tokenUsage.mean - baseline.statistics.tokenUsage.mean;

  const improved = accuracyDelta > 0 || (latencyDelta < 0 && tokenDelta < 0);

  return {
    accuracyDelta,
    latencyDelta,
    tokenDelta,
    improved,
  };
}

async function buildAuditConfig(options: AuditOptions): Promise<AuditConfig> {
  return {
    ...DEFAULT_AUDIT_CONFIG,
    iterations: options.iterations ?? DEFAULT_AUDIT_CONFIG.iterations,
    format: options.format ?? DEFAULT_AUDIT_CONFIG.format,
    output: options.output,
    baseline: options.baseline,
    confidenceLevel: options.confidenceLevel ?? DEFAULT_AUDIT_CONFIG.confidenceLevel,
  };
}

async function getAuditFormatter(format: string) {
  switch (format) {
    case 'markdown': {
      const { AuditMarkdownFormatter } = await import('../../formatters/audit-markdown-formatter.js');
      return new AuditMarkdownFormatter();
    }
    case 'html': {
      const { AuditHtmlFormatter } = await import('../../formatters/audit-html-formatter.js');
      return new AuditHtmlFormatter();
    }
    case 'json': {
      const { AuditJsonFormatter } = await import('../../formatters/audit-json-formatter.js');
      return new AuditJsonFormatter();
    }
    case 'text':
    default: {
      const { AuditTextFormatter } = await import('../../formatters/audit-text-formatter.js');
      return new AuditTextFormatter();
    }
  }
}
