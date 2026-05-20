/**
 * Shared test fixtures and helper functions
 * 
 * This module provides reusable mock objects for testing validators, formatters,
 * and other components. By centralizing these helpers, we ensure consistency
 * across tests and reduce duplication.
 */

import type { Skill, LintConfig, LintResult, ValidationResult } from '../../src/types/index.js';

/**
 * Creates a mock Skill object with sensible defaults.
 * 
 * Default values:
 * - path: '/test/skills/test-skill/SKILL.md'
 * - content: Basic skill content with proper structure
 * - metadata.name: 'test-skill'
 * - metadata.description: Long enough to pass validation (>50 chars)
 * - pluginRoot: '/test/skills/test-skill'
 * 
 * @param overrides - Partial Skill object to override defaults
 * @returns A complete Skill object suitable for testing
 * 
 * @example
 * ```typescript
 * const skill = createMockSkill({ content: 'Custom content' });
 * const emptySkill = createMockSkill({ content: '', metadata: { name: '', description: '', compatibility: [] }});
 * ```
 */
export function createMockSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    path: '/test/skills/test-skill/SKILL.md',
    content: '# Test Skill\n\nDescription here',
    metadata: {
      name: 'test-skill',
      description: 'Test skill description that is long enough to pass validation rules and requirements',
      compatibility: []
    },
    pluginRoot: '/test/skills/test-skill',
    ...overrides
  };
}

/**
 * Creates a mock LintResult object with sensible defaults.
 * 
 * Default values:
 * - skill: 'test-skill'
 * - passed: true
 * - duration: 100ms
 * - results: Single passing validation result
 * - summary: All validators passed, no violations
 * 
 * @param overrides - Partial LintResult object to override defaults
 * @returns A complete LintResult object suitable for testing
 * 
 * @example
 * ```typescript
 * const result = createMockResult({ passed: false });
 * const withViolations = createMockResult({
 *   results: [{
 *     validator: 'test',
 *     passed: false,
 *     duration: 10,
 *     violations: [{ level: 'error', rule: 'test', message: 'Error' }]
 *   }]
 * });
 * ```
 */
export function createMockResult(overrides: Partial<LintResult> = {}): LintResult {
  return {
    skill: 'test-skill',
    skillPath: '/test/skill/SKILL.md',
    timestamp: '2026-05-20T10:00:00.000Z',
    duration: 100,
    passed: true,
    results: [
      {
        validator: 'structure',
        passed: true,
        duration: 50,
        violations: []
      } as ValidationResult
    ],
    summary: {
      totalValidators: 1,
      passedValidators: 1,
      failedValidators: 0,
      errors: 0,
      warnings: 0,
      infos: 0
    },
    ...overrides
  };
}

/**
 * Creates a mock LintConfig object with sensible defaults.
 * 
 * Default values:
 * - All scenarios enabled
 * - Standard thresholds (700 lines, 4000 tokens, 90% accuracy)
 * - Claude Code adapter
 * - Text formatter with colors
 * 
 * @param overrides - Partial LintConfig object to override defaults
 * @returns A complete LintConfig object suitable for testing
 * 
 * @example
 * ```typescript
 * const config = createMockConfig({ scenarios: { structure: true, triggering: false }});
 * const strictConfig = createMockConfig({ 
 *   thresholds: { performance: { maxLines: 500, maxTokens: 3000 }}
 * });
 * ```
 */
export function createMockConfig(overrides: Partial<LintConfig> = {}): LintConfig {
  return {
    scenarios: {
      structure: true,
      triggering: true,
      performance: true,
      integration: true
    },
    adapter: 'claude-code',
    thresholds: {
      performance: { maxLines: 700, maxTokens: 4000 },
      triggering: { minAccuracy: 90 }
    },
    testCases: {},
    execution: { timeout: 60000, maxRetries: 2, parallel: false },
    formatters: { 
      default: 'text' as const, 
      options: { colors: true, verbose: false } 
    },
    output: { directory: '.lint-reports', formats: ['text'] },
    ...overrides
  };
}

/**
 * Test constants for performance thresholds.
 * 
 * These constants align with the default configuration values
 * and are used across multiple performance tests to ensure consistency.
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Maximum allowed lines in a skill file */
  MAX_LINES: 700,
  /** Warning threshold (lines getting close to limit) */
  WARN_THRESHOLD_LINES: 600,
  /** Safe line count (well under limit) */
  SAFE_LINES: 400,
  /** Line count that exceeds limit */
  OVER_LIMIT_LINES: 750,
  
  /** Maximum allowed tokens in a skill file */
  MAX_TOKENS: 4000,
  /** Estimated characters per token */
  CHARS_PER_TOKEN: 4
} as const;

/**
 * Test constants for triggering accuracy thresholds.
 */
export const TRIGGERING_THRESHOLDS = {
  /** Minimum accuracy percentage required */
  MIN_ACCURACY: 90,
  /** Target accuracy for production skills */
  TARGET_ACCURACY: 95,
  /** Perfect accuracy */
  PERFECT_ACCURACY: 100
} as const;
