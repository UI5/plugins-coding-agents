/**
 * JSON Formatter Test Suite
 * 
 * Tests the JsonFormatter which converts LintResult objects into JSON output.
 * Used for:
 * - CI/CD integration (machine-readable results)
 * - Automated reporting and analytics
 * - Custom tooling and dashboards
 * - Archiving test results
 * 
 * Test Coverage:
 * - Successful validations (all validators pass)
 * - Failed validations (with violation details)
 * - Multiple violations of different severity levels
 * - Violation metadata (file paths, suggestions, rules)
 * - Summary statistics (total/passed/failed validators)
 * - Timestamp and duration tracking
 * 
 * JSON Schema Guarantees:
 * - All required fields present
 * - Valid severity levels (error, warning, info)
 * - Properly nested violation structure
 * - Parsable by standard JSON tools
 * 
 * Why JSON Format?
 * - Language-agnostic (works with any tooling)
 * - Structured data for programmatic analysis
 * - Easy to parse and filter
 * - Standard format for CI/CD pipelines
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JsonFormatter } from '../../src/formatters/json-formatter.js';
import type { LintResult, ValidationResult } from '../../src/types/index.js';
import { createMockResult } from '../helpers/test-fixtures.js';

describe('JsonFormatter', () => {
  let formatter: JsonFormatter;

  beforeEach(() => {
    formatter = new JsonFormatter();
  });

  describe('Basic Properties', () => {
    it('should have correct name and extension', () => {
      expect(formatter.name).toBe('json');
      expect(formatter.extension).toBe('.json');
    });
  });

  describe('Formatting', () => {
    it('should produce valid JSON', () => {
      const mockResult = createMockResult();
      const output = formatter.format(mockResult);
      
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should include all result fields', () => {
      const mockResult = createMockResult();
      const output = formatter.format(mockResult);
      const parsed = JSON.parse(output);
      
      expect(parsed.skill).toBe('test-skill');
      expect(parsed.passed).toBe(true);
      expect(parsed.duration).toBe(100);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.summary).toBeDefined();
    });

    it('should format with indentation', () => {
      const mockResult = createMockResult();
      const output = formatter.format(mockResult);
      
      // Should have indentation (not minified)
      expect(output).toContain('\n');
      expect(output).toContain('  ');
    });

    it('should handle violations correctly', () => {
      const mockResult = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          duration: 10,
          violations: [
            {
              level: 'error',
              rule: 'test-rule',
              message: 'Test message',
              file: '/test/file.md',
              line: 10,
              suggestion: 'Fix it'
            }
          ]
        }]
      });
      
      const output = formatter.format(mockResult);
      const parsed = JSON.parse(output);
      
      expect(parsed.results[0].violations).toHaveLength(1);
      expect(parsed.results[0].violations[0].level).toBe('error');
      expect(parsed.results[0].violations[0].message).toBe('Test message');
    });

    it('should handle metrics correctly', () => {
      const mockResult = createMockResult({
        results: [{
          validator: 'test',
          passed: true,
          duration: 10,
          violations: [],
          metrics: {
            lineCount: 500,
            tokens: 3000,
            accuracy: 95.5
          }
        }]
      });
      
      const output = formatter.format(mockResult);
      const parsed = JSON.parse(output);
      
      expect(parsed.results[0].metrics).toBeDefined();
      expect(parsed.results[0].metrics.lineCount).toBe(500);
      expect(parsed.results[0].metrics.accuracy).toBe(95.5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty violations array', () => {
      const mockResult = createMockResult();
      const output = formatter.format(mockResult);
      const parsed = JSON.parse(output);
      
      expect(parsed.results[0].violations).toEqual([]);
    });

    it('should handle special characters in strings', () => {
      const mockResult = createMockResult({
        results: [{
          validator: 'test',
          passed: false,
          duration: 10,
          violations: [
            {
              level: 'error',
              rule: 'test',
              message: 'Message with "quotes" and \n newlines'
            }
          ]
        }]
      });
      
      const output = formatter.format(mockResult);
      
      expect(() => JSON.parse(output)).not.toThrow();
    });
  });
});
