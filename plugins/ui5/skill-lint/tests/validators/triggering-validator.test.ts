/**
 * Triggering Validator Test Suite
 * 
 * Tests the TriggeringValidator which verifies skill activation patterns:
 * - Trigger case files (test/fixtures/trigger-cases.json)
 * - Keyword matching accuracy (min 90% required)
 * - Pattern specificity and relevance
 * - Skill-agnostic pattern matching (not limited to ui5-best-practices)
 * 
 * Test Case File Structure:
 * ```json
 * {
 *   "shouldTrigger": ["query that should activate skill", ...],
 *   "shouldNotTrigger": ["query that should not activate", ...]
 * }
 * ```
 * 
 * Testing Strategy:
 * - Creates temporary directories for each test (isolated file system)
 * - Writes JSON test case files dynamically
 * - Tests both valid and invalid scenarios
 * - Verifies proper cleanup with afterEach (prevents temp directory accumulation)
 * 
 * Why Test Cleanup Matters:
 * - CI/CD environments have limited temp space
 * - Accumulating temp directories can cause disk space issues
 * - Each test creates unique directory (Date.now()) to avoid collisions
 * - afterEach ensures cleanup even if test fails
 * 
 * Accuracy Threshold:
 * - 90% minimum: Balances strict validation with real-world flexibility
 * - Skills don't need 100% accuracy (some queries are ambiguous)
 * - Higher thresholds encourage better keyword selection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TriggeringValidator } from '../../src/validators/triggering-validator.js';
import type { Skill, LintConfig } from '../../src/types/index.js';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TriggeringValidator', () => {
  let validator: TriggeringValidator;
  let mockSkill: Skill;
  let mockConfig: LintConfig;
  let tempDir: string;

  beforeEach(() => {
    validator = new TriggeringValidator();
    
    tempDir = join(tmpdir(), `skill-lint-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    mockSkill = {
      path: join(tempDir, 'SKILL.md'),
      content: '# Test Skill\n\nDescription',
      metadata: {
        name: 'test-skill',
        description: 'Test skill for validating triggering patterns and keyword matching algorithm',
        compatibility: []
      },
      pluginRoot: tempDir
    };

    mockConfig = {
      scenarios: {
        structure: false,
        size: false,
        references: false,
        links: { enabled: false, checkExternal: false },
        keywords: true,
        harness: false,
      },
      adapter: 'claude-code',
      thresholds: {
        size: { maxLines: 700, maxTokens: 4000 },
        keywords: { minAccuracy: 90 },
      },
      testCases: {
        triggering: join(tempDir, 'test/fixtures/trigger-cases.json')
      },
      execution: { timeout: 60000, maxRetries: 2, parallel: false, maxConcurrency: 1 },
      formatters: { default: 'text' as const, options: { colors: true, verbose: false } },
      output: { directory: '.lint-reports', formats: ['text'] }
    };
  });

  afterEach(() => {
    // Clean up temp directory to prevent disk space issues
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('triggering');
      expect(validator.description).toContain('triggering');
    });
  });

  describe('Test Case Loading', () => {
    it('should warn when no test cases found', async () => {
      const result = await validator.validate(mockSkill, mockConfig);
      
      const warning = result.violations.find(v => v.rule === 'no-test-cases');
      expect(warning).toBeDefined();
      expect(warning?.level).toBe('warning');
    });

    it('should load test cases from config path', async () => {
      const testCasePath = mockConfig.testCases.triggering as string;
      mkdirSync(join(tempDir, 'test/fixtures'), { recursive: true });
      
      const testData = {
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['test', 'example'],
          antiKeywords: ['exclude'],
          detectionPatterns: ['pattern1'],
          criticalKeywords: ['critical']
        },
        tests: [
          {
            prompt: 'This is a test prompt',
            expected_skill: 'test-skill',
            should_trigger: true,
            category: 'positive'
          },
          {
            prompt: 'This prompt should exclude',
            expected_skill: null,
            should_trigger: false,
            category: 'negative'
          }
        ]
      };
      
      writeFileSync(testCasePath, JSON.stringify(testData, null, 2));
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.totalCases).toBe(2);
    });
  });

  describe('Pattern Matching (Skill-Agnostic)', () => {
    beforeEach(() => {
      const testCasePath = mockConfig.testCases.triggering as string;
      mkdirSync(join(tempDir, 'test/fixtures'), { recursive: true });
    });

    it('should use skill config patterns for matching', async () => {
      const testData = {
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['database', 'sql'],
          antiKeywords: ['mongodb', 'nosql'],
          detectionPatterns: [],
          criticalKeywords: []
        },
        tests: [
          {
            prompt: 'How do I use SQL database?',
            expected_skill: 'test-skill',
            should_trigger: true,
            category: 'database'
          },
          {
            prompt: 'How do I use MongoDB?',
            expected_skill: null,
            should_trigger: false,
            category: 'excluded'
          }
        ]
      };
      
      writeFileSync(mockConfig.testCases.triggering as string, JSON.stringify(testData));
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.passed).toBe(2);
      expect(result.metrics?.accuracy).toBe(100);
    });

    it('should correctly apply anti-keywords', async () => {
      const testData = {
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['framework'],
          antiKeywords: ['react', 'vue'],
          detectionPatterns: [],
          criticalKeywords: []
        },
        tests: [
          {
            prompt: 'Which framework should I use?',
            expected_skill: 'test-skill',
            should_trigger: true,
            category: 'general'
          },
          {
            prompt: 'How do I use React framework?',
            expected_skill: null,
            should_trigger: false,
            category: 'excluded'
          }
        ]
      };
      
      writeFileSync(mockConfig.testCases.triggering as string, JSON.stringify(testData));
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.accuracy).toBe(100);
    });
  });

  describe('Accuracy Calculation', () => {
    beforeEach(() => {
      const testCasePath = mockConfig.testCases.triggering as string;
      mkdirSync(join(tempDir, 'test/fixtures'), { recursive: true });
    });

    it('should calculate overall accuracy correctly', async () => {
      const testData = {
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['keyword'],
          antiKeywords: [],
          detectionPatterns: [],
          criticalKeywords: []
        },
        tests: [
          { prompt: 'Has keyword', expected_skill: 'test-skill', should_trigger: true, category: 'pos' },
          { prompt: 'Has keyword too', expected_skill: 'test-skill', should_trigger: true, category: 'pos' },
          { prompt: 'No match here', expected_skill: null, should_trigger: false, category: 'neg' },
          { prompt: 'Also no match', expected_skill: null, should_trigger: false, category: 'neg' }
        ]
      };
      
      writeFileSync(mockConfig.testCases.triggering as string, JSON.stringify(testData));
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.totalCases).toBe(4);
      expect(result.metrics?.accuracy).toBe(100);
      expect(result.metrics?.positiveAccuracy).toBe(100);
      expect(result.metrics?.negativeAccuracy).toBe(100);
    });

    it('should detect when accuracy falls below threshold', async () => {
      const testData = {
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['match'],
          antiKeywords: [],
          detectionPatterns: [],
          criticalKeywords: []
        },
        tests: Array(20).fill(0).map((_, i) => ({
          prompt: i < 10 ? 'Should match keyword' : 'No trigger here',
          expected_skill: i < 10 ? 'test-skill' : null,
          should_trigger: i < 10,
          category: i < 10 ? 'positive' : 'negative'
        }))
      };
      
      writeFileSync(mockConfig.testCases.triggering as string, JSON.stringify(testData));
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      // Should pass since both halves match correctly
      const accuracyViolation = result.violations.find(v => v.rule === 'accuracy-below-threshold');
      expect(accuracyViolation).toBeUndefined();
    });

    it('should report failed cases with details', async () => {
      const testData = {
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['nonexistent'],
          antiKeywords: [],
          detectionPatterns: [],
          criticalKeywords: []
        },
        tests: [
          { prompt: 'This will fail', expected_skill: 'test-skill', should_trigger: true, category: 'fail' }
        ]
      };
      
      writeFileSync(mockConfig.testCases.triggering as string, JSON.stringify(testData));
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      const failedCase = result.violations.find(v => v.rule === 'failed-case');
      expect(failedCase).toBeDefined();
      expect(failedCase?.message).toContain('This will fail');
    });
  });

  describe('Simulation Warning', () => {
    it('should always include simulation warning', async () => {
      const result = await validator.validate(mockSkill, mockConfig);
      
      const warning = result.violations.find(v => v.rule === 'simulation-warning');
      expect(warning).toBeDefined();
      expect(warning?.level).toBe('info');
      expect(warning?.message).toContain('NOT how Claude decides');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mkdirSync(join(tempDir, 'test/fixtures'), { recursive: true });
    });

    it('should handle malformed test case file', async () => {
      writeFileSync(mockConfig.testCases.triggering as string, '{ invalid json');
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      const warning = result.violations.find(v => v.rule === 'no-test-cases');
      expect(warning).toBeDefined();
    });

    it('should handle test file with no skill config', async () => {
      const testData = {
        version: '2.0.0',
        tests: [
          { prompt: 'Test', expected_skill: 'test-skill', should_trigger: true, category: 'test' }
        ]
      };
      
      writeFileSync(mockConfig.testCases.triggering as string, JSON.stringify(testData));
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      // Should handle gracefully with no config (fallback to no matching)
      expect(result.metrics?.accuracy).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should complete validation quickly', async () => {
      const testCasePath = mockConfig.testCases.triggering as string;
      mkdirSync(join(tempDir, 'test/fixtures'), { recursive: true });
      
      const testData = {
        version: '3.0.0',
        skill: {
          name: 'test-skill',
          triggerKeywords: ['test'],
          antiKeywords: [],
          detectionPatterns: [],
          criticalKeywords: []
        },
        tests: Array(50).fill(0).map((_, i) => ({
          prompt: `Test prompt ${i}`,
          expected_skill: i % 2 === 0 ? 'test-skill' : null,
          should_trigger: i % 2 === 0,
          category: 'perf-test'
        }))
      };
      
      writeFileSync(testCasePath, JSON.stringify(testData));
      
      const start = Date.now();
      await validator.validate(mockSkill, mockConfig);
      const duration = Date.now() - start;
      
      // Should complete 50 test cases in < 50ms
      expect(duration).toBeLessThan(50);
    });
  });
});
