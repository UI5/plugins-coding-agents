/**
 * Abstract base validator — all validators extend this
 * 
 * Provides common functionality for creating violations and building results.
 * Each validator implements the `validate()` method to perform specific checks.
 */

import type { Violation, ValidationResult, Skill, LintConfig, ViolationLevel } from '../types/index.js';

/**
 * Base class for all validators in the skill-lint framework.
 * 
 * Validators perform specific quality checks on skill files and return
 * structured validation results with violations and metrics.
 * 
 * @abstract
 * @example
 * ```typescript
 * class MyValidator extends BaseValidator {
 *   readonly name = 'my-validator';
 *   readonly description = 'Checks my custom rules';
 * 
 *   async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
 *     const start = Date.now();
 *     const violations: Violation[] = [];
 * 
 *     if (skill.content.length === 0) {
 *       violations.push(this.createViolation('error', 'empty-skill', 'Skill content is empty'));
 *     }
 * 
 *     return this.buildResult(violations, start);
 *   }
 * }
 * ```
 */
export abstract class BaseValidator {
  /**
   * Unique validator identifier (e.g., 'structure', 'performance', 'triggering')
   * Used for result reporting and filtering
   */
  abstract readonly name: string;

  /**
   * Human-readable description of what this validator checks
   */
  abstract readonly description: string;

  /**
   * Validate a skill file against configured rules and thresholds.
   * 
   * This is the main entry point for validation logic. Implementations should:
   * 1. Perform all necessary checks
   * 2. Collect violations with appropriate severity levels
   * 3. Compute relevant metrics
   * 4. Return a structured result via `buildResult()`
   * 
   * @param skill - The loaded skill file with metadata, content, and paths
   * @param config - Lint configuration including thresholds, test paths, and execution settings
   * @returns Validation result with pass/fail status, violations, duration, and optional metrics
   * 
   * @throws Should not throw - use error boundaries in validator implementations
   *         If a critical error occurs, create an 'error' level violation instead
   * 
   * @example
   * ```typescript
   * const result = await validator.validate(skill, config);
   * if (!result.passed) {
   *   console.log(`${validator.name} found ${result.violations.length} issues`);
   *   result.violations.forEach(v => console.log(`  ${v.level}: ${v.message}`));
   * }
   * ```
   */
  abstract validate(skill: Skill, config: LintConfig): Promise<ValidationResult>;

  /**
   * Create a structured violation record.
   * 
   * Helper method to ensure consistent violation format across all validators.
   * Use this instead of manually constructing violation objects.
   * 
   * @param level - Severity level: 'error' (fails validation), 'warning' (advisory), or 'info' (informational)
   * @param rule - Unique rule identifier (e.g., 'empty-frontmatter', 'file-too-large')
   * @param message - Human-readable description of the violation
   * @param options - Optional metadata: file path, line number, and fix suggestion
   * @returns Structured violation object
   * 
   * @example
   * ```typescript
   * // Error-level violation with suggestion
   * const violation = this.createViolation(
   *   'error',
   *   'missing-description',
   *   'Skill description is required in frontmatter',
   *   { suggestion: 'Add a description field to the YAML frontmatter' }
   * );
   * 
   * // Warning with file and line info
   * const warning = this.createViolation(
   *   'warning',
   *   'description-too-short',
   *   'Description should be at least 50 characters',
   *   { file: 'SKILL.md', line: 3 }
   * );
   * ```
   */
  protected createViolation(
    level: ViolationLevel,
    rule: string,
    message: string,
    options?: { file?: string; line?: number; suggestion?: string },
  ): Violation {
    return {
      level,
      rule,
      message,
      file: options?.file,
      line: options?.line,
      suggestion: options?.suggestion,
    };
  }

  /**
   * Build a structured validation result.
   * 
   * Automatically determines pass/fail status based on presence of error-level violations.
   * Violations with 'warning' or 'info' levels do not cause validation failure.
   * 
   * @param violations - Array of violations found during validation (can be empty for clean pass)
   * @param startTime - Timestamp from `Date.now()` at validation start (for duration calculation)
   * @param metrics - Optional validator-specific metrics (e.g., test counts, accuracy percentages)
   * @returns Complete validation result with computed pass/fail status and duration
   * 
   * @example
   * ```typescript
   * async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
   *   const start = Date.now();
   *   const violations: Violation[] = [];
   * 
   *   // ... perform checks ...
   * 
   *   return this.buildResult(violations, start, {
   *     totalChecks: 10,
   *     filesScanned: 5,
   *     avgCheckDuration: 2.5,
   *   });
   * }
   * ```
   */
  protected buildResult(
    violations: readonly Violation[],
    startTime: number,
    metrics?: Record<string, unknown>,
  ): ValidationResult {
    const hasErrors = violations.some(v => v.level === 'error');
    return {
      validator: this.name,
      passed: !hasErrors,
      duration: Date.now() - startTime,
      violations,
      metrics,
    };
  }
}
