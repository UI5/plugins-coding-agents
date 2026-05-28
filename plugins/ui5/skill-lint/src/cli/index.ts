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

  // ── analyze ──
  program
    .command('analyze')
    .description('Analyze skill and suggest trigger keywords (no test cases required)')
    .argument('<path>', 'Path to skill directory or SKILL.md')
    .option('-o, --output <path>', 'Output file path for generated trigger-cases.json')
    .option('-f, --format <format>', 'Output format: text, json', 'text')
    .action(async (path: string, options) => {
      const { analyzeCommand } = await import('./commands/analyze.js');
      const exitCode = await analyzeCommand(path, options);
      process.exit(exitCode);
    });

  // ── audit ──
  program
    .command('audit')
    .description('Run comprehensive harness audit with statistical analysis')
    .argument('<path>', 'Path to skill directory or SKILL.md')
    .option('-i, --iterations <number>', 'Number of iterations to run', '1')
    .option('-f, --format <format>', 'Output format: text, markdown, html, json', 'text')
    .option('-o, --output <path>', 'Save audit report to file')
    .option('--baseline <path>', 'Compare against historical baseline (JSON file)')
    .option('--confidence <level>', 'Confidence level for statistical tests', '0.95')
    .action(async (path: string, options) => {
      const { auditCommand } = await import('./commands/audit.js');

      // Validate iterations parameter
      const iterations = parseInt(options.iterations, 10);
      if (isNaN(iterations) || iterations < 1 || iterations > 1000) {
        console.error('Error: --iterations must be a number between 1 and 1000');
        process.exit(2);
      }

      // Validate confidence level
      const confidenceLevel = parseFloat(options.confidence);
      if (isNaN(confidenceLevel) || confidenceLevel <= 0 || confidenceLevel >= 1) {
        console.error('Error: --confidence must be a number between 0 and 1 (e.g., 0.95)');
        process.exit(2);
      }

      const exitCode = await auditCommand(path, {
        iterations,
        format: options.format,
        output: options.output,
        baseline: options.baseline,
        confidenceLevel,
      });
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
