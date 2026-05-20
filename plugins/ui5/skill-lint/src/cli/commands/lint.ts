/**
 * CLI lint command — main entry point for skill linting
 */

import { resolve } from 'path';
import { SkillLinter } from '../../core/linter.js';
import { loadConfig, mergeWithDefaults } from '../../config/loader.js';
import { TextFormatter } from '../../formatters/text-formatter.js';
import { JsonFormatter } from '../../formatters/json-formatter.js';
import { GithubActionsFormatter } from '../../formatters/github-actions-formatter.js';
import { BaseFormatter } from '../../formatters/base-formatter.js';
import { Logger } from '../../utils/logger.js';
import type { LintConfig } from '../../types/index.js';

export interface LintOptions {
  config?: string;
  format?: string;
  output?: string;
  structure?: boolean;
  triggering?: boolean;
  performance?: boolean;
  integration?: boolean;
  verbose?: boolean;
}

export async function lintCommand(
  skillPath: string,
  options: LintOptions,
): Promise<number> {
  const resolvedPath = resolve(skillPath);
  const config = await buildConfig(options);
  const formatter = getFormatter(config.formatters.default, config.formatters.options.colors);
  const isMachineFormat = config.formatters.default !== 'text';

  if (!isMachineFormat) {
    Logger.start(`Linting ${resolvedPath}`);
  }

  const linter = new SkillLinter(config);

  try {
    const result = await linter.lint(resolvedPath, config);
    const output = formatter.format(result);
    console.log(output);

    // Write to file if requested
    if (options.output) {
      const outPath = resolve(options.output);
      await formatter.writeToFile(result, outPath);
      Logger.document(`Report saved to ${outPath}`);
    }

    return result.passed ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(message);
    return 2;
  }
}

async function buildConfig(options: LintOptions): Promise<LintConfig> {
  const fileConfig = await loadConfig(options.config);

  // CLI flags override file config
  const overrides: Record<string, unknown> = {};

  if (options.structure !== undefined || options.triggering !== undefined ||
      options.performance !== undefined || options.integration !== undefined) {
    overrides.scenarios = {
      structure: options.structure ?? fileConfig.scenarios.structure,
      triggering: options.triggering ?? fileConfig.scenarios.triggering,
      performance: options.performance ?? fileConfig.scenarios.performance,
      integration: options.integration ?? fileConfig.scenarios.integration,
    };
  }

  if (options.format) {
    overrides.formatters = {
      ...fileConfig.formatters,
      default: options.format,
    };
  }

  if (options.verbose !== undefined) {
    overrides.formatters = {
      ...(overrides.formatters as Record<string, unknown> ?? fileConfig.formatters),
      options: { ...fileConfig.formatters.options, verbose: options.verbose },
    };
  }

  return mergeWithDefaults({ ...fileConfig, ...overrides });
}

function getFormatter(name: string, colors: boolean): BaseFormatter {
  switch (name) {
    case 'json': return new JsonFormatter();
    case 'github-actions': return new GithubActionsFormatter();
    case 'text':
    default: return new TextFormatter({ colors });
  }
}
