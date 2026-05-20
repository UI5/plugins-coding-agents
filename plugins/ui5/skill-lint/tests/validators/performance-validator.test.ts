import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceValidator } from '../../src/validators/performance-validator.js';
import type { Skill, LintConfig } from '../../src/types/index.js';

describe('PerformanceValidator', () => {
  let validator: PerformanceValidator;
  let mockConfig: LintConfig;

  // Test constants aligned with default config thresholds
  const MAX_LINES = 700;
  const WARN_THRESHOLD_LINES = 600; // ~85% of max (700 * 0.7 = 490, but using 600 for clearer tests)
  const SAFE_LINES = 400; // Well under limit
  const OVER_LIMIT_LINES = 750; // Exceeds max

  beforeEach(() => {
    validator = new PerformanceValidator();
    
    mockConfig = {
      scenarios: {
        structure: false,
        triggering: false,
        performance: true,
        integration: false
      },
      adapter: 'claude-code',
      thresholds: {
        performance: { maxLines: 700, maxTokens: 4000 },
        triggering: { minAccuracy: 90 }
      },
      testCases: {},
      execution: { timeout: 60000, maxRetries: 2, parallel: false },
      formatters: { default: 'text' as const, options: { colors: true, verbose: false } },
      output: { directory: '.lint-reports', formats: ['text'] }
    };
  });

  const createMockSkill = (overrides: Partial<Skill> = {}): Skill => ({
    path: '/test/skills/test-skill/SKILL.md',
    content: 'Line 1\nLine 2\nLine 3',
    metadata: {
      name: 'test-skill',
      description: 'Test description',
      compatibility: []
    },
    pluginRoot: '/test/skills/test-skill',
    ...overrides
  });

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('performance');
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

  describe('Edge Cases', () => {
    it('should handle empty content', async () => {
      const mockSkill = createMockSkill({ content: '' });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.lineCount).toBe(0);
      expect(result.metrics?.tokens).toBe(0);
    });

    it('should handle single-line content', async () => {
      const mockSkill = createMockSkill({ content: 'Single line' });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.lineCount).toBe(1);
    });
  });
});
