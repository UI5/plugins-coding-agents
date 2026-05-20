/**
 * File system helpers for reading and parsing skill files
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import * as yaml from 'js-yaml';
import type { Skill, SkillMetadata } from '../types/index.js';

/**
 * Load a skill from a SKILL.md file path or directory containing SKILL.md
 */
export function loadSkill(skillPath: string): Skill {
  const resolvedPath = existsSync(join(skillPath, 'SKILL.md'))
    ? join(skillPath, 'SKILL.md')
    : skillPath;

  if (!existsSync(resolvedPath)) {
    throw new Error(`Skill file not found: ${resolvedPath}`);
  }

  const content = readFileSync(resolvedPath, 'utf-8');
  const metadata = extractFrontmatter(content);

  // Walk up to find plugin root (directory containing package.json or .claude-plugin)
  const pluginRoot = findPluginRoot(dirname(resolvedPath));

  return { path: resolvedPath, content, metadata, pluginRoot };
}

/**
 * Extract YAML frontmatter from SKILL.md content
 * Returns empty metadata if frontmatter is missing or invalid (graceful fallback)
 */
export function extractFrontmatter(content: string): SkillMetadata {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { name: '', description: '', compatibility: [] };
  }

  try {
    const raw = yaml.load(match[1]) as Record<string, unknown>;

    return {
      name: typeof raw.name === 'string' ? raw.name : '',
      description: typeof raw.description === 'string' ? raw.description : '',
      compatibility: Array.isArray(raw.compatibility)
        ? (raw.compatibility as string[])
        : [],
    };
  } catch (error) {
    // YAML parsing error - log and return empty metadata
    console.warn('[extractFrontmatter] Failed to parse YAML frontmatter:', error instanceof Error ? error.message : String(error));
    return { name: '', description: '', compatibility: [] };
  }
}

/**
 * Walk up directory tree to find the plugin root
 * (contains package.json or .claude-plugin directory)
 */
export function findPluginRoot(startDir: string): string {
  let dir = startDir;
  const root = dirname(dir) === dir ? dir : '/';

  while (dir !== root) {
    if (
      existsSync(join(dir, '.claude-plugin')) ||
      existsSync(join(dir, 'package.json'))
    ) {
      return dir;
    }
    dir = dirname(dir);
  }

  return startDir;
}

/**
 * Count lines in a file
 */
export function countLines(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  return content.split('\n').length;
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  return statSync(filePath).size;
}

/**
 * List files in a directory, filtering by extension
 */
export function listFiles(dir: string, extension?: string): string[] {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir);
  return extension
    ? files.filter(f => f.endsWith(extension))
    : files;
}

/**
 * Approximate token count (1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
