/**
 * Main linter orchestrator — coordinates validators, collects results
 */

import { StructureValidator } from '../validators/structure-validator.js';
import { PerformanceValidator } from '../validators/performance-validator.js';
import { TriggeringValidator } from '../validators/triggering-validator.js';
import { IntegrationValidator } from '../validators/integration-validator.js';
import { BaseValidator } from '../validators/base-validator.js';
import { collectResults } from './result-collector.js';
import { loadSkill } from '../utils/file-utils.js';
import type { LintConfig, LintResult, Skill, ValidationResult } from '../types/index.js';

export class SkillLinter {
  private readonly validators: readonly BaseValidator[];

  constructor(config: LintConfig) {
    const validators: BaseValidator[] = [];

    if (config.scenarios.structure) validators.push(new StructureValidator());
    if (config.scenarios.performance) validators.push(new PerformanceValidator());
    if (config.scenarios.triggering) validators.push(new TriggeringValidator());
    if (config.scenarios.integration) validators.push(new IntegrationValidator());

    this.validators = validators;
  }

  async lint(skillPath: string, config: LintConfig): Promise<LintResult> {
    const startTime = Date.now();
    const skill = loadSkill(skillPath);
    const results = await this.runValidators(skill, config);
    return collectResults(skill, results, startTime);
  }

  async lintSkill(skill: Skill, config: LintConfig): Promise<LintResult> {
    const startTime = Date.now();
    const results = await this.runValidators(skill, config);
    return collectResults(skill, results, startTime);
  }

  private async runValidators(
    skill: Skill,
    config: LintConfig,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validator of this.validators) {
      const result = await validator.validate(skill, config);
      results.push(result);
    }

    return results;
  }
}
