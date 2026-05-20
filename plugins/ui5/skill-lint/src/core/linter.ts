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
import { promiseAllBatched } from '../utils/concurrency.js';
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
    // Input validation
    if (!skillPath || typeof skillPath !== 'string') {
      throw new Error('Invalid skill path: must be a non-empty string');
    }
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: must be a valid config object');
    }
    if (!config.scenarios || typeof config.scenarios !== 'object') {
      throw new Error('Invalid configuration: missing scenarios object');
    }

    const startTime = Date.now();
    const skill = await loadSkill(skillPath);
    const results = await this.runValidators(skill, config);
    return collectResults(skill, results, startTime);
  }

  async lintSkill(skill: Skill, config: LintConfig): Promise<LintResult> {
    // Input validation
    if (!skill || typeof skill !== 'object') {
      throw new Error('Invalid skill: must be a valid Skill object');
    }
    if (!skill.path || typeof skill.path !== 'string') {
      throw new Error('Invalid skill: missing or invalid path property');
    }
    if (!skill.content || typeof skill.content !== 'string') {
      throw new Error('Invalid skill: missing or invalid content property');
    }
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid configuration: must be a valid config object');
    }
    if (!config.scenarios || typeof config.scenarios !== 'object') {
      throw new Error('Invalid configuration: missing scenarios object');
    }

    const startTime = Date.now();
    const results = await this.runValidators(skill, config);
    return collectResults(skill, results, startTime);
  }

  private async runValidators(
    skill: Skill,
    config: LintConfig,
  ): Promise<ValidationResult[]> {
    // Use parallel execution if configured
    if (config.execution.parallel) {
      return this.runValidatorsParallel(skill, config);
    }
    
    return this.runValidatorsSequential(skill, config);
  }

  /**
   * Run validators sequentially with error boundaries
   */
  private async runValidatorsSequential(
    skill: Skill,
    config: LintConfig,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const validator of this.validators) {
      try {
        const result = await validator.validate(skill, config);
        results.push(result);
      } catch (error) {
        // Don't let one validator crash bring down the entire tool
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillLinter] Validator "${validator.name}" crashed:`, errorMessage);
        
        results.push({
          validator: validator.name,
          passed: false,
          duration: 0,
          violations: [{
            level: 'error',
            rule: 'validator-crash',
            message: `Validator "${validator.name}" crashed: ${errorMessage}`,
            suggestion: 'This is likely a bug in the validator. Please report this issue.',
          }],
        });
      }
    }

    return results;
  }

  /**
   * Run validators in parallel with error boundaries and concurrency control
   */
  private async runValidatorsParallel(
    skill: Skill,
    config: LintConfig,
  ): Promise<ValidationResult[]> {
    const tasks = this.validators.map(validator => async (): Promise<ValidationResult> => {
      try {
        return await validator.validate(skill, config);
      } catch (error) {
        // Don't let one validator crash bring down the entire tool
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillLinter] Validator "${validator.name}" crashed:`, errorMessage);
        
        return {
          validator: validator.name,
          passed: false,
          duration: 0,
          violations: [{
            level: 'error',
            rule: 'validator-crash',
            message: `Validator "${validator.name}" crashed: ${errorMessage}`,
            suggestion: 'This is likely a bug in the validator. Please report this issue.',
          }],
        };
      }
    });

    // Use batched execution if maxConcurrency is set
    const maxConcurrency = config.execution.maxConcurrency ?? Infinity;
    return promiseAllBatched(tasks, maxConcurrency);
  }
}
