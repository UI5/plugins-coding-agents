/**
 * CLI lint command — main entry point for skill linting
 */

import { resolve, relative, isAbsolute, join, dirname } from 'path';
import { realpath, access, constants } from 'fs/promises';
import { existsSync } from 'fs';
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
  try {
    // Validate skill path for security (prevents path traversal attacks)
    const resolvedPath = await validateSkillPath(skillPath);
    const config = await buildConfig(options);
    const formatter = getFormatter(config.formatters.default, config.formatters.options.colors);
    const isMachineFormat = config.formatters.default !== 'text';

    if (!isMachineFormat) {
      Logger.start(`Linting ${resolvedPath}`);
    }

    const linter = new SkillLinter(config);

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

/**
 * Validate skill path for security and correctness
 * Prevents path traversal attacks and ensures path points to valid SKILL.md
 */
async function validateSkillPath(skillPath: string): Promise<string> {
  // Use git root as workspace root if available, otherwise cwd
  const workspaceRoot = await findGitRoot() || process.cwd();
  const resolved = resolve(workspaceRoot, skillPath);
  
  // Check if path exists
  if (!existsSync(resolved)) {
    throw new Error(`Skill path does not exist: ${skillPath}`);
  }
  
  // Resolve symlinks to get real path (prevents symlink attacks)
  let realPath: string;
  try {
    realPath = await realpath(resolved);
  } catch (error) {
    throw new Error(`Failed to resolve skill path: ${skillPath}`);
  }
  
  // Ensure path is within workspace (prevents path traversal)
  const rel = relative(workspaceRoot, realPath);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Skill path must be within workspace: ${skillPath}`);
  }
  
  // Check if path is accessible
  try {
    await access(realPath, constants.R_OK);
  } catch (error) {
    throw new Error(`Cannot read skill path (permission denied): ${skillPath}`);
  }
  
  // Determine if path is a file or directory
  const isDirectory = existsSync(realPath) && !realPath.endsWith('.md');
  
  // If directory, ensure it contains SKILL.md
  if (isDirectory) {
    const skillFile = join(realPath, 'SKILL.md');
    if (!existsSync(skillFile)) {
      throw new Error(`Directory does not contain SKILL.md: ${skillPath}`);
    }
    return skillFile;
  }
  
  // If file, ensure it's named SKILL.md
  if (!realPath.endsWith('SKILL.md')) {
    throw new Error(`Skill path must point to SKILL.md or directory containing it: ${skillPath}`);
  }
  
  return realPath;
}

/**
 * Find the git repository root by walking up the directory tree
 */
async function findGitRoot(): Promise<string | null> {
  let currentDir = process.cwd();
  
  while (currentDir !== dirname(currentDir)) {
    const gitDir = join(currentDir, '.git');
    try {
      await access(gitDir, constants.R_OK);
      return currentDir;
    } catch {
      currentDir = dirname(currentDir);
    }
  }
  
  return null;
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
