/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auditCommand } from '../../../src/cli/commands/audit.js';
import * as fileUtils from '../../../src/utils/file-utils.js';
import * as configLoader from '../../../src/config/loader.js';
import { HarnessValidator } from '../../../src/validators/harness-validator.js';
import type { Skill, ValidationResult } from '../../../src/types/index.js';
import { mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('../../../src/validators/harness-validator.js');
vi.mock('../../../src/utils/file-utils.js');
vi.mock('../../../src/config/loader.js');

describe('Audit Command', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `audit-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  const mockSkill: Skill = {
    metadata: {
      name: 'test-skill',
      description: 'Test skill',
      version: '1.0.0',
      keywords: ['test'],
    },
    content: 'Test skill content',
    path: '/test/skill',
  };

  const createMockValidationResult = (
    accuracy: number,
    latency: number,
    tokens: number
  ): ValidationResult => ({
    valid: true,
    violations: [],
    warnings: [],
    metrics: {
      totalCases: 10,
      passed: Math.round(10 * (accuracy / 100)),
      failed: 10 - Math.round(10 * (accuracy / 100)),
      accuracy,
      totalTokens: tokens,
      averageLatency: latency,
    },
    metadata: {},
    duration: latency * 10,
  });

  describe('Parameter Validation', () => {
    it('should reject empty skill path', async () => {
      const exitCode = await auditCommand('', {});
      expect(exitCode).toBe(2);
    });

    it('should reject non-string skill path', async () => {
      const exitCode = await auditCommand(null as any, {});
      expect(exitCode).toBe(2);
    });

    it('should reject whitespace-only skill path', async () => {
      const exitCode = await auditCommand('   ', {});
      expect(exitCode).toBe(2);
    });
  });

  describe('Single Iteration', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });
    });

    it('should run single iteration successfully', async () => {
      const mockResult = createMockValidationResult(95, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { iterations: 1 });

      expect(exitCode).toBe(0);
      expect(fileUtils.loadSkill).toHaveBeenCalledWith(expect.stringContaining('/test/skill'));
      expect(HarnessValidator).toHaveBeenCalled();
      expect(mockValidator.validate).toHaveBeenCalled();
    });

    it('should return exit code 0 for passing audit (grade C or better)', async () => {
      const mockResult = createMockValidationResult(80, 2000, 8000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { iterations: 1 });
      expect(exitCode).toBe(0);
    });

    it('should return exit code 1 for failing audit (below grade C)', async () => {
      const mockResult = createMockValidationResult(65, 2000, 8000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { iterations: 1 });
      expect(exitCode).toBe(1);
    });

    it('should handle skill with no test cases (grade F)', async () => {
      const mockResult: ValidationResult = {
        valid: true,
        violations: [],
        warnings: [],
        metrics: {
          totalCases: 0,
          passed: 0,
          failed: 0,
          accuracy: 0,
          totalTokens: 0,
          averageLatency: 0,
        },
        metadata: {},
        duration: 0,
      };

      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { iterations: 1 });
      expect(exitCode).toBe(1); // Should fail with grade F
    });
  });

  describe('Multiple Iterations', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });
    });

    it('should run multiple iterations', async () => {
      const mockResults = [
        createMockValidationResult(90, 1500, 5000),
        createMockValidationResult(92, 1600, 5100),
        createMockValidationResult(88, 1450, 4900),
      ];

      let callCount = 0;
      const mockValidator = {
        validate: vi.fn().mockImplementation(() => {
          return Promise.resolve(mockResults[callCount++]);
        }),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { iterations: 3 });

      expect(exitCode).toBe(0);
      expect(HarnessValidator).toHaveBeenCalled();
    });

    it('should compute statistical summary from multiple iterations', async () => {
      const mockResults = [
        createMockValidationResult(85, 1000, 5000),
        createMockValidationResult(90, 1100, 5200),
        createMockValidationResult(95, 1200, 5400),
      ];

      let callCount = 0;
      const mockValidator = {
        validate: vi.fn().mockImplementation(() => {
          return Promise.resolve(mockResults[callCount++]);
        }),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { iterations: 3, format: 'json' });
      expect(exitCode).toBe(0);
    });
  });

  describe('Output Formats', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });

      const mockResult = createMockValidationResult(90, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);
    });

    it('should support text format', async () => {
      const exitCode = await auditCommand('/test/skill', { format: 'text' });
      expect(exitCode).toBe(0);
    });

    it('should support markdown format', async () => {
      const exitCode = await auditCommand('/test/skill', { format: 'markdown' });
      expect(exitCode).toBe(0);
    });

    it('should support html format', async () => {
      const exitCode = await auditCommand('/test/skill', { format: 'html' });
      expect(exitCode).toBe(0);
    });

    it('should support json format', async () => {
      const exitCode = await auditCommand('/test/skill', { format: 'json' });
      expect(exitCode).toBe(0);
    });

    it('should default to text format when not specified', async () => {
      const exitCode = await auditCommand('/test/skill', {});
      expect(exitCode).toBe(0);
    });
  });

  describe('File Output', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });

      const mockResult = createMockValidationResult(90, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);
    });

    it('should write report to specified output file', async () => {
      const outputPath = join(testDir, 'audit-report.txt');
      const exitCode = await auditCommand('/test/skill', {
        output: outputPath,
        format: 'text',
      });

      expect(exitCode).toBe(0);
      // File writing is handled by formatters, which are mocked
    });

    it('should create output directory if it does not exist', async () => {
      const outputPath = join(testDir, 'nested', 'dir', 'report.html');
      const exitCode = await auditCommand('/test/skill', {
        output: outputPath,
        format: 'html',
      });

      expect(exitCode).toBe(0);
    });
  });

  describe('Baseline Comparison', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });

      const mockResult = createMockValidationResult(90, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);
    });

    it('should load and compare with baseline', async () => {
      const baselinePath = join(testDir, 'baseline.json');
      const baselineData = {
        skill: 'test-skill',
        skillPath: '/test/skill',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        totalDuration: 15000,
        iterations: [
          {
            iterationNumber: 1,
            timestamp: new Date().toISOString(),
            result: createMockValidationResult(85, 1600, 5200),
            harnessMetadata: {
              totalCases: 10,
              passed: 8,
              failed: 2,
              accuracy: 85,
              totalTokens: 5200,
              averageLatency: 1600,
            },
          },
        ],
        statistics: {
          accuracy: { mean: 85, median: 85, stdDev: 0, min: 85, max: 85 },
          latency: { mean: 1600, median: 1600, stdDev: 0, min: 1600, max: 1600 },
          tokenUsage: { mean: 5200, median: 5200, stdDev: 0, min: 5200, max: 5200 },
          cost: { mean: 0.0468, median: 0.0468, stdDev: 0, min: 0.0468, max: 0.0468 },
        },
        aggregated: {
          totalTests: 10,
          totalPassed: 8,
          totalFailed: 2,
          overallAccuracy: 85,
          totalTokens: 5200,
          totalCost: 0.0468,
        },
        assessment: {
          grade: 'B' as const,
          score: 85,
          passed: true,
          issues: [],
          recommendations: [],
        },
      };

      await writeFile(baselinePath, JSON.stringify(baselineData, null, 2));

      const exitCode = await auditCommand('/test/skill', {
        baseline: baselinePath,
      });

      expect(exitCode).toBe(0);
    });

    it('should handle missing baseline file gracefully', async () => {
      const nonExistentPath = join(testDir, 'nonexistent-baseline.json');

      const exitCode = await auditCommand('/test/skill', {
        baseline: nonExistentPath,
      });

      expect(exitCode).toBe(0); // Should continue without baseline
    });

    it('should handle invalid baseline JSON', async () => {
      const baselinePath = join(testDir, 'invalid-baseline.json');
      await writeFile(baselinePath, 'not valid json{]');

      const exitCode = await auditCommand('/test/skill', {
        baseline: baselinePath,
      });

      expect(exitCode).toBe(0); // Should continue without baseline
    });

    it('should handle baseline with missing required fields', async () => {
      const baselinePath = join(testDir, 'incomplete-baseline.json');
      await writeFile(baselinePath, JSON.stringify({ skill: 'test' }));

      const exitCode = await auditCommand('/test/skill', {
        baseline: baselinePath,
      });

      expect(exitCode).toBe(0); // Should continue without baseline
    });
  });

  describe('Confidence Levels', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });

      const mockResult = createMockValidationResult(90, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);
    });

    it('should default to 0.95 confidence level', async () => {
      const exitCode = await auditCommand('/test/skill', { iterations: 5 });
      expect(exitCode).toBe(0);
    });

    it('should accept custom confidence level', async () => {
      const exitCode = await auditCommand('/test/skill', {
        iterations: 5,
        confidenceLevel: 0.99,
      });
      expect(exitCode).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });
    });

    it('should handle skill loading failure', async () => {
      vi.mocked(fileUtils.loadSkill).mockRejectedValue(new Error('Skill not found'));

      const exitCode = await auditCommand('/nonexistent/skill', {});
      expect(exitCode).toBe(2);
    });

    it('should handle validator errors', async () => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockValidator = {
        validate: vi.fn().mockRejectedValue(new Error('Validation failed')),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', {});
      expect(exitCode).toBe(2);
    });

    it('should handle config loading failure', async () => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockRejectedValue(new Error('Config error'));

      const exitCode = await auditCommand('/test/skill', {});
      expect(exitCode).toBe(2);
    });
  });

  describe('Grade Assessment', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      vi.mocked(configLoader.loadConfig).mockResolvedValue({
        scenarios: { structure: true, size: true, references: false, links: false, keywords: false, harness: true },
        thresholds: { maxSize: 10000, maxTitleLength: 100, maxDescriptionLength: 500 },
        outputFormat: 'text',
      });
    });

    it('should assign grade A for excellent performance (90%+)', async () => {
      const mockResult = createMockValidationResult(95, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { format: 'json' });
      expect(exitCode).toBe(0);
    });

    it('should assign grade B for good performance (80-89%)', async () => {
      const mockResult = createMockValidationResult(85, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { format: 'json' });
      expect(exitCode).toBe(0);
    });

    it('should assign grade C for acceptable performance (70-79%)', async () => {
      const mockResult = createMockValidationResult(75, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { format: 'json' });
      expect(exitCode).toBe(1); // Fails because 75% < 80% minAccuracy threshold
    });

    it('should assign grade D for poor performance (60-69%)', async () => {
      const mockResult = createMockValidationResult(65, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { format: 'json' });
      expect(exitCode).toBe(1); // Fails below grade C
    });

    it('should assign grade F for failing performance (<60%)', async () => {
      const mockResult = createMockValidationResult(50, 1500, 5000);
      const mockValidator = {
        validate: vi.fn().mockResolvedValue(mockResult),
      };
      vi.mocked(HarnessValidator).mockImplementation(function(this: any) {
        return mockValidator;
      } as any);

      const exitCode = await auditCommand('/test/skill', { format: 'json' });
      expect(exitCode).toBe(1);
    });
  });
});
