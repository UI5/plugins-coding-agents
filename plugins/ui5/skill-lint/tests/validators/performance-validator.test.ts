import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceValidator } from '../../src/validators/performance-validator.js';
import type { Skill, LintConfig } from '../../src/types/index.js';
import { 
  createMockSkill, 
  createMockConfig, 
  PERFORMANCE_THRESHOLDS 
} from '../helpers/test-fixtures.js';

describe('PerformanceValidator', () => {
  let validator: PerformanceValidator;
  let mockConfig: LintConfig;

  // Import test constants from shared fixtures
  const { MAX_LINES, WARN_THRESHOLD_LINES, SAFE_LINES, OVER_LIMIT_LINES } = PERFORMANCE_THRESHOLDS;

  beforeEach(() => {
    validator = new PerformanceValidator();
    
    mockConfig = createMockConfig({
      scenarios: {
        structure: false,
        triggering: false,
        performance: true,
        integration: false
      }
    });
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
