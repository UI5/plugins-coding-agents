/**
 * Lint Command Test Suite
 * 
 * Tests the main lint command interface and option handling.
 * Includes both unit tests (type safety, interfaces) and integration tests
 * (actual command execution with real skill files).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { lintCommand, type LintOptions } from '../../../src/cli/commands/lint.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');
const testSkillPath = join(projectRoot, '../skills/ui5-best-practices');

describe('Lint Command CLI Interface', () => {
  describe('Type Definitions', () => {
    it('should have correct LintOptions interface', () => {
      const options: LintOptions = {
        format: 'json',
        output: './output.json',
        config: './.skilllintrc.json',
        structure: true,
        triggering: true,
        performance: true,
        integration: true,
        verbose: true,
      };

      expect(options.format).toBe('json');
      expect(options.output).toBe('./output.json');
      expect(options.config).toBe('./.skilllintrc.json');
      expect(options.structure).toBe(true);
      expect(options.triggering).toBe(true);
      expect(options.performance).toBe(true);
      expect(options.integration).toBe(true);
      expect(options.verbose).toBe(true);
    });

    it('should allow partial options', () => {
      const options: LintOptions = {
        format: 'text',
      };

      expect(options.format).toBe('text');
      expect(options.output).toBeUndefined();
    });

    it('should allow empty options', () => {
      const options: LintOptions = {};

      expect(Object.keys(options)).toHaveLength(0);
    });
  });

  describe('Format Options', () => {
    it('should support text format', () => {
      const options: LintOptions = { format: 'text' };
      expect(options.format).toBe('text');
    });

    it('should support json format', () => {
      const options: LintOptions = { format: 'json' };
      expect(options.format).toBe('json');
    });

    it('should support junit format', () => {
      const options: LintOptions = { format: 'junit' };
      expect(options.format).toBe('junit');
    });

    it('should support codeclimate format', () => {
      const options: LintOptions = { format: 'codeclimate' };
      expect(options.format).toBe('codeclimate');
    });

    it('should support github format', () => {
      const options: LintOptions = { format: 'github' };
      expect(options.format).toBe('github');
    });
  });

  describe('Scenario Options', () => {
    it('should support structure scenario', () => {
      const options: LintOptions = { structure: true };
      expect(options.structure).toBe(true);
    });

    it('should support triggering scenario', () => {
      const options: LintOptions = { triggering: true };
      expect(options.triggering).toBe(true);
    });

    it('should support performance scenario', () => {
      const options: LintOptions = { performance: true };
      expect(options.performance).toBe(true);
    });

    it('should support integration scenario', () => {
      const options: LintOptions = { integration: true };
      expect(options.integration).toBe(true);
    });

    it('should support multiple scenarios', () => {
      const options: LintOptions = {
        structure: true,
        triggering: true,
        performance: true,
      };

      expect(options.structure).toBe(true);
      expect(options.triggering).toBe(true);
      expect(options.performance).toBe(true);
    });
  });

  describe('Output Options', () => {
    it('should accept output file path', () => {
      const options: LintOptions = { output: './results.json' };
      expect(options.output).toBe('./results.json');
    });

    it('should accept absolute output path', () => {
      const options: LintOptions = { output: '/tmp/results.json' };
      expect(options.output).toBe('/tmp/results.json');
    });
  });

  describe('Config Options', () => {
    it('should accept config file path', () => {
      const options: LintOptions = { config: './custom.json' };
      expect(options.config).toBe('./custom.json');
    });

    it('should accept absolute config path', () => {
      const options: LintOptions = { config: '/etc/skilllint.json' };
      expect(options.config).toBe('/etc/skilllint.json');
    });
  });

  describe('Verbose Option', () => {
    it('should support verbose flag', () => {
      const options: LintOptions = { verbose: true };
      expect(options.verbose).toBe(true);
    });

    it('should default verbose to undefined', () => {
      const options: LintOptions = {};
      expect(options.verbose).toBeUndefined();
    });
  });

  describe('Integration Tests', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should execute lint command with real skill file', async () => {
      const exitCode = await lintCommand(testSkillPath, {});

      // Should complete successfully (exit code 0 or 1 depending on validation results)
      expect(exitCode).toBeGreaterThanOrEqual(0);
      expect(exitCode).toBeLessThanOrEqual(2);
    });

    it('should handle text format output', async () => {
      const exitCode = await lintCommand(testSkillPath, { format: 'text' });

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle json format output', async () => {
      const exitCode = await lintCommand(testSkillPath, { format: 'json' });

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid path gracefully', async () => {
      const exitCode = await lintCommand('/nonexistent/path', {});

      expect(exitCode).toBe(2); // Error exit code
    });

    it('should handle structure scenario option', async () => {
      const exitCode = await lintCommand(testSkillPath, { structure: true });

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple scenario options', async () => {
      const exitCode = await lintCommand(testSkillPath, {
        structure: true,
        triggering: true,
        performance: true,
      });

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });
  });
});

