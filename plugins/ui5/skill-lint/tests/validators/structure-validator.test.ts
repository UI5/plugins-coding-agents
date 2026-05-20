import { describe, it, expect, beforeEach } from 'vitest';
import { StructureValidator } from '../../src/validators/structure-validator.js';
import type { Skill, LintConfig } from '../../src/types/index.js';

describe('StructureValidator', () => {
  let validator: StructureValidator;
  let mockConfig: LintConfig;

  beforeEach(() => {
    validator = new StructureValidator();
    
    mockConfig = {
      scenarios: {
        structure: true,
        triggering: false,
        performance: false,
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
    content: '# Test Skill\n\nDescription here',
    metadata: {
      name: 'test-skill',
      description: 'Test skill description that is long enough to pass validation rules and requirements',
      compatibility: []
    },
    pluginRoot: '/test/skills/test-skill',
    ...overrides
  });

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('structure');
      expect(validator.description).toContain('structure');
    });
  });

  describe('Skill Validation', () => {
    it('should pass for valid skill with complete structure', async () => {
      const mockSkill = createMockSkill();
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.validator).toBe('structure');
      // Note: Will have violations for missing files (plugin.json, README.md, etc.)
      // which is expected behavior for file-system-dependent validator
      expect(result.violations.length).toBeGreaterThan(0);
      
      // Check that frontmatter validations pass (no name/description errors)
      const frontmatterViolations = result.violations.filter(v => 
        v.rule.startsWith('frontmatter-')
      );
      expect(frontmatterViolations).toHaveLength(0);
    });

    it('should detect missing skill name', async () => {
      const mockSkill = createMockSkill({
        metadata: { name: '', description: 'Test', compatibility: [] }
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.passed).toBe(false);
      const nameViolation = result.violations.find(v => v.rule === 'frontmatter-name');
      expect(nameViolation).toBeDefined();
      expect(nameViolation?.level).toBe('error');
    });

    it('should detect short skill description', async () => {
      const mockSkill = createMockSkill({
        metadata: { name: 'test', description: 'Too short', compatibility: [] }
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      const descViolation = result.violations.find(v => v.rule === 'frontmatter-description-length');
      expect(descViolation).toBeDefined();
      expect(descViolation?.level).toBe('warning');
      expect(descViolation?.message).toContain('50');
    });

    it('should include duration in result', async () => {
      const mockSkill = createMockSkill();
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty skill content', async () => {
      const mockSkill = createMockSkill({ content: '' });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should not throw on invalid plugin root path', async () => {
      const mockSkill = createMockSkill({ pluginRoot: '/nonexistent/path' });
      
      await expect(validator.validate(mockSkill, mockConfig)).resolves.toBeDefined();
    });
  });
});
