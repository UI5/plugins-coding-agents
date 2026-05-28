/**
 * Audit Text Formatter
 * Terminal-friendly output with colors and emojis
 */

import { AuditFormatterBase } from './audit-formatter-base.js';
import { getGradeEmoji } from './audit-formatter-utils.js';
import type { AuditResult } from '../types/audit-types.js';

export class AuditTextFormatter extends AuditFormatterBase {
  readonly name = 'audit-text';
  readonly extension = 'txt';

  format(result: AuditResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('═'.repeat(70));
    lines.push(`🔍 HARNESS AUDIT REPORT: ${result.skill}`);
    lines.push('═'.repeat(70));
    lines.push('');

    lines.push(`📊 Summary`);
    lines.push(`   Skill: ${result.skill}`);
    lines.push(`   Iterations: ${result.iterations.length}`);
    lines.push(`   Total Duration: ${(result.totalDuration / 1000).toFixed(2)}s`);
    lines.push(`   Timestamp: ${result.timestamp}`);
    lines.push('');

    lines.push(`📈 Aggregated Metrics`);
    lines.push(`   Total Tests: ${result.aggregated.totalTests}`);
    lines.push(`   Passed: ${result.aggregated.totalPassed}`);
    lines.push(`   Failed: ${result.aggregated.totalFailed}`);
    lines.push(`   Overall Accuracy: ${result.aggregated.overallAccuracy.toFixed(1)}%`);
    lines.push(`   Total Tokens: ${result.aggregated.totalTokens.toLocaleString()}`);
    lines.push(`   Total Cost: $${result.aggregated.totalCost.toFixed(4)}`);
    lines.push('');

    lines.push(`📊 Statistical Analysis`);
    lines.push('');
    lines.push(`   Accuracy:`);
    lines.push(`      Mean: ${result.statistics.accuracy.mean.toFixed(1)}%`);
    lines.push(`      Median: ${result.statistics.accuracy.median.toFixed(1)}%`);
    lines.push(`      Std Dev: ${result.statistics.accuracy.stdDev.toFixed(1)}%`);
    lines.push(`      Range: [${result.statistics.accuracy.min.toFixed(1)}%, ${result.statistics.accuracy.max.toFixed(1)}%]`);
    if (result.statistics.accuracy.confidenceInterval) {
      const [lower, upper] = result.statistics.accuracy.confidenceInterval;
      lines.push(`      95% CI: [${lower.toFixed(1)}%, ${upper.toFixed(1)}%]`);
    }
    lines.push('');

    lines.push(`   Latency:`);
    lines.push(`      Mean: ${result.statistics.latency.mean.toFixed(0)}ms`);
    lines.push(`      Median: ${result.statistics.latency.median.toFixed(0)}ms`);
    lines.push(`      Std Dev: ${result.statistics.latency.stdDev.toFixed(0)}ms`);
    lines.push(`      Range: [${result.statistics.latency.min.toFixed(0)}ms, ${result.statistics.latency.max.toFixed(0)}ms]`);
    lines.push('');

    lines.push(`   Token Usage:`);
    lines.push(`      Mean: ${result.statistics.tokenUsage.mean.toFixed(0)}`);
    lines.push(`      Median: ${result.statistics.tokenUsage.median.toFixed(0)}`);
    lines.push(`      Std Dev: ${result.statistics.tokenUsage.stdDev.toFixed(0)}`);
    lines.push(`      Range: [${result.statistics.tokenUsage.min.toFixed(0)}, ${result.statistics.tokenUsage.max.toFixed(0)}]`);
    lines.push('');

    const gradeEmoji = getGradeEmoji(result.assessment.grade);

    lines.push(`${gradeEmoji} Quality Assessment`);
    lines.push(`   Grade: ${result.assessment.grade}`);
    lines.push(`   Score: ${result.assessment.score}/100`);
    lines.push(`   Status: ${result.assessment.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');

    if (result.assessment.issues.length > 0) {
      lines.push(`   Issues:`);
      result.assessment.issues.forEach(issue => {
        lines.push(`      ❌ ${issue}`);
      });
      lines.push('');
    }

    if (result.assessment.recommendations.length > 0) {
      lines.push(`   Recommendations:`);
      result.assessment.recommendations.forEach(rec => {
        lines.push(`      💡 ${rec}`);
      });
      lines.push('');
    }

    if (result.baseline) {
      lines.push(`📉 Baseline Comparison`);
      lines.push(`   Accuracy: ${result.baseline.accuracyDelta > 0 ? '📈' : '📉'} ${result.baseline.accuracyDelta > 0 ? '+' : ''}${result.baseline.accuracyDelta.toFixed(1)}%`);
      lines.push(`   Latency: ${result.baseline.latencyDelta < 0 ? '📈' : '📉'} ${result.baseline.latencyDelta > 0 ? '+' : ''}${result.baseline.latencyDelta.toFixed(0)}ms`);
      lines.push(`   Tokens: ${result.baseline.tokenDelta < 0 ? '📈' : '📉'} ${result.baseline.tokenDelta > 0 ? '+' : ''}${result.baseline.tokenDelta.toFixed(0)}`);
      lines.push(`   Overall: ${result.baseline.improved ? '✅ IMPROVED' : '⚠️ REGRESSED'}`);
      lines.push('');
    }

    lines.push('═'.repeat(70));
    lines.push('');

    return lines.join('\n');
  }
}
