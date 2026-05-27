/**
 * Keyword Validator Test Suite
 *
 * Tests the new KeywordValidator rules:
 * - description-quality-score
 * - keyword-overlap
 * - missing-critical-keywords
 * - anti-keyword-gaps
 *
 * Core triggering simulation tests remain in triggering-validator.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { KeywordValidator } from '../../src/validators/keyword-validator.js';
import type { LintConfig, Skill } from '../../src/types/index.js';
import { createMockConfig } from '../helpers/test-fixtures.js';

describe('KeywordValidator', () => {
  let validator: KeywordValidator;
  let mockConfig: LintConfig;
  let tempDir: string;

  beforeEach(() => {
    validator = new KeywordValidator();
    tempDir = join(tmpdir(), `skill-lint-kw-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(tempDir, 'test/fixtures'), { recursive: true });

    mockConfig = createMockConfig({
      scenarios: {
        structure: false,
        size: false,
        references: false,
        links: { enabled: false, checkExternal: false },
        keywords: true,
        harness: false,
      },
      testCases: {
        triggering: join(tempDir, 'test/fixtures/trigger-cases.json'),
      },
    });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createSkill(overrides: Partial<Skill> = {}): Skill {
    return {
      path: join(tempDir, 'SKILL.md'),
      content: overrides.content ?? '# Test Skill\n\nDescription of a test skill for validation.',
      metadata: {
        name: 'test-skill',
        description: overrides.metadata?.description
          ?? 'Validates TypeScript code patterns, detects anti-patterns, and helps optimize performance in React applications using best practices',
      },
      pluginRoot: tempDir,
      ...overrides,
    };
  }

  function writeTestCases(data: object): void {
    writeFileSync(
      join(tempDir, 'test/fixtures/trigger-cases.json'),
      JSON.stringify(data),
    );
  }

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('keywords');
      expect(validator.description).toContain('keyword');
    });
  });

  describe('Description Quality Score', () => {
    it('should produce a quality score', async () => {
      const skill = createSkill();
      writeTestCases({
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['typescript', 'react'],
          antiKeywords: ['python'],
          detectionPatterns: [],
          criticalKeywords: [],
        },
        tests: [
          { prompt: 'Help me with typescript', expected_skill: 'test-skill', should_trigger: true, category: 'pos' },
        ],
      });

      const result = await validator.validate(skill, mockConfig);

      const score = result.violations.find(v => v.rule === 'description-quality-score');
      expect(score).toBeDefined();
      expect(score?.message).toMatch(/score: \d+\/100/);
    });

    it('should give higher score for descriptions with action verbs', async () => {
      const skill = createSkill({
        metadata: {
          name: 'test-skill',
          description: 'Validates TypeScript patterns, checks code quality, detects anti-patterns, helps optimize performance, generates reports, and analyzes code complexity',
        },
      });
      writeTestCases({
        version: '3.0.0',
        skill: { name: 'test-skill', triggerKeywords: ['typescript'], antiKeywords: [], detectionPatterns: [], criticalKeywords: [] },
        tests: [{ prompt: 'typescript help', expected_skill: 'test-skill', should_trigger: true, category: 'pos' }],
      });

      const result = await validator.validate(skill, mockConfig);

      const score = result.violations.find(v => v.rule === 'description-quality-score');
      expect(score?.message).toMatch(/action verb/);
    });
  });

  describe('Keyword Overlap', () => {
    it('should warn about common word keywords', async () => {
      const skill = createSkill();
      writeTestCases({
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['the', 'how', 'typescript'],
          antiKeywords: [],
          detectionPatterns: [],
          criticalKeywords: [],
        },
        tests: [
          { prompt: 'the typescript', expected_skill: 'test-skill', should_trigger: true, category: 'pos' },
        ],
      });

      const result = await validator.validate(skill, mockConfig);

      const overlap = result.violations.find(v => v.rule === 'keyword-overlap');
      expect(overlap).toBeDefined();
      expect(overlap?.level).toBe('warning');
      expect(overlap?.message).toContain('the');
      expect(overlap?.message).toContain('how');
    });

    it('should not warn when all keywords are specific', async () => {
      const skill = createSkill();
      writeTestCases({
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['typescript', 'webpack', 'eslint'],
          antiKeywords: [],
          detectionPatterns: [],
          criticalKeywords: [],
        },
        tests: [
          { prompt: 'typescript webpack', expected_skill: 'test-skill', should_trigger: true, category: 'pos' },
        ],
      });

      const result = await validator.validate(skill, mockConfig);

      const overlap = result.violations.find(v => v.rule === 'keyword-overlap');
      expect(overlap).toBeUndefined();
    });
  });

  describe('Missing Critical Keywords', () => {
    it('should suggest domain terms from content', async () => {
      const skill = createSkill({
        content: '# Skill\n\nThis skill validates webpack configuration. Webpack is used for bundling. Webpack plugins are important. Webpack loaders transform files.',
      });
      writeTestCases({
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['bundling'],
          antiKeywords: [],
          detectionPatterns: [],
          criticalKeywords: [],
        },
        tests: [
          { prompt: 'bundling help', expected_skill: 'test-skill', should_trigger: true, category: 'pos' },
        ],
      });

      const result = await validator.validate(skill, mockConfig);

      const missing = result.violations.find(v => v.rule === 'missing-critical-keywords');
      expect(missing).toBeDefined();
      expect(missing?.message).toContain('webpack');
    });
  });

  describe('No Test Cases', () => {
    it('should warn when no test cases exist', async () => {
      const skill = createSkill();

      const result = await validator.validate(skill, mockConfig);

      const warning = result.violations.find(v => v.rule === 'no-test-cases');
      expect(warning).toBeDefined();
    });
  });
});
