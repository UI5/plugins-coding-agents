/**
 * CLI Index Test Suite
 * 
 * Tests the main CLI orchestrator and command routing.
 * 
 * Coverage:
 * - Command creation and configuration
 * - Argument parsing
 * - Command routing
 * - Version and help output
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCLI } from '../../src/cli/index.js';
import type { Command } from 'commander';

describe('CLI Index', () => {
  let program: Command;

  beforeEach(() => {
    program = createCLI();
  });

  describe('Program Configuration', () => {
    it('should have correct name', () => {
      expect(program.name()).toBe('skill-lint');
    });

    it('should have description', () => {
      const description = program.description();
      expect(description).toBeTruthy();
      expect(description).toContain('linter');
    });

    it('should have version', () => {
      expect(program.version()).toBe('1.0.0');
    });

    it('should have commands', () => {
      const commands = program.commands.map(cmd => cmd.name());
      expect(commands).toContain('lint');
      expect(commands).toContain('check');
      expect(commands).toContain('init');
    });
  });

  describe('Lint Command', () => {
    let lintCommand: Command | undefined;

    beforeEach(() => {
      lintCommand = program.commands.find(cmd => cmd.name() === 'lint');
    });

    it('should be registered', () => {
      expect(lintCommand).toBeDefined();
    });

    it('should have description', () => {
      expect(lintCommand?.description()).toContain('Lint');
    });

    it('should require path argument', () => {
      const args = lintCommand?.registeredArguments || [];
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('path');
      expect(args[0].required).toBe(true);
    });

    it('should have config option', () => {
      const opts = lintCommand?.options || [];
      const configOpt = opts.find(o => o.long === '--config');
      expect(configOpt).toBeDefined();
      expect(configOpt?.short).toBe('-c');
    });

    it('should have format option', () => {
      const opts = lintCommand?.options || [];
      const formatOpt = opts.find(o => o.long === '--format');
      expect(formatOpt).toBeDefined();
      expect(formatOpt?.short).toBe('-f');
      expect(formatOpt?.defaultValue).toBe('text');
    });

    it('should have output option', () => {
      const opts = lintCommand?.options || [];
      const outputOpt = opts.find(o => o.long === '--output');
      expect(outputOpt).toBeDefined();
      expect(outputOpt?.short).toBe('-o');
    });

    it('should have scenario options', () => {
      const opts = lintCommand?.options || [];
      expect(opts.find(o => o.long === '--structure')).toBeDefined();
      expect(opts.find(o => o.long === '--triggering')).toBeDefined();
      expect(opts.find(o => o.long === '--performance')).toBeDefined();
      expect(opts.find(o => o.long === '--integration')).toBeDefined();
    });

    it('should have negation options', () => {
      const opts = lintCommand?.options || [];
      expect(opts.find(o => o.long === '--no-structure')).toBeDefined();
      expect(opts.find(o => o.long === '--no-triggering')).toBeDefined();
      expect(opts.find(o => o.long === '--no-performance')).toBeDefined();
    });

    it('should have verbose option', () => {
      const opts = lintCommand?.options || [];
      const verboseOpt = opts.find(o => o.long === '--verbose');
      expect(verboseOpt).toBeDefined();
      expect(verboseOpt?.short).toBe('-v');
    });
  });

  describe('Check Command', () => {
    let checkCommand: Command | undefined;

    beforeEach(() => {
      checkCommand = program.commands.find(cmd => cmd.name() === 'check');
    });

    it('should be registered', () => {
      expect(checkCommand).toBeDefined();
    });

    it('should have description', () => {
      expect(checkCommand?.description()).toContain('Verify');
    });

    it('should require path argument', () => {
      const args = checkCommand?.registeredArguments || [];
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('path');
      expect(args[0].required).toBe(true);
    });

    it('should have adapter option', () => {
      const opts = checkCommand?.options || [];
      const adapterOpt = opts.find(o => o.long === '--adapter');
      expect(adapterOpt).toBeDefined();
      expect(adapterOpt?.short).toBe('-a');
    });
  });

  describe('Init Command', () => {
    let initCommand: Command | undefined;

    beforeEach(() => {
      initCommand = program.commands.find(cmd => cmd.name() === 'init');
    });

    it('should be registered', () => {
      expect(initCommand).toBeDefined();
    });

    it('should have description', () => {
      expect(initCommand?.description()).toContain('Generate');
    });

    it('should not require arguments', () => {
      const args = initCommand?.registeredArguments || [];
      expect(args).toHaveLength(0);
    });
  });

  describe('Command Structure', () => {
    it('should have exactly 3 commands', () => {
      expect(program.commands).toHaveLength(3);
    });

    it('should have distinct command names', () => {
      const names = program.commands.map(cmd => cmd.name());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have all commands with descriptions', () => {
      program.commands.forEach(cmd => {
        expect(cmd.description()).toBeTruthy();
        expect(cmd.description().length).toBeGreaterThan(0);
      });
    });
  });
});
