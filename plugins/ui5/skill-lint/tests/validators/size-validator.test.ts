/**
 * Size Validator Test Suite
 *
 * Tests the SizeValidator which checks SKILL.md resource usage:
 * - Line count limits (max 700 lines, warning at 70% = ~490 lines)
 * - Token budget estimation (max 4000 tokens, ~4 chars per token)
 * - Context efficiency (total context under 10k tokens including metadata)
 * - Empty content edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SizeValidator } from '../../src/validators/size-validator.js';
import type { LintConfig } from '../../src/types/index.js';
import {
  createMockSkill,
  createMockConfig,
  PERFORMANCE_THRESHOLDS
} from '../helpers/test-fixtures.js';

describe('SizeValidator', () => {
  let validator: SizeValidator;
  let mockConfig: LintConfig;

  const { MAX_LINES, WARN_THRESHOLD_LINES, SAFE_LINES, OVER_LIMIT_LINES } = PERFORMANCE_THRESHOLDS;

  beforeEach(() => {
    validator = new SizeValidator();

    mockConfig = createMockConfig({
      scenarios: {
        structure: false,
        size: true,
        references: false,
        links: { enabled: false, checkExternal: false },
        keywords: false,
        harness: false,
      }
    });
  });

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('size');
      expect(validator.description).toContain('file sizes');
    });
  });

  describe('Line Counting', () => {
    it('should count lines correctly', async () => {
      const mockSkill = createMockSkill({
        content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
      });

      const result = await validator.validate(mockSkill, mockConfig);

      expect(result.metrics).toBeDefined();
      expect(result.metrics?.lineCount).toBe(5);
    });

    it('should detect when skill exceeds line limit', async () => {
      const mockSkill = createMockSkill({
        content: Array(OVER_LIMIT_LINES).fill('Line').join('\n')
      });

      const result = await validator.validate(mockSkill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'skill-too-large');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('error');
    });

    it('should warn when skill is getting close to limit', async () => {
      const mockSkill = createMockSkill({
        content: Array(WARN_THRESHOLD_LINES).fill('Line').join('\n')
      });

      const result = await validator.validate(mockSkill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'skill-getting-large');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });

    it('should pass for skills within limits', async () => {
      const mockSkill = createMockSkill({
        content: Array(SAFE_LINES).fill('Line').join('\n')
      });

      const result = await validator.validate(mockSkill, mockConfig);

      expect(result.passed).toBe(true);
    });
  });

  describe('Token Estimation', () => {
    it('should estimate tokens correctly', async () => {
      const mockSkill = createMockSkill({
        content: 'a'.repeat(4000)
      });

      const result = await validator.validate(mockSkill, mockConfig);

      expect(result.metrics?.tokens).toBeDefined();
      expect(result.metrics?.tokens).toBeGreaterThan(900);
      expect(result.metrics?.tokens).toBeLessThan(1100);
    });

    it('should detect when skill exceeds token budget', async () => {
      const mockSkill = createMockSkill({
        content: 'word '.repeat(5000)
      });

      const result = await validator.validate(mockSkill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'token-budget-exceeded');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('error');
    });
  });

  describe('Context Budget', () => {
    it('should warn when total context exceeds budget', async () => {
      const mockSkill = createMockSkill({
        content: 'word '.repeat(9000) // ~9000 tokens + metadata > 10k
      });

      const result = await validator.validate(mockSkill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'context-budget');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const mockSkill = createMockSkill({ content: '' });

      const result = await validator.validate(mockSkill, mockConfig);

      expect(result.metrics?.lineCount).toBe(0);
      expect(result.metrics?.tokens).toBe(0);
      const violation = result.violations.find(v => v.rule === 'skill-empty');
      expect(violation).toBeDefined();
    });

    it('should handle single-line content', async () => {
      const mockSkill = createMockSkill({ content: 'Single line' });

      const result = await validator.validate(mockSkill, mockConfig);

      expect(result.metrics?.lineCount).toBe(1);
    });

    it('should include totalTokens in metrics', async () => {
      const mockSkill = createMockSkill({ content: 'Some content' });

      const result = await validator.validate(mockSkill, mockConfig);

      expect(result.metrics?.totalTokens).toBeDefined();
      expect(typeof result.metrics?.totalTokens).toBe('number');
    });
  });
});
