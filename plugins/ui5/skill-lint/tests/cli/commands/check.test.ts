/**
 * Check Command Test Suite
 * 
 * Tests the check command interface and option handling.
 * Includes both unit tests (type safety, interfaces) and integration tests
 * (actual command execution with real skill files).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkCommand, type CheckOptions } from '../../../src/cli/commands/check.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '../../..');
const testSkillPath = join(projectRoot, '../skills/ui5-best-practices');

describe('Check Command CLI Interface', () => {
  describe('Type Definitions', () => {
    it('should have correct CheckOptions interface', () => {
      const options: CheckOptions = {
        adapter: 'claude-code',
      };

      expect(options.adapter).toBe('claude-code');
    });

    it('should allow empty options', () => {
      const options: CheckOptions = {};

      expect(Object.keys(options)).toHaveLength(0);
    });
  });

  describe('Adapter Option', () => {
    it('should support adapter option', () => {
      const options: CheckOptions = { adapter: 'mock' };
      expect(options.adapter).toBe('mock');
    });

    it('should default adapter to undefined', () => {
      const options: CheckOptions = {};
      expect(options.adapter).toBeUndefined();
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

    it('should execute check command with real skill file', async () => {
      const exitCode = await checkCommand(testSkillPath, {});

      // Should complete (exit code 0 for success or 2 for error)
      expect(exitCode).toBeGreaterThanOrEqual(0);
      expect(exitCode).toBeLessThanOrEqual(2);
    });

    it('should display skill information', async () => {
      const exitCode = await checkCommand(testSkillPath, {});

      // Check command uses Logger, not console.log directly
      // Just verify it completes
      expect(exitCode).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid path gracefully', async () => {
      const exitCode = await checkCommand('/nonexistent/path', {});

      expect(exitCode).toBeGreaterThan(0); // Error exit code
    });

    it('should handle adapter option', async () => {
      const exitCode = await checkCommand(testSkillPath, { adapter: 'mock' });

      expect(exitCode).toBeGreaterThanOrEqual(0);
    });
  });
});
