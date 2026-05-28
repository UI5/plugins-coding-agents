/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeCommand } from '../../../src/cli/commands/analyze.js';
import * as fileUtils from '../../../src/utils/file-utils.js';
import { TriggerExtractor } from '../../../src/validators/trigger-extractor.js';
import type { Skill, ValidationResult } from '../../../src/types/index.js';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

vi.mock('../../../src/validators/trigger-extractor.js');
vi.mock('../../../src/utils/file-utils.js');

describe('Analyze Command', () => {
  let testDir: string;
  let consoleLogSpy: any;

  beforeEach(async () => {
    testDir = join(tmpdir(), `analyze-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
  });

  const mockSkill: Skill = {
    metadata: {
      name: 'test-skill',
      description: 'A test skill for validation',
      version: '1.0.0',
      keywords: ['test', 'validation'],
    },
    content: 'Test skill content with some patterns',
    path: '/test/skill',
  };

  const createMockValidationResult = (
    primaryKeywords: string[] = ['test', 'validate', 'check'],
    secondaryKeywords: string[] = ['run tests', 'validate data'],
    codePatterns: string[] = ['import.*test', 'describe.*should'],
    actionPhrases: string[] = ['Run the tests', 'Validate the data'],
    antiKeywords: string[] = ['build', 'deploy']
  ): ValidationResult => ({
    valid: true,
    violations: [
      {
        rule: 'extracted-primary-keywords',
        message: `Extracted ${primaryKeywords.length} primary keywords`,
        severity: 'info',
        metadata: { keywords: primaryKeywords },
      },
      {
        rule: 'extracted-secondary-keywords',
        message: `Extracted ${secondaryKeywords.length} secondary keywords`,
        severity: 'info',
        metadata: { keywords: secondaryKeywords },
      },
      {
        rule: 'extracted-code-patterns',
        message: `Extracted ${codePatterns.length} code patterns`,
        severity: 'info',
        metadata: { patterns: codePatterns },
      },
      {
        rule: 'extracted-action-phrases',
        message: `Extracted ${actionPhrases.length} action phrases`,
        severity: 'info',
        metadata: { phrases: actionPhrases },
      },
      {
        rule: 'suggested-anti-keywords',
        message: `Suggested ${antiKeywords.length} anti-keywords`,
        severity: 'info',
        suggestion: 'Add these to prevent false positives',
        metadata: { antiKeywords },
      },
      {
        rule: 'extraction-summary',
        message: 'Extraction complete',
        severity: 'info',
        suggestion: 'Review the extracted keywords',
      },
    ],
    warnings: [],
    metrics: {},
    metadata: {},
    duration: 150,
  });

  describe('Basic Functionality', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);
    });

    it('should analyze skill successfully', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(fileUtils.loadSkill).toHaveBeenCalledWith(expect.stringContaining('/test/skill'));
      expect(TriggerExtractor).toHaveBeenCalled();
    });

    it('should extract primary keywords from skill', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('primary keywords'));
    });

    it('should extract secondary keywords from skill', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('secondary keywords'));
    });

    it('should extract code patterns from skill', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('code patterns'));
    });

    it('should extract action phrases from skill', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('action phrases'));
    });

    it('should suggest anti-keywords', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('anti-keywords'));
    });
  });

  describe('Text Format Output', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);
    });

    it('should display text output by default', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Trigger Keyword Analysis'));
    });

    it('should display example trigger-cases.json structure', async () => {
      const exitCode = await analyzeCommand('/test/skill');

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Example trigger-cases.json'));
    });

    it('should use explicit text format option', async () => {
      const exitCode = await analyzeCommand('/test/skill', { format: 'text' });

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Trigger Keyword Analysis'));
    });
  });

  describe('JSON Format Output', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);
    });

    it('should output JSON format when specified', async () => {
      const exitCode = await analyzeCommand('/test/skill', { format: 'json' });

      expect(exitCode).toBe(0);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/^\{/));
    });

    it('should include skill name in JSON output', async () => {
      const exitCode = await analyzeCommand('/test/skill', { format: 'json' });

      expect(exitCode).toBe(0);
      const jsonCall = consoleLogSpy.mock.calls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('"skill"')
      );
      expect(jsonCall).toBeDefined();
      expect(jsonCall[0]).toContain('"skill"');
    });

    it('should include extracted keywords in JSON output', async () => {
      const exitCode = await analyzeCommand('/test/skill', { format: 'json' });

      expect(exitCode).toBe(0);
      const jsonCall = consoleLogSpy.mock.calls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('"primaryKeywords"')
      );
      expect(jsonCall).toBeDefined();
      expect(jsonCall[0]).toContain('"primaryKeywords"');
    });

    it('should include duration in JSON output', async () => {
      const exitCode = await analyzeCommand('/test/skill', { format: 'json' });

      expect(exitCode).toBe(0);
      const jsonCall = consoleLogSpy.mock.calls.find((call: any[]) =>
        typeof call[0] === 'string' && call[0].includes('"duration"')
      );
      expect(jsonCall).toBeDefined();
    });
  });

  describe('File Output', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);
    });

    it('should save analysis to file when output path specified', async () => {
      const outputPath = join(testDir, 'analysis.json');
      const exitCode = await analyzeCommand('/test/skill', { output: outputPath });

      expect(exitCode).toBe(0);

      const content = await readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty('skill');
      expect(parsed).toHaveProperty('primaryKeywords');
      expect(parsed).toHaveProperty('secondaryKeywords');
      expect(parsed).toHaveProperty('codePatterns');
      expect(parsed).toHaveProperty('actionPhrases');
      expect(parsed).toHaveProperty('antiKeywords');
      expect(parsed).toHaveProperty('duration');
    });

    it('should save JSON format when specified with output', async () => {
      const outputPath = join(testDir, 'analysis-json.json');
      const exitCode = await analyzeCommand('/test/skill', {
        format: 'json',
        output: outputPath,
      });

      expect(exitCode).toBe(0);

      const content = await readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty('skill');
      expect(parsed).toHaveProperty('primaryKeywords');
    });

    it('should save JSON even when text format is specified with output', async () => {
      const outputPath = join(testDir, 'analysis-text.json');
      const exitCode = await analyzeCommand('/test/skill', {
        format: 'text',
        output: outputPath,
      });

      expect(exitCode).toBe(0);

      const content = await readFile(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toHaveProperty('skill');
    });
  });

  describe('Empty Results Handling', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
    });

    it('should handle skill with no extractable keywords', async () => {
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult([], [], [], [], [])),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(0);
    });

    it('should handle skill with only primary keywords', async () => {
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(
          createMockValidationResult(['test'], [], [], [], [])
        ),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(0);
    });

    it('should handle skill with no violations', async () => {
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue({
          valid: true,
          violations: [],
          warnings: [],
          metrics: {},
          metadata: {},
          duration: 100,
        }),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle skill loading failure', async () => {
      vi.mocked(fileUtils.loadSkill).mockRejectedValue(new Error('Skill not found'));

      const exitCode = await analyzeCommand('/nonexistent/skill');
      expect(exitCode).toBe(2);
    });

    it('should handle extractor failure', async () => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockRejectedValue(new Error('Extraction failed')),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(2);
    });

    it('should handle file write errors gracefully', async () => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const invalidPath = '/invalid/path/that/does/not/exist/analysis.json';
      const exitCode = await analyzeCommand('/test/skill', { output: invalidPath });

      expect(exitCode).toBe(2);
    });

    it('should handle unknown errors', async () => {
      vi.mocked(fileUtils.loadSkill).mockRejectedValue('Unknown error string');

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(2);
    });
  });

  describe('Special Characters in Skill Name', () => {
    it('should sanitize skill name with ANSI codes', async () => {
      const skillWithAnsi: Skill = {
        ...mockSkill,
        metadata: {
          ...mockSkill.metadata,
          name: '\x1b[31mred-skill\x1b[0m',
        },
      };

      vi.mocked(fileUtils.loadSkill).mockResolvedValue(skillWithAnsi);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(0);
    });

    it('should sanitize skill name with control characters', async () => {
      const skillWithControl: Skill = {
        ...mockSkill,
        metadata: {
          ...mockSkill.metadata,
          name: 'skill\nwith\nnewlines',
        },
      };

      vi.mocked(fileUtils.loadSkill).mockResolvedValue(skillWithControl);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(0);
    });
  });

  describe('Large Result Sets', () => {
    it('should handle large numbers of extracted keywords', async () => {
      const largeKeywords = Array.from({ length: 100 }, (_, i) => `keyword${i}`);

      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(
          createMockValidationResult(largeKeywords, [], [], [], [])
        ),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill', { format: 'json' });
      expect(exitCode).toBe(0);
    });

    it('should handle large numbers of code patterns', async () => {
      const largePatterns = Array.from({ length: 50 }, (_, i) => `pattern${i}.*test`);

      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(
          createMockValidationResult([], [], largePatterns, [], [])
        ),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);

      const exitCode = await analyzeCommand('/test/skill');
      expect(exitCode).toBe(0);
    });
  });

  describe('Path Resolution', () => {
    beforeEach(() => {
      vi.mocked(fileUtils.loadSkill).mockResolvedValue(mockSkill);
      const mockExtractor = {
        validate: vi.fn().mockResolvedValue(createMockValidationResult()),
      };
      vi.mocked(TriggerExtractor).mockImplementation(function(this: any) {
        return mockExtractor;
      } as any);
    });

    it('should resolve relative paths', async () => {
      const exitCode = await analyzeCommand('./test/skill');

      expect(exitCode).toBe(0);
      expect(fileUtils.loadSkill).toHaveBeenCalled();
    });

    it('should resolve absolute paths', async () => {
      const exitCode = await analyzeCommand('/absolute/test/skill');

      expect(exitCode).toBe(0);
      expect(fileUtils.loadSkill).toHaveBeenCalled();
    });
  });
});
