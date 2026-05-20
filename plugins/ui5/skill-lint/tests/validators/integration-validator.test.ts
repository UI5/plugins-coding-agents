import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntegrationValidator } from '../../src/validators/integration-validator.js';
import { MockAdapter } from '../../src/adapters/mock-adapter.js';
import type { Skill, LintConfig } from '../../src/types/index.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Create a shared mock adapter instance
const mockAdapter = new MockAdapter();

// Mock the adapter registry to return our mock adapter
vi.mock('../../src/adapters/adapter-registry.js', () => ({
  getAdapter: () => mockAdapter
}));

describe('IntegrationValidator', () => {
  let validator: IntegrationValidator;
  let mockSkill: Skill;
  let mockConfig: LintConfig;
  let tempDir: string;

  beforeEach(async () => {
    validator = new IntegrationValidator();
    
    // Reset mock adapter state
    mockAdapter.clearResponses();
    mockAdapter.setAvailable(true);
    
    // Create temporary directory
    tempDir = join(tmpdir(), `skill-lint-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    mockSkill = {
      path: join(tempDir, 'SKILL.md'),
      content: '# Test Skill\n\nDescription',
      metadata: {
        name: 'test-skill',
        description: 'Test skill for integration testing',
        compatibility: []
      },
      pluginRoot: tempDir
    };

    mockConfig = {
      scenarios: {
        structure: false,
        triggering: false,
        performance: false,
        integration: true
      },
      adapter: 'mock',
      thresholds: {
        performance: { maxLines: 700, maxTokens: 4000 },
        triggering: { minAccuracy: 90 }
      },
      testCases: {
        integration: join(tempDir, 'test/integration/fixtures/test-cases.json')
      },
      execution: { timeout: 60000, maxRetries: 2, parallel: false, maxConcurrency: 1 },
      formatters: { default: 'text' as const, options: { colors: true, verbose: false } },
      output: { directory: '.lint-reports', formats: ['text'] }
    };
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('integration');
      expect(validator.description).toContain('Claude Code CLI');
    });
  });

  describe('Adapter Availability', () => {
    it('should error when adapter is not available', async () => {
      mockAdapter.setAvailable(false);
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      const error = result.violations.find(v => v.rule === 'adapter-unavailable');
      expect(error).toBeDefined();
      expect(error?.level).toBe('error');
      expect(error?.message).toContain('not available');
    });

    it('should proceed when adapter is available', async () => {
      mockAdapter.setAvailable(true);
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      const error = result.violations.find(v => v.rule === 'adapter-unavailable');
      expect(error).toBeUndefined();
    });
  });

  describe('Test Case Loading', () => {
    it('should warn when no test cases found', async () => {
      const result = await validator.validate(mockSkill, mockConfig);
      
      const warning = result.violations.find(v => v.rule === 'no-integration-cases');
      expect(warning).toBeDefined();
      expect(warning?.level).toBe('warning');
    });

    it('should load test cases from integration fixtures (JSON array)', async () => {
      const testCasePath = mockConfig.testCases.integration as string;
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
      
      const testData = [
        {
          id: 1,
          name: 'test-case-1',
          description: 'Test case 1',
          prompt: 'Test prompt 1',
          category: 'positive',
          expectedSkill: 'test-skill'
        }
      ];
      
      writeFileSync(testCasePath, JSON.stringify(testData, null, 2));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.totalCases).toBe(1);
      expect(result.metrics?.passed).toBe(1);
    });

    it('should load test cases from unified format (trigger-cases.json)', async () => {
      const testCasePath = join(tempDir, 'test/fixtures/trigger-cases.json');
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
        tests: [
          {
            prompt: 'Test prompt',
            expected_skill: 'test-skill',
            should_trigger: true,
            category: 'positive'
          }
        ]
      };
      
      writeFileSync(testCasePath, JSON.stringify(testData, null, 2));
      
      // Create new config without integration path to force fallback to trigger-cases.json
      const configWithoutIntegration: LintConfig = {
        ...mockConfig,
        testCases: {
          ...mockConfig.testCases,
          integration: undefined
        }
      };
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, configWithoutIntegration);
      
      expect(result.metrics?.totalCases).toBe(1);
      expect(result.metrics?.passed).toBe(1);
    });

    it('should handle malformed JSON gracefully', async () => {
      const testCasePath = mockConfig.testCases.integration as string;
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
      
      writeFileSync(testCasePath, '{ invalid json }');
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      const warning = result.violations.find(v => v.rule === 'no-integration-cases');
      expect(warning).toBeDefined();
    });
  });

  describe('Skill Detection', () => {
    beforeEach(() => {
      const testCasePath = mockConfig.testCases.integration as string;
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
    });

    it('should pass when skill is correctly detected', async () => {
      const testData = [
        {
          id: 1,
          name: 'positive-test',
          description: 'Should trigger test-skill',
          prompt: 'Test prompt',
          category: 'positive',
          expectedSkill: 'test-skill'
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.passed).toBe(1);
      expect(result.metrics?.failed).toBe(0);
      expect(result.metrics?.accuracy).toBe(100);
    });

    it('should fail when skill is not detected', async () => {
      const testData = [
        {
          id: 1,
          name: 'skill-not-detected',
          description: 'Should detect skill but does not',
          prompt: 'Test prompt',
          category: 'positive',
          expectedSkill: 'test-skill'
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: null,
        responseContent: 'Response',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.passed).toBe(0);
      expect(result.metrics?.failed).toBe(1);
      
      const violation = result.violations.find(v => v.rule === 'skill-not-detected');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });

    it('should pass when no skill is expected and none is detected', async () => {
      const testData = [
        {
          id: 1,
          name: 'negative-test',
          description: 'Should not trigger any skill',
          prompt: 'Unrelated prompt',
          category: 'negative',
          expectedSkill: null
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: null,
        responseContent: 'Response',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.passed).toBe(1);
      expect(result.metrics?.accuracy).toBe(100);
    });
  });

  describe('Content Validation', () => {
    beforeEach(() => {
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
    });

    it('should validate expected content when specified', async () => {
      const testData = [
        {
          id: 1,
          name: 'content-check',
          description: 'Check response contains specific content',
          prompt: 'Test prompt',
          category: 'positive',
          expectedSkill: 'test-skill',
          expectedContent: 'expected phrase'
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response contains expected phrase here',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.passed).toBe(1);
    });

    it('should fail when expected content is missing', async () => {
      const testData = [
        {
          id: 1,
          name: 'content-missing',
          description: 'Expected content not in response',
          prompt: 'Test prompt',
          category: 'positive',
          expectedSkill: 'test-skill',
          expectedContent: 'missing phrase'
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response without the expected content',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.failed).toBe(1);
      
      const violation = result.violations.find(v => v.rule === 'content-mismatch');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('info');
    });
  });

  describe('Accuracy Thresholds', () => {
    beforeEach(() => {
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
    });

    it('should error when accuracy is below 70%', async () => {
      const testData = Array(10).fill(0).map((_, i) => ({
        id: i + 1,
        name: `test-${i + 1}`,
        description: `Test case ${i + 1}`,
        prompt: `Prompt ${i + 1}`,
        category: 'test',
        expectedSkill: 'test-skill'
      }));
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      // Configure adapter to fail 4 out of 10 (60% accuracy)
      testData.forEach((tc, i) => {
        mockAdapter.setResponse(tc.prompt, {
          success: true,
          skillTriggered: i < 6 ? 'test-skill' : null,
          responseContent: 'Response',
          tokensUsed: 100,
          latencyMs: 500,
          cost: 0
        });
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.accuracy).toBe(60);
      
      const error = result.violations.find(v => v.rule === 'integration-accuracy-low');
      expect(error).toBeDefined();
      expect(error?.level).toBe('error');
    });

    it('should warn when accuracy is between 70-90%', async () => {
      const testData = Array(10).fill(0).map((_, i) => ({
        id: i + 1,
        name: `test-${i + 1}`,
        description: `Test case ${i + 1}`,
        prompt: `Prompt ${i + 1}`,
        category: 'test',
        expectedSkill: 'test-skill'
      }));
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      // Configure adapter to pass 8 out of 10 (80% accuracy)
      testData.forEach((tc, i) => {
        mockAdapter.setResponse(tc.prompt, {
          success: true,
          skillTriggered: i < 8 ? 'test-skill' : null,
          responseContent: 'Response',
          tokensUsed: 100,
          latencyMs: 500,
          cost: 0
        });
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.accuracy).toBe(80);
      
      const warning = result.violations.find(v => v.rule === 'integration-accuracy-moderate');
      expect(warning).toBeDefined();
      expect(warning?.level).toBe('warning');
    });

    it('should pass without violations when accuracy is above 90%', async () => {
      const testData = Array(10).fill(0).map((_, i) => ({
        id: i + 1,
        name: `test-${i + 1}`,
        description: `Test case ${i + 1}`,
        prompt: `Prompt ${i + 1}`,
        category: 'test',
        expectedSkill: 'test-skill'
      }));
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response',
        tokensUsed: 100,
        latencyMs: 500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.accuracy).toBe(100);
      
      const accuracyViolations = result.violations.filter(v => 
        v.rule === 'integration-accuracy-low' || v.rule === 'integration-accuracy-moderate'
      );
      expect(accuracyViolations).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
    });

    it('should handle execution failures', async () => {
      const testData = [
        {
          id: 1,
          name: 'fail-test',
          description: 'This will fail',
          prompt: 'Failing prompt',
          category: 'error',
          expectedSkill: 'test-skill'
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setResponse('Failing prompt', {
        success: false,
        skillTriggered: null,
        responseContent: '',
        tokensUsed: 0,
        latencyMs: 0,        cost: 0,        error: 'Execution failed'
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.failed).toBe(1);
      
      const error = result.violations.find(v => v.rule === 'execution-failed');
      expect(error).toBeDefined();
      expect(error?.level).toBe('error');
      expect(error?.message).toContain('Execution failed');
    });

    it('should track timeouts separately', async () => {
      const testData = [
        {
          id: 1,
          name: 'timeout-test',
          description: 'This will timeout',
          prompt: 'Slow prompt',
          category: 'timeout',
          expectedSkill: 'test-skill'
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setResponse('Slow prompt', {
        success: false,
        skillTriggered: null,
        responseContent: '',
        tokensUsed: 0,
        latencyMs: 0,
        cost: 0,
        error: 'Timeout exceeded'
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.timedOut).toBe(1);
    });
  });

  describe('Metrics Tracking', () => {
    beforeEach(() => {
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
    });

    it('should track tokens and latency', async () => {
      const testData = [
        {
          id: 1,
          name: 'metrics-test',
          description: 'Track metrics',
          prompt: 'Test prompt',
          category: 'metrics',
          expectedSkill: 'test-skill'
        }
      ];
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response',
        tokensUsed: 250,
        latencyMs: 1500,
        cost: 0
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.totalTokens).toBe(250);
      expect(result.metrics?.averageLatency).toBe(1500);
    });

    it('should calculate average latency correctly', async () => {
      const testData = Array(3).fill(0).map((_, i) => ({
        id: i + 1,
        name: `test-${i + 1}`,
        description: `Test case ${i + 1}`,
        prompt: `Prompt ${i + 1}`,
        category: 'latency',
        expectedSkill: 'test-skill'
      }));
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      // Different latencies: 100, 200, 300 -> avg 200
      testData.forEach((tc, i) => {
        mockAdapter.setResponse(tc.prompt, {
          success: true,
          skillTriggered: 'test-skill',
          responseContent: 'Response',
          tokensUsed: 100,
          latencyMs: (i + 1) * 100,
          cost: 0
        });
      });
      
      const result = await validator.validate(mockSkill, mockConfig);
      
      expect(result.metrics?.averageLatency).toBe(200);
    });
  });

  describe('Performance', () => {
    it('should handle multiple test cases efficiently', async () => {
      mkdirSync(join(tempDir, 'test/integration/fixtures'), { recursive: true });
      
      const testData = Array(20).fill(0).map((_, i) => ({
        id: i + 1,
        name: `perf-test-${i + 1}`,
        description: `Performance test ${i + 1}`,
        prompt: `Performance prompt ${i + 1}`,
        category: 'performance',
        expectedSkill: 'test-skill'
      }));
      
      writeFileSync(mockConfig.testCases.integration as string, JSON.stringify(testData));
      
      mockAdapter.setDefaultResponse({
        success: true,
        skillTriggered: 'test-skill',
        responseContent: 'Response',
        tokensUsed: 100,
        latencyMs: 10,
        cost: 0
      });
      
      const start = Date.now();
      const result = await validator.validate(mockSkill, mockConfig);
      const duration = Date.now() - start;
      
      expect(result.metrics?.totalCases).toBe(20);
      // Should complete quickly with mock adapter (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});
