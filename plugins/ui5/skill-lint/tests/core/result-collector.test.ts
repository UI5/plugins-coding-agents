/**
 * Result Collector Test Suite
 *
 * Tests the result aggregation and summary logic.
 */

import { describe, it, expect } from 'vitest';
import { collectResults } from '../../src/core/result-collector.js';
import { createMockSkill } from '../helpers/test-fixtures.js';
import type { ValidationResult } from '../../src/types/index.js';

describe('collectResults', () => {
  const mockSkill = createMockSkill();

  it('should collect results with no violations', () => {
    const results: ValidationResult[] = [
      {
        validator: 'structure',
        passed: true,
        violations: [],
        duration: 10,
      },
      {
        validator: 'size',
        passed: true,
        violations: [],
        duration: 5,
      },
    ];

    const collected = collectResults(mockSkill, results, Date.now() - 20);

    expect(collected.skill).toBe('test-skill');
    expect(collected.skillPath).toBe(mockSkill.path);
    expect(collected.passed).toBe(true);
    expect(collected.summary.errors).toBe(0);
    expect(collected.summary.warnings).toBe(0);
    expect(collected.summary.infos).toBe(0);
    expect(collected.summary.totalValidators).toBe(2);
    expect(collected.duration).toBeGreaterThanOrEqual(0);
  });

  it('should collect results with error violations', () => {
    const results: ValidationResult[] = [
      {
        validator: 'size',
        passed: false,
        violations: [
          {
            level: 'error',
            rule: 'skill-empty',
            message: 'SKILL.md is empty',
          },
        ],
        duration: 5,
      },
    ];

    const collected = collectResults(mockSkill, results, Date.now() - 10);

    expect(collected.passed).toBe(false);
    expect(collected.summary.errors).toBe(1);
    expect(collected.summary.warnings).toBe(0);
    expect(collected.summary.infos).toBe(0);
  });

  it('should collect results with warning violations', () => {
    const results: ValidationResult[] = [
      {
        validator: 'size',
        passed: true,
        violations: [
          {
            level: 'warning',
            rule: 'skill-getting-large',
            message: 'SKILL.md is getting large',
          },
        ],
        duration: 5,
      },
    ];

    const collected = collectResults(mockSkill, results, Date.now() - 10);

    expect(collected.passed).toBe(true); // Warnings don't fail
    expect(collected.summary.errors).toBe(0);
    expect(collected.summary.warnings).toBe(1);
    expect(collected.summary.infos).toBe(0);
  });

  it('should collect results with info violations', () => {
    const results: ValidationResult[] = [
      {
        validator: 'keywords',
        passed: true,
        violations: [
          {
            level: 'info',
            rule: 'simulation-warning',
            message: 'This is a simulation',
          },
        ],
        duration: 5,
      },
    ];

    const collected = collectResults(mockSkill, results, Date.now() - 10);

    expect(collected.passed).toBe(true);
    expect(collected.summary.errors).toBe(0);
    expect(collected.summary.warnings).toBe(0);
    expect(collected.summary.infos).toBe(1);
  });

  it('should collect results with mixed violation levels', () => {
    const results: ValidationResult[] = [
      {
        validator: 'size',
        passed: false,
        violations: [
          {
            level: 'error',
            rule: 'skill-empty',
            message: 'Empty',
          },
          {
            level: 'warning',
            rule: 'skill-large',
            message: 'Large',
          },
          {
            level: 'info',
            rule: 'info-rule',
            message: 'Info',
          },
        ],
        duration: 5,
      },
    ];

    const collected = collectResults(mockSkill, results, Date.now() - 10);

    expect(collected.passed).toBe(false);
    expect(collected.summary.errors).toBe(1);
    expect(collected.summary.warnings).toBe(1);
    expect(collected.summary.infos).toBe(1);
  });

  it('should aggregate results from multiple validators', () => {
    const results: ValidationResult[] = [
      {
        validator: 'structure',
        passed: false,
        violations: [
          { level: 'error', rule: 'missing-file', message: 'Missing' },
        ],
        duration: 10,
      },
      {
        validator: 'size',
        passed: true,
        violations: [
          { level: 'warning', rule: 'getting-large', message: 'Large' },
        ],
        duration: 5,
      },
      {
        validator: 'keywords',
        passed: true,
        violations: [
          { level: 'info', rule: 'info', message: 'Info' },
        ],
        duration: 3,
      },
    ];

    const collected = collectResults(mockSkill, results, Date.now() - 20);

    expect(collected.passed).toBe(false); // Has error
    expect(collected.summary.totalValidators).toBe(3);
    expect(collected.summary.errors).toBe(1);
    expect(collected.summary.warnings).toBe(1);
    expect(collected.summary.infos).toBe(1);
    expect(collected.results).toHaveLength(3);
  });

  it('should calculate total duration correctly', () => {
    const startTime = Date.now() - 100;
    const results: ValidationResult[] = [
      {
        validator: 'size',
        passed: true,
        violations: [],
        duration: 50,
      },
    ];

    const collected = collectResults(mockSkill, results, startTime);

    expect(collected.duration).toBeGreaterThanOrEqual(100);
  });

  it('should handle empty results array', () => {
    const results: ValidationResult[] = [];

    const collected = collectResults(mockSkill, results, Date.now() - 5);

    expect(collected.passed).toBe(true); // No errors = pass
    expect(collected.summary.totalValidators).toBe(0);
    expect(collected.summary.errors).toBe(0);
    expect(collected.summary.warnings).toBe(0);
    expect(collected.summary.infos).toBe(0);
    expect(collected.results).toHaveLength(0);
  });

  it('should preserve all validation results', () => {
    const results: ValidationResult[] = [
      {
        validator: 'structure',
        passed: true,
        violations: [],
        duration: 10,
        metrics: { fileCount: 5 },
      },
      {
        validator: 'size',
        passed: true,
        violations: [],
        duration: 5,
        metrics: { lineCount: 100 },
      },
    ];

    const collected = collectResults(mockSkill, results, Date.now() - 20);

    expect(collected.results).toHaveLength(2);
    expect(collected.results[0].validator).toBe('structure');
    expect(collected.results[0].metrics).toEqual({ fileCount: 5 });
    expect(collected.results[1].validator).toBe('size');
    expect(collected.results[1].metrics).toEqual({ lineCount: 100 });
  });
});
