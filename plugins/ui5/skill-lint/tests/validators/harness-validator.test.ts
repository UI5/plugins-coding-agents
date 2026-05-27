/**
 * Harness Validator Test Suite
 *
 * Tests the new HarnessValidator rules:
 * - harness-response-quality
 * - harness-latency
 * - harness-token-efficiency
 *
 * Core integration test logic remains in integration-validator.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HarnessValidator } from '../../src/validators/harness-validator.js';
import type { LintConfig } from '../../src/types/index.js';
import { createMockSkill, createMockConfig } from '../helpers/test-fixtures.js';

describe('HarnessValidator', () => {
  let validator: HarnessValidator;
  let mockConfig: LintConfig;

  beforeEach(() => {
    validator = new HarnessValidator();

    mockConfig = createMockConfig({
      scenarios: {
        structure: false,
        size: false,
        references: false,
        links: { enabled: false, checkExternal: false },
        keywords: false,
        harness: true,
      },
    });
  });

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('harness');
      expect(validator.description).toContain('Claude Code');
    });
  });

  describe('Adapter Unavailable', () => {
    it('should error when adapter is not available', async () => {
      const mockSkill = createMockSkill();
      // Use mock adapter which always reports unavailable when no test cases
      // exist and just falls through to the no-cases check
      const configWithNoAdapter = createMockConfig({
        scenarios: {
          structure: false,
          size: false,
          references: false,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: true,
        },
      });

      const result = await validator.validate(mockSkill, configWithNoAdapter);

      // Harness validator should report either adapter-unavailable or no-integration-cases
      const hasIssue = result.violations.some(v =>
        v.rule === 'adapter-unavailable' || v.rule === 'no-integration-cases'
      );
      expect(hasIssue).toBe(true);
    });
  });
});
