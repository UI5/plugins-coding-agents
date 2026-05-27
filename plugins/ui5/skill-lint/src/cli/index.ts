/**
 * CLI orchestrator — wires Commander.js commands
 */

import { Command } from 'commander';
import { lintCommand } from './commands/lint.js';
import { checkCommand } from './commands/check.js';
import { initCommand } from './commands/init.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('skill-lint')
    .description('CLI linter for Claude Code skills')
    .version('1.0.0');

  // ── lint ──
  program
    .command('lint')
    .description('Lint a skill directory or SKILL.md file')
    .argument('<path>', 'Path to skill directory or SKILL.md')
    .option('-c, --config <path>', 'Path to config file')
    .option('-f, --format <format>', 'Output format: text, json, github-actions', 'text')
    .option('-o, --output <path>', 'Write report to file')
    .option('--structure', 'Run structure validation')
    .option('--size', 'Run size checks')
    .option('--references', 'Run reference file analysis')
    .option('--links', 'Run link validation')
    .option('--keywords', 'Run keyword/triggering simulation')
    .option('--harness', 'Run harness tests (requires adapter)')
    // Backward compat flags
    .option('--triggering', 'Run keyword simulation (alias for --keywords)')
    .option('--performance', 'Run size checks (alias for --size)')
    .option('--integration', 'Run harness tests (alias for --harness)')
    .option('--no-structure', 'Skip structure validation')
    .option('--no-size', 'Skip size checks')
    .option('--no-references', 'Skip reference analysis')
    .option('--no-links', 'Skip link validation')
    .option('--no-keywords', 'Skip keyword simulation')
    .option('-v, --verbose', 'Verbose output')
    .action(async (path: string, options) => {
      const exitCode = await lintCommand(path, options);
      process.exit(exitCode);
    });

  // ── check ──
  program
    .command('check')
    .description('Verify a skill is installed and loadable')
    .argument('<path>', 'Path to skill directory or SKILL.md')
    .option('-a, --adapter <name>', 'Check adapter availability')
    .action(async (path: string, options) => {
      const exitCode = await checkCommand(path, options);
      process.exit(exitCode);
    });

  // ── init ──
  program
    .command('init')
    .description('Generate a .skilllintrc.json config file')
    .action(async () => {
      const exitCode = await initCommand();
      process.exit(exitCode);
    });

  return program;
}
