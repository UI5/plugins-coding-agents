/**
 * Performance Validator
 * Checks SKILL.md size, token budget, context efficiency, and fixture sizes.
 * Migrated from performance.test.ts — all AVA dependencies removed.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { BaseValidator } from './base-validator.js';
import { estimateTokens, countLines } from '../utils/file-utils.js';
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
    const lineCount = skill.content ? skill.content.split('\n').length : 0;
    if (lineCount === 0) {
      violations.push(this.createViolation('error', 'skill-empty', 'SKILL.md is empty'));
    } else if (lineCount > maxLines) {
      violations.push(this.createViolation('error', 'skill-too-large',
        `SKILL.md is ${lineCount} lines — max ${maxLines}`,
        { file: skill.path, suggestion: 'Move detailed content to reference files' }));
    } else if (lineCount > maxLines * 0.7) {
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
    const metadataOverhead = 100; // plugin.json metadata
    const totalTokens = tokens + metadataOverhead;
    const contextLimit = 10_000; // 5% of 200k context window
    if (totalTokens > contextLimit) {
      violations.push(this.createViolation('warning', 'context-budget',
        `Total context budget is ~${totalTokens} tokens (${(totalTokens / 200_000 * 100).toFixed(1)}% of context window)`,
        { suggestion: 'Keep total plugin context under 10k tokens' }));
    }

    // ── Reference files ──
    const skillDir = join(skill.path, '..');
    if (existsSync(skillDir)) {
      const files = readdirSync(skillDir);
      const refs = files.filter(f => f !== 'SKILL.md' && f.endsWith('.md'));
      if (refs.length > 0) {
        violations.push(this.createViolation('info', 'reference-files',
          `Found ${refs.length} reference file(s): ${refs.join(', ')}`));
      }
    }

    // ── README conciseness ──
    const readmePath = join(root, 'README.md');
    if (existsSync(readmePath)) {
      const readmeLines = countLines(readmePath);
      if (readmeLines > 150) {
        violations.push(this.createViolation('warning', 'readme-too-long',
          `README.md is ${readmeLines} lines — recommend ≤ 150`,
          { file: readmePath }));
      }
    }

    // ── Duplicate content between README & SKILL ──
    violations.push(...this.checkDuplicateContent(root, skill));

    // ── Fixture size ──
    const fixturesPath = join(root, 'test/fixtures/trigger-cases.json');
    if (existsSync(fixturesPath)) {
      const size = statSync(fixturesPath).size;
      if (size > 50_000) {
        violations.push(this.createViolation('warning', 'fixture-too-large',
          `trigger-cases.json is ${(size / 1024).toFixed(1)} KB — recommend < 50 KB`,
          { file: fixturesPath }));
      }
    }

    return this.buildResult(violations, start, {
      lineCount,
      tokens,
      totalTokens,
    });
  }

  private checkDuplicateContent(root: string, skill: Skill): Violation[] {
    const violations: Violation[] = [];
    const readmePath = join(root, 'README.md');

    if (!existsSync(readmePath)) return violations;

    const readmeContent = readFileSync(readmePath, 'utf-8').toLowerCase();
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
