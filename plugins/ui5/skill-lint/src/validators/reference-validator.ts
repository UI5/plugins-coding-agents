/**
 * Reference Validator
 * Analyzes reference file usage, README conciseness, duplicate content, and fixture sizes.
 *
 * Includes rules moved from PerformanceValidator plus new reference-analysis rules:
 * - should-use-references: Suggests splitting large skills into reference files
 * - reference-loading-instructions: Checks that referenced files have loading guidance
 * - reference-file-count: Informational count of reference files with token estimate
 */

import { access, readdir, readFile, stat, constants } from 'fs/promises';
import { join } from 'path';
import { BaseValidator } from './base-validator.js';
import { estimateTokens, countLinesFromContent } from '../utils/file-utils.js';
import { PERFORMANCE_THRESHOLDS, REFERENCE_THRESHOLDS } from '../utils/constants.js';
import { retryOperation } from '../utils/retry.js';
import type { ValidationResult, Violation, Skill, LintConfig } from '../types/index.js';

export class ReferenceValidator extends BaseValidator {
  readonly name = 'references';
  readonly description = 'Analyzes reference file usage, README conciseness, and duplicate content';

  async validate(skill: Skill, _config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];
    const root = skill.pluginRoot;

    const [refViolations, readmeViolations, duplicateViolations, fixtureViolations, splitViolations] = await Promise.all([
      this.checkReferenceFiles(skill),
      this.checkReadmeConciseness(root),
      this.checkDuplicateContent(root, skill),
      this.checkFixtureSize(root),
      this.checkShouldSplit(skill),
    ]);

    violations.push(
      ...refViolations,
      ...readmeViolations,
      ...duplicateViolations,
      ...fixtureViolations,
      ...splitViolations,
    );

    return this.buildResult(violations, start);
  }

  private async checkReferenceFiles(skill: Skill): Promise<Violation[]> {
    const violations: Violation[] = [];
    const skillDir = join(skill.path, '..');

    try {
      const files = await retryOperation(() => readdir(skillDir));
      const refs = files.filter(f => f !== 'SKILL.md' && f.endsWith('.md'));

      if (refs.length > 0) {
        // ── reference-file-count (INFO) ──
        let totalTokens = 0;
        for (const ref of refs) {
          try {
            const content = await readFile(join(skillDir, ref), 'utf-8');
            totalTokens += estimateTokens(content);
          } catch {
            // File may be unreadable
          }
        }

        violations.push(this.createViolation('info', 'reference-file-count',
          `Found ${refs.length} reference file(s) (~${totalTokens} tokens): ${refs.join(', ')}`));

        // ── reference-loading-instructions (WARNING) ──
        const loadingPatterns = [
          /\bread_file\b/i,
          /\bload\b/i,
          /\bread\b.*\breference/i,
          /\breference.*\bread\b/i,
          /\bsee\b.*\breferences?\//i,
          /\bfetch.*file/i,
        ];
        const hasLoadingInstruction = loadingPatterns.some(p => p.test(skill.content));
        if (!hasLoadingInstruction) {
          violations.push(this.createViolation('warning', 'reference-loading-instructions',
            `${refs.length} reference file(s) exist but SKILL.md has no loading/read instructions`,
            { suggestion: 'Add instructions telling the agent to read_file the reference files when needed' }));
        }
      }

      // ── reference-files (INFO — backward compat) ──
      if (refs.length > 0) {
        violations.push(this.createViolation('info', 'reference-files',
          `Found ${refs.length} reference file(s): ${refs.join(', ')}`));
      }
    } catch {
      // Skill directory may not be accessible
    }

    return violations;
  }

  private async checkShouldSplit(skill: Skill): Promise<Violation[]> {
    const violations: Violation[] = [];
    const lineCount = countLinesFromContent(skill.content);
    const skillDir = join(skill.path, '..');

    if (lineCount <= REFERENCE_THRESHOLDS.SHOULD_SPLIT_LINES) {
      return violations;
    }

    // Check if references/ directory already exists
    let hasRefsDir = false;
    try {
      const files = await retryOperation(() => readdir(skillDir));
      const refs = files.filter(f => f !== 'SKILL.md' && f.endsWith('.md'));
      hasRefsDir = refs.length > 0;
    } catch {
      // Directory may not be accessible
    }

    if (!hasRefsDir) {
      violations.push(this.createViolation('warning', 'should-use-references',
        `SKILL.md is ${lineCount} lines with no reference files — consider splitting detailed content`,
        { suggestion: 'Create reference .md files alongside SKILL.md for detailed sections' }));
    }

    return violations;
  }

  private async checkReadmeConciseness(root: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const readmePath = join(root, 'README.md');
    try {
      await retryOperation(() => access(readmePath, constants.R_OK));
      const content = await readFile(readmePath, 'utf-8');
      const readmeLines = countLinesFromContent(content);
      if (readmeLines > PERFORMANCE_THRESHOLDS.MAX_README_LINES) {
        violations.push(this.createViolation('warning', 'readme-too-long',
          `README.md is ${readmeLines} lines — recommend ≤ ${PERFORMANCE_THRESHOLDS.MAX_README_LINES}`,
          { file: readmePath }));
      }
    } catch {
      // README.md may not exist
    }
    return violations;
  }

  private async checkFixtureSize(root: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const fixturesPath = join(root, 'test/fixtures/trigger-cases.json');
    try {
      const stats = await retryOperation(() => stat(fixturesPath));
      const size = stats.size;
      if (size > PERFORMANCE_THRESHOLDS.MAX_FIXTURE_SIZE_BYTES) {
        violations.push(this.createViolation('warning', 'fixture-too-large',
          `trigger-cases.json is ${(size / 1024).toFixed(1)} KB — recommend < ${PERFORMANCE_THRESHOLDS.MAX_FIXTURE_SIZE_BYTES / 1024} KB`,
          { file: fixturesPath }));
      }
    } catch {
      // Fixture file may not exist
    }
    return violations;
  }

  private async checkDuplicateContent(root: string, skill: Skill): Promise<Violation[]> {
    const violations: Violation[] = [];
    const readmePath = join(root, 'README.md');

    try {
      await retryOperation(() => access(readmePath, constants.R_OK));
    } catch {
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
