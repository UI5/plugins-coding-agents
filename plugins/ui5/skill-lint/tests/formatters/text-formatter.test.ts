import { describe, it, expect } from 'vitest';
import { TextFormatter } from '../../src/formatters/text-formatter.js';
import type { LintResult, ValidationResult, Violation } from '../../src/types/index.js';

describe('TextFormatter', () => {
  let formatter: TextFormatter;

  describe('Basic Properties', () => {
    it('should have correct name and extension', () => {
      formatter = new TextFormatter();
      expect(formatter.name).toBe('text');
      expect(formatter.extension).toBe('.txt');
    });

    it('should enable colors by default', () => {
      formatter = new TextFormatter();
      const result = createMockResult();
      const output = formatter.format(result);
      // Should contain ANSI color codes
      expect(output).toContain('\x1b[');
    });

    it('should disable colors when requested', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult();
      const output = formatter.format(result);
      // Should not contain ANSI color codes
      expect(output).not.toContain('\x1b[');
    });
  });

  describe('Header Formatting', () => {
    it('should format skill name and path', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult();
      const output = formatter.format(result);
      
      expect(output).toContain('skill-lint  test-skill');
      expect(output).toContain('/path/to/SKILL.md');
    });
  });

  describe('Validator Formatting', () => {
    it('should format passed validator with checkmark', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'structure',
          passed: true,
          violations: [],
          duration: 5,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('✅ structure (5ms)');
    });

    it('should format failed validator with X', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'structure',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'test-rule',
              message: 'Test error',
            }
          ],
          duration: 10,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('❌ structure (10ms)');
    });
  });

  describe('Violation Formatting', () => {
    it('should format error violations with red icon', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'error-rule',
              message: 'This is an error',
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('❌ This is an error [error-rule]');
    });

    it('should format warning violations with warning icon', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          violations: [
            {
              level: 'warning',
              rule: 'warning-rule',
              message: 'This is a warning',
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('⚠️  This is a warning [warning-rule]');
    });

    it('should format info violations with info icon', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          violations: [
            {
              level: 'info',
              rule: 'info-rule',
              message: 'This is info',
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('ℹ️  This is info [info-rule]');
    });

    it('should include file path when specified', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'file-error',
              message: 'File error',
              file: '/path/to/file.ts',
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('/path/to/file.ts');
    });

    it('should include line number when specified', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'line-error',
              message: 'Line error',
              file: '/path/to/file.ts',
              line: 42,
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain(':42');
    });

    it('should include suggestion when provided', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'fixable-error',
              message: 'Fixable error',
              suggestion: 'Try fixing it this way',
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('💡 Try fixing it this way');
    });

    it('should format multiple violations', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'error-1',
              message: 'First error',
            },
            {
              level: 'warning',
              rule: 'warning-1',
              message: 'First warning',
            },
            {
              level: 'info',
              rule: 'info-1',
              message: 'First info',
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('First error');
      expect(output).toContain('First warning');
      expect(output).toContain('First info');
    });
  });

  describe('Summary Formatting', () => {
    it('should show PASSED status when all validators pass', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        passed: true,
        summary: {
          totalValidators: 3,
          passed: 3,
          failed: 0,
          errors: 0,
          warnings: 0,
          infos: 0,
        },
      });
      
      const output = formatter.format(result);
      expect(output).toContain('PASSED');
      expect(output).toContain('3 validator(s)');
      expect(output).toContain('0 error(s)');
    });

    it('should show FAILED status when validators fail', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        passed: false,
        summary: {
          totalValidators: 3,
          passed: 2,
          failed: 1,
          errors: 2,
          warnings: 1,
          infos: 0,
        },
      });
      
      const output = formatter.format(result);
      expect(output).toContain('FAILED');
      expect(output).toContain('3 validator(s)');
      expect(output).toContain('2 error(s)');
      expect(output).toContain('1 warning(s)');
    });

    it('should include total duration', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        duration: 123,
      });
      
      const output = formatter.format(result);
      expect(output).toContain('123ms');
    });

    it('should count info violations', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        summary: {
          totalValidators: 1,
          passed: 1,
          failed: 0,
          errors: 0,
          warnings: 0,
          infos: 5,
        },
      });
      
      const output = formatter.format(result);
      expect(output).toContain('5 info(s)');
    });
  });

  describe('Color Formatting', () => {
    it('should apply colors to passed status', () => {
      formatter = new TextFormatter({ colors: true });
      const result = createMockResult({ passed: true });
      const output = formatter.format(result);
      
      // Green color for PASSED
      expect(output).toContain('\x1b[32m');
    });

    it('should apply colors to failed status', () => {
      formatter = new TextFormatter({ colors: true });
      const result = createMockResult({ passed: false });
      const output = formatter.format(result);
      
      // Red color for FAILED
      expect(output).toContain('\x1b[31m');
    });

    it('should apply colors to violations', () => {
      formatter = new TextFormatter({ colors: true });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            { level: 'error', rule: 'test', message: 'Error' },
            { level: 'warning', rule: 'test', message: 'Warning' },
            { level: 'info', rule: 'test', message: 'Info' },
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      
      // Red for errors
      expect(output).toContain('\x1b[31m');
      // Yellow for warnings
      expect(output).toContain('\x1b[33m');
      // Cyan for info
      expect(output).toContain('\x1b[36m');
      // Reset codes
      expect(output).toContain('\x1b[0m');
    });

    it('should include reset codes after colored text', () => {
      formatter = new TextFormatter({ colors: true });
      const result = createMockResult();
      const output = formatter.format(result);
      
      expect(output).toContain('\x1b[0m');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty violations array', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          violations: [],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('✅ test (1ms)');
    });

    it('should handle zero duration', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        duration: 0,
        results: [{
          validator: 'test',
          passed: true,
          violations: [],
          duration: 0,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('0ms');
    });

    it('should handle special characters in messages', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          violations: [
            {
              level: 'error',
              rule: 'special-chars',
              message: 'Error with "quotes" and <brackets>',
            }
          ],
          duration: 1,
        }]
      });
      
      const output = formatter.format(result);
      expect(output).toContain('Error with "quotes" and <brackets>');
    });
  });

  describe('Multi-Validator Results', () => {
    it('should format results from multiple validators', () => {
      formatter = new TextFormatter({ colors: false });
      const result = createMockResult({
        results: [
          {
            validator: 'structure',
            passed: true,
            violations: [],
            duration: 5,
          },
          {
            validator: 'performance',
            passed: true,
            violations: [
              {
                level: 'info',
                rule: 'line-count',
                message: 'File has 100 lines',
              }
            ],
            duration: 3,
          },
          {
            validator: 'triggering',
            passed: false,
            violations: [
              {
                level: 'error',
                rule: 'accuracy-low',
                message: 'Accuracy too low',
              }
            ],
            duration: 8,
          }
        ],
        passed: false,
        summary: {
          totalValidators: 3,
          passed: 2,
          failed: 1,
          errors: 1,
          warnings: 0,
          infos: 1,
        },
      });
      
      const output = formatter.format(result);
      
      expect(output).toContain('✅ structure (5ms)');
      expect(output).toContain('✅ performance (3ms)');
      expect(output).toContain('❌ triggering (8ms)');
      expect(output).toContain('FAILED');
      expect(output).toContain('3 validator(s)');
    });
  });
});

// Helper function to create mock lint results
function createMockResult(partial?: Partial<LintResult>): LintResult {
  return {
    skill: 'test-skill',
    skillPath: '/path/to/SKILL.md',
    passed: true,
    duration: 10,
    summary: {
      totalValidators: 1,
      passed: 1,
      failed: 0,
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
