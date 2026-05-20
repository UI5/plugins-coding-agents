/**
 * Abstract base validator — all validators extend this
 */

import type { Violation, ValidationResult, Skill, LintConfig, ViolationLevel } from '../types/index.js';

export abstract class BaseValidator {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract validate(skill: Skill, config: LintConfig): Promise<ValidationResult>;

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
