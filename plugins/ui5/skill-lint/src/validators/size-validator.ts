/**
 * Size Validator
 * Checks SKILL.md line count, token budget, and context window efficiency.
 *
 * Extracted from the original PerformanceValidator — only size-related rules remain.
 * Reference file analysis and README checks moved to reference-validator.
 */

import { BaseValidator } from './base-validator.js';
import { estimateTokens, countLinesFromContent } from '../utils/file-utils.js';
import { PERFORMANCE_THRESHOLDS } from '../utils/constants.js';
import type { ValidationResult, Violation, Skill, LintConfig } from '../types/index.js';

export class SizeValidator extends BaseValidator {
  readonly name = 'size';
  readonly description = 'Checks file sizes, token budgets, and context efficiency';

  async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];

    const maxLines = config.thresholds.size.maxLines;
    const maxTokens = config.thresholds.size.maxTokens;

    // ── SKILL.md line count ──
    const lineCount = countLinesFromContent(skill.content);
    if (lineCount === 0) {
      violations.push(this.createViolation('error', 'skill-empty', 'SKILL.md is empty'));
    } else if (lineCount > maxLines) {
      violations.push(this.createViolation('error', 'skill-too-large',
        `SKILL.md is ${lineCount} lines — max ${maxLines}`,
        { file: skill.path, suggestion: 'Move detailed content to reference files' }));
    } else if (lineCount > maxLines * PERFORMANCE_THRESHOLDS.LINE_WARNING_THRESHOLD) {
      violations.push(this.createViolation('warning', 'skill-getting-large',
        `SKILL.md is ${lineCount} lines (${Math.round(lineCount / maxLines * 100)}% of ${maxLines} limit)`,
        { file: skill.path, suggestion: 'Consider using reference files for detailed sections' }));
    }

    // ── Token budget ──
    const tokens = estimateTokens(skill.content);
    if (tokens > maxTokens) {
      violations.push(this.createViolation('error', 'token-budget-exceeded',
        `SKILL.md is ~${tokens} tokens — max ${maxTokens}`,
        { file: skill.path }));
    }

    // ── Total context budget (skill + metadata) ──
    const metadataOverhead = PERFORMANCE_THRESHOLDS.METADATA_OVERHEAD_TOKENS;
    const totalTokens = tokens + metadataOverhead;
    const contextLimit = PERFORMANCE_THRESHOLDS.MAX_CONTEXT_BUDGET;
    if (totalTokens > contextLimit) {
      violations.push(this.createViolation('warning', 'context-budget',
        `Total context budget is ~${totalTokens} tokens (${(totalTokens / PERFORMANCE_THRESHOLDS.CONTEXT_WINDOW_SIZE * 100).toFixed(1)}% of context window)`,
        { suggestion: `Keep total plugin context under ${PERFORMANCE_THRESHOLDS.MAX_CONTEXT_BUDGET / 1000}k tokens` }));
    }

    return this.buildResult(violations, start, {
      lineCount,
      tokens,
      totalTokens,
    });
  }
}
