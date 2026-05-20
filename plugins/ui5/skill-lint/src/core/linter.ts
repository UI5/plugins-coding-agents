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
import { globalSkillCache } from '../utils/skill-cache.js';
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
    // Use cache if available (5-10x speedup for repeated runs)
    const skill = globalSkillCache
      ? await globalSkillCache.get(skillPath)
      : await loadSkill(skillPath);
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
   * Run validators sequentially with error boundaries and progress reporting
   */
  private async runValidatorsSequential(
    skill: Skill,
    config: LintConfig,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const onProgress = config.execution.onProgress;

    for (const validator of this.validators) {
      // Emit start event
      if (onProgress) {
        onProgress({
          type: 'validator-start',
          validator: validator.name,
          timestamp: Date.now(),
        });
      }

      try {
        const result = await validator.validate(skill, config);
        results.push(result);

        // Emit complete event with result
        if (onProgress) {
          onProgress({
            type: 'validator-complete',
            validator: validator.name,
            timestamp: Date.now(),
            result,
          });
        }
      } catch (error) {
        // Don't let one validator crash bring down the entire tool
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillLinter] Validator "${validator.name}" crashed:`, errorMessage);
        
        const errorResult: ValidationResult = {
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
        
        results.push(errorResult);

        // Emit error event
        if (onProgress) {
          onProgress({
            type: 'validator-error',
            validator: validator.name,
            timestamp: Date.now(),
            error: errorMessage,
            result: errorResult,
          });
        }
      }
    }

    return results;
  }

  /**
   * Run validators in parallel with error boundaries, concurrency control, and progress reporting
   */
  private async runValidatorsParallel(
    skill: Skill,
    config: LintConfig,
  ): Promise<ValidationResult[]> {
    const onProgress = config.execution.onProgress;

    const tasks = this.validators.map(validator => async (): Promise<ValidationResult> => {
      // Emit start event
      if (onProgress) {
        onProgress({
          type: 'validator-start',
          validator: validator.name,
          timestamp: Date.now(),
        });
      }

      try {
        const result = await validator.validate(skill, config);

        // Emit complete event with result
        if (onProgress) {
          onProgress({
            type: 'validator-complete',
            validator: validator.name,
            timestamp: Date.now(),
            result,
          });
        }

        return result;
      } catch (error) {
        // Don't let one validator crash bring down the entire tool
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SkillLinter] Validator "${validator.name}" crashed:`, errorMessage);
        
        const errorResult: ValidationResult = {
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

        // Emit error event
        if (onProgress) {
          onProgress({
            type: 'validator-error',
            validator: validator.name,
            timestamp: Date.now(),
            error: errorMessage,
            result: errorResult,
          });
        }

        return errorResult;
      }
    });

    // Use batched execution if maxConcurrency is set
    const maxConcurrency = config.execution.maxConcurrency ?? Infinity;
    return promiseAllBatched(tasks, maxConcurrency);
  }
}
