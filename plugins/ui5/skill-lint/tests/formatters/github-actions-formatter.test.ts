import { describe, it, expect, beforeEach } from 'vitest';
import { GithubActionsFormatter } from '../../src/formatters/github-actions-formatter.js';
import type { LintResult } from '../../src/types/index.js';

describe('GithubActionsFormatter', () => {
  let formatter: GithubActionsFormatter;

  beforeEach(() => {
    formatter = new GithubActionsFormatter();
  });

  describe('Basic Properties', () => {
    it('should have correct name and extension', () => {
      expect(formatter.name).toBe('github-actions');
      expect(formatter.extension).toBe('.txt');
    });
  });

  describe('Violation Formatting', () => {
    it('should format error violations as GitHub Actions errors', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'test-error',
              message: 'This is an error',
              file: '/path/to/file.ts',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('::error file=/path/to/file.ts,title=test-error::This is an error');
    });

    it('should format warning violations as GitHub Actions warnings', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          violations: [
            {
              level: 'warning',
              rule: 'test-warning',
              message: 'This is a warning',
              file: '/path/to/file.ts',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('::warning file=/path/to/file.ts,title=test-warning::This is a warning');
    });

    it('should format info violations as GitHub Actions notices', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          violations: [
            {
              level: 'info',
              rule: 'test-info',
              message: 'This is info',
              file: '/path/to/file.ts',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('::notice file=/path/to/file.ts,title=test-info::This is info');
    });

    it('should include line number when provided', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'line-error',
              message: 'Error on specific line',
              file: '/path/to/file.ts',
              line: 42,
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('::error file=/path/to/file.ts,line=42,title=line-error::Error on specific line');
    });

    it('should use skill path when file is not specified', () => {
      const result = createMockResult({
        skillPath: '/path/to/SKILL.md',
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'no-file',
              message: 'Error without file',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('::error file=/path/to/SKILL.md,title=no-file::Error without file');
    });

    it('should format multiple violations', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'error-1',
              message: 'First error',
              file: '/file1.ts',
            },
            {
              level: 'warning',
              rule: 'warning-1',
              message: 'First warning',
              file: '/file2.ts',
            },
            {
              level: 'info',
              rule: 'info-1',
              message: 'First info',
              file: '/file3.ts',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('::error file=/file1.ts,title=error-1::First error');
      expect(output).toContain('::warning file=/file2.ts,title=warning-1::First warning');
      expect(output).toContain('::notice file=/file3.ts,title=info-1::First info');
    });
  });

  describe('Summary Formatting', () => {
    it('should format summary as notice when passed', () => {
      const result = createMockResult({
        passed: true,
        summary: {
          totalValidators: 3,
          passedValidators: 3,
          failedValidators: 0,
          errors: 0,
          warnings: 1,
          infos: 2,
        },
      });

      const output = formatter.format(result);
      expect(output).toContain('::notice::skill-lint: 0 error(s), 1 warning(s), 2 info(s)');
    });

    it('should format summary as error when failed', () => {
      const result = createMockResult({
        passed: false,
        summary: {
          totalValidators: 3,
          passedValidators: 2,
          failedValidators: 1,
          errors: 2,
          warnings: 1,
          infos: 0,
        },
      });

      const output = formatter.format(result);
      expect(output).toContain('::error::skill-lint: 2 error(s), 1 warning(s), 0 info(s)');
    });

    it('should include blank line before summary', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          violations: [
            {
              level: 'info',
              rule: 'test',
              message: 'Info',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      const lines = output.split('\n');
      // Should have at least 3 lines: violation, blank, summary
      expect(lines.length).toBeGreaterThanOrEqual(3);
      // Second to last line should be empty
      expect(lines[lines.length - 2]).toBe('');
    });
  });

  describe('Multi-Validator Results', () => {
    it('should format violations from multiple validators', () => {
      const result = createMockResult({
        results: [
          {
            validator: 'structure',
            passed: false,
            violations: [
              {
                level: 'error',
                rule: 'missing-section',
                message: 'Missing required section',
                file: '/SKILL.md',
                line: 10,
              }
            ],
            duration: 5,
          },
          {
            validator: 'performance',
            passed: true,
            violations: [
              {
                level: 'warning',
                rule: 'too-long',
                message: 'File is too long',
                file: '/SKILL.md',
              }
            ],
            duration: 3,
          },
          {
            validator: 'triggering',
            passed: true,
            violations: [
              {
                level: 'info',
                rule: 'accuracy',
                message: 'Accuracy is 95%',
              }
            ],
            duration: 8,
          }
        ],
        passed: false,
        summary: {
          totalValidators: 3,
          passedValidators: 2,
          failedValidators: 1,
          errors: 1,
          warnings: 1,
          infos: 1,
        },
      });

      const output = formatter.format(result);
      
      expect(output).toContain('::error file=/SKILL.md,line=10,title=missing-section::Missing required section');
      expect(output).toContain('::warning file=/SKILL.md,title=too-long::File is too long');
      expect(output).toContain('::notice file=/path/to/SKILL.md,title=accuracy::Accuracy is 95%');
      expect(output).toContain('::error::skill-lint: 1 error(s), 1 warning(s), 1 info(s)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle no violations', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          violations: [],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      
      // Should only have summary (with blank line before it)
      const lines = output.split('\n').filter(l => l.length > 0);
      expect(lines.length).toBe(1);
      expect(lines[0]).toContain('::notice::skill-lint:');
    });

    it('should handle special characters in messages', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'special',
              message: 'Error with "quotes" and <brackets> and & ampersand',
              file: '/file.ts',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('Error with "quotes" and <brackets> and & ampersand');
    });

    it('should handle zero counts in summary', () => {
      const result = createMockResult({
        passed: true,
        summary: {
          totalValidators: 1,
          passedValidators: 1,
          failedValidators: 0,
          errors: 0,
          warnings: 0,
          infos: 0,
        },
      });

      const output = formatter.format(result);
      expect(output).toContain('::notice::skill-lint: 0 error(s), 0 warning(s), 0 info(s)');
    });

    it('should handle files with unusual paths', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'path-test',
              message: 'Error',
              file: '../../../etc/passwd',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      expect(output).toContain('file=../../../etc/passwd');
    });
  });

  describe('Output Format', () => {
    it('should produce valid GitHub Actions workflow command format', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'test-rule',
              message: 'Test message',
              file: '/test.ts',
              line: 10,
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      const lines = output.split('\n').filter(l => l.length > 0);
      
      // Each line should start with ::
      for (const line of lines) {
        expect(line).toMatch(/^::(error|warning|notice)/);
      }
    });

    it('should separate violations and summary with blank line', () => {
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'test',
              message: 'Error',
            }
          ],
          duration: 1,
        }]
      });

      const output = formatter.format(result);
      const lines = output.split('\n');
      
      // Find the blank line
      const blankLineIndex = lines.findIndex(l => l === '');
      expect(blankLineIndex).toBeGreaterThan(0);
      expect(blankLineIndex).toBeLessThan(lines.length - 1);
    });
  });
});

// Helper function to create mock lint results
function createMockResult(partial?: Partial<LintResult>): LintResult {
  return {
    skill: 'test-skill',
    skillPath: '/path/to/SKILL.md',
    timestamp: '2026-05-20T10:00:00.000Z',
    passed: true,
    duration: 10,
    summary: {
      totalValidators: 1,
      passedValidators: 1,
      failedValidators: 0,
      errors: 0,
      warnings: 0,
      infos: 0,
    },
    results: [
      {
        validator: 'test',
        passed: true,
        violations: [],
        duration: 1,
      }
    ],
    ...partial,
  };
}
