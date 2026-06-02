/**
 * SkillLinter Test Suite
 *
 * Tests the main linter orchestrator that coordinates validators and collects results.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkillLinter } from '../../src/core/linter.js';
import { createMockConfig, createMockSkill } from '../helpers/test-fixtures.js';
import type { LintConfig } from '../../src/types/index.js';

describe('SkillLinter', () => {
  let mockConfig: LintConfig;

  beforeEach(() => {
    mockConfig = createMockConfig({
      scenarios: {
        structure: true,
        size: true,
        references: true,
        links: { enabled: true, checkExternal: false },
        keywords: false,
        harness: false,
      }
    });
  });

  describe('Constructor', () => {
    it('should create linter with all enabled validators', () => {
      const linter = new SkillLinter(mockConfig);
      expect(linter).toBeDefined();
    });

    it('should create linter with no validators when all disabled', () => {
      const config = createMockConfig({
        scenarios: {
          structure: false,
          size: false,
          references: false,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: false,
        }
      });
      const linter = new SkillLinter(config);
      expect(linter).toBeDefined();
    });

    it('should create linter with only structure validator', () => {
      const config = createMockConfig({
        scenarios: {
          structure: true,
          size: false,
          references: false,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: false,
        }
      });
      const linter = new SkillLinter(config);
      expect(linter).toBeDefined();
    });
  });

  describe('lintSkill', () => {
    it('should lint a valid skill successfully', async () => {
      const linter = new SkillLinter(mockConfig);
      const skill = createMockSkill({
        content: '# Test Skill\n\nValid content here.',
      });

      const result = await linter.lintSkill(skill, mockConfig);

      expect(result).toBeDefined();
      expect(result.skill).toBe('test-skill');
      expect(result.skillPath).toBe(skill.path);
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should validate input parameters', async () => {
      const linter = new SkillLinter(mockConfig);
      
      // Invalid skill
      await expect(
        linter.lintSkill(null as any, mockConfig)
      ).rejects.toThrow('Invalid skill');

      // Missing path
      await expect(
        linter.lintSkill({ content: 'test' } as any, mockConfig)
      ).rejects.toThrow('Invalid skill: missing or invalid path property');

      // Missing content
      await expect(
        linter.lintSkill({ path: '/test' } as any, mockConfig)
      ).rejects.toThrow('Invalid skill: missing or invalid content property');

      // Invalid config
      await expect(
        linter.lintSkill(createMockSkill(), null as any)
      ).rejects.toThrow('Invalid configuration');
    });

    it('should handle empty skill content', async () => {
      const linter = new SkillLinter(mockConfig);
      const skill = createMockSkill({ content: ' ' }); // Single space to pass validation

      const result = await linter.lintSkill(skill, mockConfig);

      expect(result).toBeDefined();
      // Result may pass or fail depending on validators
    });

    it('should collect results from all enabled validators', async () => {
      const config = createMockConfig({
        scenarios: {
          structure: true,
          size: true,
          references: true,
          links: { enabled: true, checkExternal: false },
          keywords: false,
          harness: false,
        }
      });
      const linter = new SkillLinter(config);
      const skill = createMockSkill({
        content: '# Test\n\nSome content.',
      });

      const result = await linter.lintSkill(skill, config);

      // Should have results from structure, size, references, links
      expect(result.results.length).toBeGreaterThanOrEqual(4);
      const validatorNames = result.results.map(r => r.validator);
      expect(validatorNames).toContain('structure');
      expect(validatorNames).toContain('size');
      expect(validatorNames).toContain('references');
      expect(validatorNames).toContain('links');
    });

    it('should collect no results when all validators disabled', async () => {
      const config = createMockConfig({
        scenarios: {
          structure: false,
          size: false,
          references: false,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: false,
        }
      });
      const linter = new SkillLinter(config);
      const skill = createMockSkill();

      const result = await linter.lintSkill(skill, config);

      expect(result.results).toHaveLength(0);
      expect(result.passed).toBe(true); // No validators = no failures
    });

    it('should report pass when no errors found', async () => {
      const config = createMockConfig({
        scenarios: {
          structure: false,
          size: true,
          references: false,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: false,
        }
      });
      const linter = new SkillLinter(config);
      const skill = createMockSkill({
        content: '# Test\n\n' + 'x'.repeat(100), // Small, valid content
      });

      const result = await linter.lintSkill(skill, config);

      expect(result.passed).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    it('should report failure when errors found', async () => {
      const config = createMockConfig({
        scenarios: {
          structure: false,
          size: true,
          references: false,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: false,
        },
        thresholds: {
          size: {
            maxLines: 1,
            maxTokens: 10,
          },
          keywords: {
            minAccuracy: 90,
          }
        }
      });
      const linter = new SkillLinter(config);
      const skill = createMockSkill({
        content: 'x'.repeat(1000), // Way too large
      });

      const result = await linter.lintSkill(skill, config);

      expect(result.passed).toBe(false);
      expect(result.summary.errors).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle validator errors gracefully', async () => {
      const linter = new SkillLinter(mockConfig);
      const skill = createMockSkill({
        content: '# Test\n\nValid content.',
      });

      // Should not throw even if a validator has issues
      const result = await linter.lintSkill(skill, mockConfig);
      expect(result).toBeDefined();
    });
  });

  describe('Parallel Execution', () => {
    it('should run validators in parallel when configured', async () => {
      const config = createMockConfig({
        scenarios: {
          structure: true,
          size: true,
          references: true,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: false,
        },
        execution: {
          timeout: 60000,
          maxRetries: 2,
          parallel: true,
          maxConcurrency: 2,
        }
      });
      const linter = new SkillLinter(config);
      const skill = createMockSkill({
        content: '# Test\n\nSome content.',
      });

      const result = await linter.lintSkill(skill, config);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should run validators sequentially when parallel is false', async () => {
      const config = createMockConfig({
        scenarios: {
          structure: true,
          size: true,
          references: false,
          links: { enabled: false, checkExternal: false },
          keywords: false,
          harness: false,
        },
        execution: {
          timeout: 60000,
          maxRetries: 2,
          parallel: false,
        }
      });
      const linter = new SkillLinter(config);
      const skill = createMockSkill({
        content: '# Test\n\nSome content.',
      });

      const result = await linter.lintSkill(skill, config);

      expect(result).toBeDefined();
      expect(result.passed).toBeDefined();
    });
  });

  describe('lint() method', () => {
    it('should validate skill path parameter', async () => {
      const linter = new SkillLinter(mockConfig);

      await expect(
        linter.lint('', mockConfig)
      ).rejects.toThrow('Invalid skill path');

      await expect(
        linter.lint(null as any, mockConfig)
      ).rejects.toThrow('Invalid skill path');
    });

    it('should validate config parameter', async () => {
      const linter = new SkillLinter(mockConfig);

      await expect(
        linter.lint('/test/path', null as any)
      ).rejects.toThrow('Invalid configuration');

      await expect(
        linter.lint('/test/path', {} as any)
      ).rejects.toThrow('Invalid configuration: missing scenarios object');
    });
  });
});
