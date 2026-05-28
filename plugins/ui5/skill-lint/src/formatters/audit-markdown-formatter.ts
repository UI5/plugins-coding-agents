/**
 * Audit Markdown Formatter
 * GitHub-friendly markdown reports
 */

import { AuditFormatterBase } from './audit-formatter-base.js';
import { getGradeEmoji } from './audit-formatter-utils.js';
import type { AuditResult } from '../types/audit-types.js';

export class AuditMarkdownFormatter extends AuditFormatterBase {
  readonly name = 'audit-markdown';
  readonly extension = 'md';

  format(result: AuditResult): string {
    const lines: string[] = [];

    lines.push(`# 🔍 Harness Audit Report: ${result.skill}`);
    lines.push('');
    lines.push(`**Generated:** ${result.timestamp}`);
    lines.push('');

    lines.push('## 📊 Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Skill | ${result.skill} |`);
    lines.push(`| Iterations | ${result.iterations.length} |`);
    lines.push(`| Total Duration | ${(result.totalDuration / 1000).toFixed(2)}s |`);
    lines.push(`| Timestamp | ${result.timestamp} |`);
    lines.push('');

    lines.push('## 📈 Aggregated Metrics');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Tests | ${result.aggregated.totalTests} |`);
    lines.push(`| Passed | ${result.aggregated.totalPassed} |`);
    lines.push(`| Failed | ${result.aggregated.totalFailed} |`);
    lines.push(`| Overall Accuracy | ${result.aggregated.overallAccuracy.toFixed(1)}% |`);
    lines.push(`| Total Tokens | ${result.aggregated.totalTokens.toLocaleString()} |`);
    lines.push(`| Total Cost | $${result.aggregated.totalCost.toFixed(4)} |`);
    lines.push('');

    lines.push('## 📊 Statistical Analysis');
    lines.push('');

    lines.push('### Accuracy');
    lines.push('');
    lines.push('| Statistic | Value |');
    lines.push('|-----------|-------|');
    lines.push(`| Mean | ${result.statistics.accuracy.mean.toFixed(1)}% |`);
    lines.push(`| Median | ${result.statistics.accuracy.median.toFixed(1)}% |`);
    lines.push(`| Std Dev | ${result.statistics.accuracy.stdDev.toFixed(1)}% |`);
    lines.push(`| Min | ${result.statistics.accuracy.min.toFixed(1)}% |`);
    lines.push(`| Max | ${result.statistics.accuracy.max.toFixed(1)}% |`);
    if (result.statistics.accuracy.confidenceInterval) {
      const [lower, upper] = result.statistics.accuracy.confidenceInterval;
      lines.push(`| 95% CI | [${lower.toFixed(1)}%, ${upper.toFixed(1)}%] |`);
    }
    lines.push('');

    lines.push('### Latency');
    lines.push('');
    lines.push('| Statistic | Value |');
    lines.push('|-----------|-------|');
    lines.push(`| Mean | ${result.statistics.latency.mean.toFixed(0)}ms |`);
    lines.push(`| Median | ${result.statistics.latency.median.toFixed(0)}ms |`);
    lines.push(`| Std Dev | ${result.statistics.latency.stdDev.toFixed(0)}ms |`);
    lines.push(`| Min | ${result.statistics.latency.min.toFixed(0)}ms |`);
    lines.push(`| Max | ${result.statistics.latency.max.toFixed(0)}ms |`);
    lines.push('');

    lines.push('### Token Usage');
    lines.push('');
    lines.push('| Statistic | Value |');
    lines.push('|-----------|-------|');
    lines.push(`| Mean | ${result.statistics.tokenUsage.mean.toFixed(0)} |`);
    lines.push(`| Median | ${result.statistics.tokenUsage.median.toFixed(0)} |`);
    lines.push(`| Std Dev | ${result.statistics.tokenUsage.stdDev.toFixed(0)} |`);
    lines.push(`| Min | ${result.statistics.tokenUsage.min.toFixed(0)} |`);
    lines.push(`| Max | ${result.statistics.tokenUsage.max.toFixed(0)} |`);
    lines.push('');

    const gradeEmoji = getGradeEmoji(result.assessment.grade);

    lines.push(`## ${gradeEmoji} Quality Assessment`);
    lines.push('');
    lines.push(`**Grade:** ${result.assessment.grade}`);
    lines.push(`**Score:** ${result.assessment.score}/100`);
    lines.push(`**Status:** ${result.assessment.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');

    if (result.assessment.issues.length > 0) {
      lines.push('### ❌ Issues');
      lines.push('');
      result.assessment.issues.forEach(issue => {
        lines.push(`- ${issue}`);
      });
      lines.push('');
    }

    if (result.assessment.recommendations.length > 0) {
      lines.push('### 💡 Recommendations');
      lines.push('');
      result.assessment.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }

    if (result.baseline) {
      lines.push('## 📉 Baseline Comparison');
      lines.push('');
      lines.push('| Metric | Delta | Trend |');
      lines.push('|--------|-------|-------|');
      lines.push(`| Accuracy | ${result.baseline.accuracyDelta > 0 ? '+' : ''}${result.baseline.accuracyDelta.toFixed(1)}% | ${result.baseline.accuracyDelta > 0 ? '📈' : '📉'} |`);
      lines.push(`| Latency | ${result.baseline.latencyDelta > 0 ? '+' : ''}${result.baseline.latencyDelta.toFixed(0)}ms | ${result.baseline.latencyDelta < 0 ? '📈' : '📉'} |`);
      lines.push(`| Tokens | ${result.baseline.tokenDelta > 0 ? '+' : ''}${result.baseline.tokenDelta.toFixed(0)} | ${result.baseline.tokenDelta < 0 ? '📈' : '📉'} |`);
      lines.push('');
      lines.push(`**Overall:** ${result.baseline.improved ? '✅ IMPROVED' : '⚠️ REGRESSED'}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('*Generated by skill-lint audit command*');
    lines.push('');

    return lines.join('\n');
  }
}
