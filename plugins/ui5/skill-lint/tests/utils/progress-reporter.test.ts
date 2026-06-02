/**
 * Progress Reporter Test Suite
 * 
 * Tests the real-time progress reporting system for validation sessions.
 * 
 * Coverage:
 * - Progress event handling (start, complete, error)
 * - Statistics tracking
 * - Duration formatting
 * - Verbose and silent modes
 * - Final summary generation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressReporter, createSimpleProgressCallback } from '../../src/utils/progress-reporter.js';
import type { ProgressEvent, ValidationResult, LintResult } from '../../src/types/index.js';

describe('ProgressReporter', () => {
  let reporter: ProgressReporter;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    reporter = new ProgressReporter({ verbose: false, silent: false });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Basic Operations', () => {
    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: true, silent: false });
    });

    it('should create a progress callback', () => {
      const callback = reporter.createCallback();
      
      expect(callback).toBeInstanceOf(Function);
    });

    it('should handle validator start event', () => {
      const callback = reporter.createCallback();
      const event: ProgressEvent = {
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: Date.now(),
      };

      callback(event);

      const stats = reporter.getStats();
      expect(stats.running).toBe(1);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test-validator'));
    });

    it('should handle validator complete event', () => {
      const callback = reporter.createCallback();
      const startTime = Date.now();
      
      callback({
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: startTime,
      });

      const result: ValidationResult = {
        validator: 'test-validator',
        passed: true,
        duration: 100,
        violations: [],
      };

      callback({
        type: 'validator-complete',
        validator: 'test-validator',
        timestamp: startTime + 100,
        result,
      });

      const stats = reporter.getStats();
      expect(stats.completed).toBe(1);
      expect(stats.passed).toBe(1);
    });

    it('should handle validator error event', () => {
      const callback = reporter.createCallback();
      const startTime = Date.now();
      
      callback({
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: startTime,
      });

      const errorResult: ValidationResult = {
        validator: 'test-validator',
        passed: false,
        duration: 50,
        violations: [{
          level: 'error',
          rule: 'test-error',
          message: 'Test error',
        }],
      };

      callback({
        type: 'validator-error',
        validator: 'test-validator',
        timestamp: startTime + 50,
        error: 'Validator crashed',
        result: errorResult,
      });

      const stats = reporter.getStats();
      expect(stats.errors).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it('should track multiple validators', () => {
      const callback = reporter.createCallback();
      const baseTime = Date.now();

      // Start three validators
      callback({ type: 'validator-start', validator: 'validator-1', timestamp: baseTime });
      callback({ type: 'validator-start', validator: 'validator-2', timestamp: baseTime + 10 });
      callback({ type: 'validator-start', validator: 'validator-3', timestamp: baseTime + 20 });

      const stats = reporter.getStats();
      expect(stats.total).toBe(3);
      expect(stats.running).toBe(3);
    });

    it('should calculate statistics correctly', () => {
      const callback = reporter.createCallback();
      const baseTime = Date.now();

      // Validator 1: Success
      callback({ type: 'validator-start', validator: 'validator-1', timestamp: baseTime });
      callback({
        type: 'validator-complete',
        validator: 'validator-1',
        timestamp: baseTime + 100,
        result: { validator: 'validator-1', passed: true, duration: 100, violations: [] },
      });

      // Validator 2: Error
      callback({ type: 'validator-start', validator: 'validator-2', timestamp: baseTime + 50 });
      callback({
        type: 'validator-error',
        validator: 'validator-2',
        timestamp: baseTime + 150,
        error: 'Error',
        result: { validator: 'validator-2', passed: false, duration: 100, violations: [] },
      });

      // Validator 3: Still running
      callback({ type: 'validator-start', validator: 'validator-3', timestamp: baseTime + 100 });

      const stats = reporter.getStats();
      expect(stats.total).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.errors).toBe(1);
      expect(stats.running).toBe(1);
      expect(stats.passed).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('Verbose Mode', () => {
    it('should log detailed progress in verbose mode', () => {
      reporter = new ProgressReporter({ verbose: true });
      const callback = reporter.createCallback();

      callback({
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: Date.now(),
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting'));
    });

    it('should show violation counts in verbose mode', () => {
      reporter = new ProgressReporter({ verbose: true });
      const callback = reporter.createCallback();
      const startTime = Date.now();

      callback({ type: 'validator-start', validator: 'test-validator', timestamp: startTime });

      const result: ValidationResult = {
        validator: 'test-validator',
        passed: false,
        duration: 100,
        violations: [
          { level: 'error', rule: 'test-error', message: 'Error 1' },
          { level: 'error', rule: 'test-error', message: 'Error 2' },
          { level: 'warning', rule: 'test-warning', message: 'Warning 1' },
        ],
      };

      callback({
        type: 'validator-complete',
        validator: 'test-validator',
        timestamp: startTime + 100,
        result,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2 errors, 1 warnings'));
    });

    it('should not log in non-verbose mode', () => {
      reporter = new ProgressReporter({ verbose: false });
      const callback = reporter.createCallback();

      callback({
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: Date.now(),
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Silent Mode', () => {
    it('should suppress all output in silent mode', () => {
      reporter = new ProgressReporter({ verbose: true, silent: true });
      const callback = reporter.createCallback();

      callback({
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: Date.now(),
      });

      callback({
        type: 'validator-complete',
        validator: 'test-validator',
        timestamp: Date.now() + 100,
        result: { validator: 'test-validator', passed: true, duration: 100, violations: [] },
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should still track statistics in silent mode', () => {
      reporter = new ProgressReporter({ silent: true });
      const callback = reporter.createCallback();

      callback({
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: Date.now(),
      });

      const stats = reporter.getStats();
      expect(stats.running).toBe(1);
    });
  });

  describe('Finalize', () => {
    beforeEach(() => {
      reporter = new ProgressReporter({ verbose: false, silent: false });
    });

    it('should display final summary', () => {
      const callback = reporter.createCallback();
      const baseTime = Date.now();

      callback({ type: 'validator-start', validator: 'validator-1', timestamp: baseTime });
      callback({
        type: 'validator-complete',
        validator: 'validator-1',
        timestamp: baseTime + 100,
        result: { validator: 'validator-1', passed: true, duration: 100, violations: [] },
      });

      const lintResult: LintResult = {
        skill: 'test',
        skillPath: '/test/SKILL.md',
        timestamp: new Date().toISOString(),
        passed: true,
        duration: 100,
        results: [
          { validator: 'validator-1', passed: true, duration: 100, violations: [] },
        ],
        summary: {
          totalValidators: 1,
          passedValidators: 1,
          failedValidators: 0,
          errors: 0,
          warnings: 0,
          infos: 0,
        },
      };

      reporter.finalize(lintResult);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('PASSED'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1/1 passed'));
    });

    it('should show error and warning counts in summary', () => {
      const lintResult: LintResult = {
        skill: 'test',
        skillPath: '/test/SKILL.md',
        timestamp: new Date().toISOString(),
        passed: false,
        duration: 100,
        results: [],
        summary: {
          totalValidators: 0,
          passedValidators: 0,
          failedValidators: 0,
          errors: 2,
          warnings: 1,
          infos: 0,
        },
      };

      reporter.finalize(lintResult);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('FAILED'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2 errors, 1 warnings'));
    });

    it('should not log in silent mode', () => {
      reporter = new ProgressReporter({ silent: true });
      
      const lintResult: LintResult = {
        skill: 'test',
        skillPath: '/test/SKILL.md',
        timestamp: new Date().toISOString(),
        passed: true,
        duration: 100,
        results: [],
        summary: {
          totalValidators: 0,
          passedValidators: 0,
          failedValidators: 0,
          errors: 0,
          warnings: 0,
          infos: 0,
        },
      };

      reporter.finalize(lintResult);

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Reset', () => {
    it('should clear all state', () => {
      reporter = new ProgressReporter();
      const callback = reporter.createCallback();

      callback({
        type: 'validator-start',
        validator: 'test-validator',
        timestamp: Date.now(),
      });

      expect(reporter.getStats().total).toBe(1);

      reporter.reset();

      expect(reporter.getStats().total).toBe(0);
    });
  });

  describe('Duration Formatting', () => {
    it('should format milliseconds correctly', () => {
      reporter = new ProgressReporter({ verbose: true });
      const callback = reporter.createCallback();
      const startTime = Date.now();

      callback({ type: 'validator-start', validator: 'test-validator', timestamp: startTime });
      callback({
        type: 'validator-complete',
        validator: 'test-validator',
        timestamp: startTime + 500,
        result: { validator: 'test-validator', passed: true, duration: 500, violations: [] },
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('500ms'));
    });

    it('should format seconds correctly', () => {
      reporter = new ProgressReporter({ verbose: true });
      const callback = reporter.createCallback();
      const startTime = Date.now();

      callback({ type: 'validator-start', validator: 'test-validator', timestamp: startTime });
      callback({
        type: 'validator-complete',
        validator: 'test-validator',
        timestamp: startTime + 2500,
        result: { validator: 'test-validator', passed: true, duration: 2500, violations: [] },
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2.50s'));
    });
  });
});

describe('createSimpleProgressCallback', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should create a working callback', () => {
    const callback = createSimpleProgressCallback(true);
    
    expect(callback).toBeInstanceOf(Function);
  });

  it('should log events in verbose mode', () => {
    const callback = createSimpleProgressCallback(true);

    callback({
      type: 'validator-start',
      validator: 'test-validator',
      timestamp: Date.now(),
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Starting'));
  });

  it('should not log in non-verbose mode', () => {
    const callback = createSimpleProgressCallback(false);

    callback({
      type: 'validator-start',
      validator: 'test-validator',
      timestamp: Date.now(),
    });

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
