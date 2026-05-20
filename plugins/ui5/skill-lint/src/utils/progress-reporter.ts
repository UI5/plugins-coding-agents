/**
 * Progress Reporter for Streaming Validation Results
 * 
 * Provides real-time progress updates during long-running validations,
 * with support for both sequential and parallel execution modes.
 * 
 * Features:
 * - Live validator status updates
 * - Duration tracking per validator
 * - Error highlighting
 * - Violation summaries
 * - Configurable verbosity
 * 
 * @example
 * ```typescript
 * const reporter = new ProgressReporter({ verbose: true });
 * 
 * const config = {
 *   ...baseConfig,
 *   execution: {
 *     ...baseConfig.execution,
 *     onProgress: reporter.createCallback(),
 *   },
 * };
 * 
 * const result = await linter.lint(skillPath, config);
 * reporter.finalize(result);
 * ```
 */

import type { ProgressEvent, ProgressCallback, LintResult } from '../types/index.js';

export interface ProgressReporterOptions {
  /**
   * Show detailed information about each validator
   */
  verbose?: boolean;

  /**
   * Enable ANSI color codes for terminal output
   */
  colors?: boolean;

  /**
   * Suppress all output (for testing or silent mode)
   */
  silent?: boolean;
}

interface ValidatorProgress {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  startTime?: number;
  endTime?: number;
  duration?: number;
  passed?: boolean;
  errorCount?: number;
  warningCount?: number;
}

/**
 * Real-time progress reporter for validation sessions.
 * 
 * Tracks validator execution state and provides formatted output
 * as validation progresses.
 */
export class ProgressReporter {
  private readonly options: Required<ProgressReporterOptions>;
  private readonly validators = new Map<string, ValidatorProgress>();
  private startTime = 0;

  constructor(options: ProgressReporterOptions = {}) {
    this.options = {
      verbose: options.verbose ?? false,
      colors: options.colors ?? true,
      silent: options.silent ?? false,
    };
  }

  /**
   * Create a progress callback for use in LintConfig.
   * 
   * @returns Progress callback function
   * 
   * @example
   * ```typescript
   * const config = {
   *   execution: {
   *     onProgress: reporter.createCallback(),
   *   },
   * };
   * ```
   */
  createCallback(): ProgressCallback {
    return (event: ProgressEvent) => this.handleEvent(event);
  }

  /**
   * Handle a progress event from the linter.
   */
  private handleEvent(event: ProgressEvent): void {
    switch (event.type) {
      case 'validator-start':
        this.handleStart(event);
        break;
      case 'validator-complete':
        this.handleComplete(event);
        break;
      case 'validator-error':
        this.handleError(event);
        break;
    }
  }

  /**
   * Handle validator start event
   */
  private handleStart(event: ProgressEvent): void {
    if (this.startTime === 0) {
      this.startTime = event.timestamp;
    }

    this.validators.set(event.validator, {
      name: event.validator,
      status: 'running',
      startTime: event.timestamp,
    });

    if (!this.options.silent && this.options.verbose) {
      this.log(`▶️  ${event.validator}: Starting...`);
    }
  }

  /**
   * Handle validator complete event
   */
  private handleComplete(event: ProgressEvent): void {
    const progress = this.validators.get(event.validator);
    if (!progress) return;

    const duration = event.timestamp - (progress.startTime ?? event.timestamp);
    const result = event.result;

    if (result) {
      const errorCount = result.violations.filter(v => v.level === 'error').length;
      const warningCount = result.violations.filter(v => v.level === 'warning').length;

      progress.status = 'complete';
      progress.endTime = event.timestamp;
      progress.duration = duration;
      progress.passed = result.passed;
      progress.errorCount = errorCount;
      progress.warningCount = warningCount;

      if (!this.options.silent && this.options.verbose) {
        const statusIcon = result.passed ? '✅' : '❌';
        const violationText = errorCount > 0 || warningCount > 0
          ? ` (${errorCount} errors, ${warningCount} warnings)`
          : '';
        this.log(`${statusIcon} ${event.validator}: ${this.formatDuration(duration)}${violationText}`);
      }
    }
  }

  /**
   * Handle validator error event
   */
  private handleError(event: ProgressEvent): void {
    const progress = this.validators.get(event.validator);
    if (!progress) return;

    const duration = event.timestamp - (progress.startTime ?? event.timestamp);

    progress.status = 'error';
    progress.endTime = event.timestamp;
    progress.duration = duration;
    progress.passed = false;

    if (!this.options.silent && this.options.verbose) {
      this.log(`❌ ${event.validator}: ERROR after ${this.formatDuration(duration)}`);
      if (event.error) {
        this.log(`   ${event.error}`);
      }
    }
  }

  /**
   * Display final summary after validation completes.
   * 
   * @param result - Final lint result
   * 
   * @example
   * ```typescript
   * const result = await linter.lint(skillPath, config);
   * reporter.finalize(result);
   * ```
   */
  finalize(result: LintResult): void {
    if (this.options.silent) return;

    const totalDuration = Date.now() - this.startTime;
    const totalValidators = this.validators.size;
    const passedValidators = Array.from(this.validators.values())
      .filter(v => v.passed).length;
    const errorCount = result.summary.errors;
    const warningCount = result.summary.warnings;

    this.log('');
    this.log('─'.repeat(60));
    this.log(`Validation ${result.passed ? 'PASSED' : 'FAILED'}`);
    this.log(`Validators: ${passedValidators}/${totalValidators} passed`);
    
    if (errorCount > 0 || warningCount > 0) {
      this.log(`Issues: ${errorCount} errors, ${warningCount} warnings`);
    }
    
    this.log(`Duration: ${this.formatDuration(totalDuration)}`);
    this.log('─'.repeat(60));
  }

  /**
   * Get current progress statistics.
   * 
   * @returns Progress statistics object
   * 
   * @example
   * ```typescript
   * const stats = reporter.getStats();
   * console.log(`Progress: ${stats.completed}/${stats.total}`);
   * ```
   */
  getStats() {
    const validators = Array.from(this.validators.values());
    return {
      total: validators.length,
      pending: validators.filter(v => v.status === 'pending').length,
      running: validators.filter(v => v.status === 'running').length,
      completed: validators.filter(v => v.status === 'complete').length,
      errors: validators.filter(v => v.status === 'error').length,
      passed: validators.filter(v => v.passed === true).length,
      failed: validators.filter(v => v.passed === false).length,
    };
  }

  /**
   * Reset reporter state for a new validation run.
   */
  reset(): void {
    this.validators.clear();
    this.startTime = 0;
  }

  /**
   * Format duration in human-readable format.
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  /**
   * Log a message with optional color support.
   */
  private log(message: string): void {
    console.log(message);
  }
}

/**
 * Create a simple progress callback that logs to console.
 * 
 * Convenience function for quick progress reporting without
 * creating a full ProgressReporter instance.
 * 
 * @param verbose - Show detailed progress information
 * @returns Progress callback function
 * 
 * @example
 * ```typescript
 * const config = {
 *   execution: {
 *     onProgress: createSimpleProgressCallback(true),
 *   },
 * };
 * ```
 */
export function createSimpleProgressCallback(verbose = false): ProgressCallback {
  return (event: ProgressEvent) => {
    if (!verbose) return;

    switch (event.type) {
      case 'validator-start':
        console.log(`▶️  ${event.validator}: Starting...`);
        break;
      case 'validator-complete':
        console.log(`✅ ${event.validator}: Complete`);
        break;
      case 'validator-error':
        console.log(`❌ ${event.validator}: ERROR`);
        if (event.error) {
          console.log(`   ${event.error}`);
        }
        break;
    }
  };
}
