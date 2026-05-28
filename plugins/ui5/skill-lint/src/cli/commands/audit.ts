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

// Claude Sonnet 4.6 pricing (USD per 1M tokens)
const CLAUDE_SONNET_INPUT_COST_PER_MILLION = 3;
const CLAUDE_SONNET_OUTPUT_COST_PER_MILLION = 15;
const CLAUDE_SONNET_AVERAGE_COST_PER_MILLION = 9; // Approximate average
const TOKENS_PER_MILLION = 1_000_000;

const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  iterations: 1,
  benchmark: false,
  format: 'text',
  confidenceLevel: 0.95,
  thresholds: {
    minAccuracy: 80,
    maxLatency: 3000,
    maxTokensPerTest: 1000,
  },
};

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
        baselineData = JSON.parse(data) as AuditResult;
      } catch (error) {
        Logger.warning(`Failed to load baseline: ${error instanceof Error ? error.message : String(error)}`);
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

function extractHarnessMetadata(result: ValidationResult): HarnessIterationMetadata | undefined {
  const metadata = result.metrics;
  if (!metadata) return undefined;

  return {
    totalCases: (metadata.totalCases as number) ?? 0,
    passed: (metadata.passed as number) ?? 0,
    failed: (metadata.failed as number) ?? 0,
    accuracy: (metadata.accuracy as number) ?? 0,
    totalTokens: (metadata.totalTokens as number) ?? 0,
    averageLatency: (metadata.averageLatency as number) ?? 0,
    totalCost: 0,
  };
}

/**
 * Extract a specific metric from iterations
 * @param iterations - Array of audit iterations
 * @param key - Metadata key to extract
 * @returns Array of non-zero values for the metric
 */
function extractMetric(
  iterations: readonly AuditIteration[],
  key: keyof HarnessIterationMetadata
): number[] {
  return iterations
    .map(it => (it.harnessMetadata?.[key] as number) ?? 0)
    .filter(val => val > 0);
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

  const costs = tokens.map(t => (t / TOKENS_PER_MILLION) * CLAUDE_SONNET_AVERAGE_COST_PER_MILLION);

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

function assessQuality(
  statistics: AuditResult['statistics'],
  aggregated: AuditResult['aggregated'],
  config: AuditConfig,
): AuditResult['assessment'] {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

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

  const tokensPerTest = aggregated.totalTokens / Math.max(1, aggregated.totalTests);
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

  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const passed = score >= 70 && statistics.accuracy.mean >= config.thresholds.minAccuracy;

  return {
    grade,
    score: Math.max(0, score),
    passed,
    issues,
    recommendations,
  };
}

function compareWithBaseline(
  current: AuditResult,
  baseline: AuditResult,
): AuditResult['baseline'] {
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
    benchmark: options.benchmark ?? DEFAULT_AUDIT_CONFIG.benchmark,
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
