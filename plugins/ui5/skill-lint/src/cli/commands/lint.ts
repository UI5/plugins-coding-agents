/**
 * CLI lint command — main entry point for skill linting
 */

import { resolve, relative, isAbsolute, join, dirname } from 'path';
import { realpath, access, readdir, stat, constants } from 'fs/promises';
import { existsSync } from 'fs';
import { SkillLinter } from '../../core/linter.js';
import { loadConfig, mergeWithDefaults } from '../../config/loader.js';
import { TextFormatter } from '../../formatters/text-formatter.js';
import { JsonFormatter } from '../../formatters/json-formatter.js';
import { GithubActionsFormatter } from '../../formatters/github-actions-formatter.js';
import { BaseFormatter } from '../../formatters/base-formatter.js';
import { Logger } from '../../utils/logger.js';
import { sanitizePath } from '../../utils/path-security.js';
import type { LintConfig } from '../../types/index.js';

export interface LintOptions {
  config?: string;
  format?: string;
  output?: string;
  structure?: boolean;
  size?: boolean;
  references?: boolean;
  links?: boolean;
  keywords?: boolean;
  harness?: boolean;
  // Backward compat CLI flags
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
    // Input validation
    if (!skillPath || typeof skillPath !== 'string') {
      throw new Error('Invalid skill path: must be a non-empty string');
    }
    if (skillPath.trim().length === 0) {
      throw new Error('Invalid skill path: cannot be empty or whitespace');
    }
    if (!options || typeof options !== 'object') {
      throw new Error('Invalid options: must be a valid options object');
    }

    // Validate skill path for security (prevents path traversal attacks)
    const resolvedPaths = await resolveSkillPaths(skillPath);
    const config = await buildConfig(options);
    const formatter = getFormatter(config.formatters.default, config.formatters.options.colors);
    const isMachineFormat = config.formatters.default !== 'text';

    if (resolvedPaths.length > 1) {
      // Multi-skill mode
      if (!isMachineFormat) {
        Logger.start(`Linting ${resolvedPaths.length} skills in ${skillPath}`);
      }

      const linter = new SkillLinter(config);
      let allPassed = true;

      for (const resolvedPath of resolvedPaths) {
        const result = await linter.lint(resolvedPath, config);
        const output = formatter.format(result);
        console.log(output);
        if (!result.passed) allPassed = false;
      }

      if (options.output) {
        Logger.document(`Multi-skill report: use --format json for combined output`);
      }

      return allPassed ? 0 : 1;
    }

    // Single-skill mode
    const resolvedPath = resolvedPaths[0];

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
 * Resolve one or more SKILL.md paths from the given input path.
 * If the path is a directory containing multiple skill subdirectories, returns all of them.
 * Otherwise delegates to validateSkillPath for a single path.
 */
async function resolveSkillPaths(skillPath: string): Promise<string[]> {
  // SECURITY: Sanitize path first
  let sanitized: string;
  try {
    sanitized = sanitizePath(skillPath);
  } catch (error) {
    throw new Error(`Invalid skill path: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Resolve from cwd (for relative paths) or as-is (for absolute paths)
  const resolved = resolve(process.cwd(), sanitized);

  if (!existsSync(resolved)) {
    throw new Error(`Skill path does not exist: ${skillPath}`);
  }

  // Validate that resolved path is within workspace
  const workspaceRoot = await findGitRoot() || process.cwd();
  const rel = relative(workspaceRoot, resolved);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Skill path must be within workspace: ${skillPath}`);
  }

  // If it's a file, treat as single skill
  const stats = await stat(resolved);
  if (stats.isFile()) {
    return [await validateSkillPath(skillPath)];
  }

  // If it's a directory, check for SKILL.md directly inside
  const directSkill = join(resolved, 'SKILL.md');
  if (existsSync(directSkill)) {
    return [await validateSkillPath(skillPath)];
  }

  // Multi-skill mode: scan subdirectories for SKILL.md files
  const entries = await readdir(resolved, { withFileTypes: true });
  const skillPaths: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const subSkill = join(resolved, entry.name, 'SKILL.md');
    if (existsSync(subSkill)) {
      skillPaths.push(subSkill);
    }
  }

  if (skillPaths.length === 0) {
    throw new Error(`No SKILL.md files found in directory: ${skillPath}`);
  }

  return skillPaths;
}

/**
 * Validate skill path for security and correctness
 * Prevents path traversal attacks and ensures path points to valid SKILL.md
 */
async function validateSkillPath(skillPath: string): Promise<string> {
  // SECURITY: Sanitize path to prevent:
  // - Null byte injection (CVE-2008-2958)
  // - Unicode homoglyph attacks (CVE-2019-9636)
  // - Path normalization vulnerabilities
  let sanitized: string;
  try {
    sanitized = sanitizePath(skillPath);
  } catch (error) {
    throw new Error(`Invalid skill path: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Resolve from cwd (for relative paths) or as-is (for absolute paths)
  const resolved = resolve(process.cwd(), sanitized);
  
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
  const workspaceRoot = await findGitRoot() || process.cwd();
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
    } catch (error) {
      // Expected: .git directory may not exist in this directory
      currentDir = dirname(currentDir);
    }
  }
  
  return null;
}

async function buildConfig(options: LintOptions): Promise<LintConfig> {
  const fileConfig = await loadConfig(options.config);

  // CLI flags override file config
  const overrides: Record<string, unknown> = {};

  const hasScenarioFlag = options.structure !== undefined || options.size !== undefined ||
      options.references !== undefined || options.links !== undefined ||
      options.keywords !== undefined || options.harness !== undefined ||
      options.triggering !== undefined || options.performance !== undefined ||
      options.integration !== undefined;

  if (hasScenarioFlag) {
    overrides.scenarios = {
      structure: options.structure ?? fileConfig.scenarios.structure,
      size: (options.size ?? options.performance) ?? fileConfig.scenarios.size,
      references: options.references ?? fileConfig.scenarios.references,
      links: options.links !== undefined
        ? { enabled: options.links, checkExternal: fileConfig.scenarios.links?.checkExternal ?? false }
        : fileConfig.scenarios.links,
      keywords: (options.keywords ?? options.triggering) ?? fileConfig.scenarios.keywords,
      harness: (options.harness ?? options.integration) ?? fileConfig.scenarios.harness,
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
