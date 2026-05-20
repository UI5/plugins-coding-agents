/**
 * Performance Validator
 * Checks SKILL.md size, token budget, context efficiency, and fixture sizes.
 * Migrated from performance.test.ts — all AVA dependencies removed.
 */

import { access, readdir, readFile, stat, constants } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { BaseValidator } from './base-validator.js';
import { estimateTokens, countLines, countLinesFromContent } from '../utils/file-utils.js';
import { PERFORMANCE_THRESHOLDS, TOKEN_ESTIMATION } from '../utils/constants.js';
import { retryOperation } from '../utils/retry.js';
import type { ValidationResult, Violation, Skill, LintConfig } from '../types/index.js';

export class PerformanceValidator extends BaseValidator {
  readonly name = 'performance';
  readonly description = 'Checks file sizes, token budgets, and context efficiency';

  async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];
    const root = skill.pluginRoot;

    const maxLines = config.thresholds.performance.maxLines;
    const maxTokens = config.thresholds.performance.maxTokens;

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

    // ── Reference files ──
    const skillDir = join(skill.path, '..');
    try {
      const files = await retryOperation(() => readdir(skillDir));
      const refs = files.filter(f => f !== 'SKILL.md' && f.endsWith('.md'));
      if (refs.length > 0) {
        violations.push(this.createViolation('info', 'reference-files',
          `Found ${refs.length} reference file(s): ${refs.join(', ')}`));
      }
    } catch (error) {
      // Expected: skill directory may not be accessible or may not contain additional files
    }

    // ── README conciseness ──
    const readmePath = join(root, 'README.md');
    try {
      await retryOperation(() => access(readmePath, constants.R_OK));
      const readmeLines = await countLines(readmePath);
      if (readmeLines > PERFORMANCE_THRESHOLDS.MAX_README_LINES) {
        violations.push(this.createViolation('warning', 'readme-too-long',
          `README.md is ${readmeLines} lines — recommend ≤ ${PERFORMANCE_THRESHOLDS.MAX_README_LINES}`,
          { file: readmePath }));
      }
    } catch (error) {
      // Expected: README.md may not exist
    }

    // ── Duplicate content between README & SKILL ──
    violations.push(...await this.checkDuplicateContent(root, skill));

    // ── Fixture size ──
    const fixturesPath = join(root, 'test/fixtures/trigger-cases.json');
    try {
      const stats = await retryOperation(() => stat(fixturesPath));
      const size = stats.size;
      if (size > PERFORMANCE_THRESHOLDS.MAX_FIXTURE_SIZE_BYTES) {
        violations.push(this.createViolation('warning', 'fixture-too-large',
          `trigger-cases.json is ${(size / 1024).toFixed(1)} KB — recommend < ${PERFORMANCE_THRESHOLDS.MAX_FIXTURE_SIZE_BYTES / 1024} KB`,
          { file: fixturesPath }));
      }
    } catch (error) {
      // Expected: fixture file may not exist
    }

    return this.buildResult(violations, start, {
      lineCount,
      tokens,
      totalTokens,
    });
  }

  private async checkDuplicateContent(root: string, skill: Skill): Promise<Violation[]> {
    const violations: Violation[] = [];
    const readmePath = join(root, 'README.md');

    try {
      await retryOperation(() => access(readmePath, constants.R_OK));
    } catch (error) {
      // Expected: README may not exist
      return violations;
    }

    const readmeContent = (await retryOperation(() => readFile(readmePath, 'utf-8'))).toLowerCase();
    const skillContent = skill.content.toLowerCase();

    const readmeBlocks = [...readmeContent.matchAll(/```[\s\S]*?```/g)].map(m => m[0].trim());
    const skillBlocks = [...skillContent.matchAll(/```[\s\S]*?```/g)].map(m => m[0].trim());

    let duplicates = 0;
    for (const rb of readmeBlocks) {
      if (rb.length < 50) continue;
      for (const sb of skillBlocks) {
        if (rb === sb) duplicates++;
      }
    }

    if (duplicates > 0) {
      violations.push(this.createViolation('warning', 'duplicate-code-blocks',
        `${duplicates} duplicate code block(s) found between README.md and SKILL.md`,
        { suggestion: 'Remove duplicate examples — keep them only in SKILL.md' }));
    }

    return violations;
  }
}
