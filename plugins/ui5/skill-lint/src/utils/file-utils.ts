/**
 * File system helpers for reading and parsing skill files
 */

import { readFile, access, constants, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import * as yaml from 'js-yaml';
import { TOKEN_ESTIMATION } from './constants.js';
import type { Skill, SkillMetadata } from '../types/index.js';

/**
 * Load a skill from a SKILL.md file path or directory containing SKILL.md
 */
export async function loadSkill(skillPath: string): Promise<Skill> {
  // Input validation
  if (!skillPath || typeof skillPath !== 'string') {
    throw new Error('Invalid skill path: must be a non-empty string');
  }
  if (skillPath.trim().length === 0) {
    throw new Error('Invalid skill path: cannot be empty or whitespace');
  }

  const resolvedPath = existsSync(join(skillPath, 'SKILL.md'))
    ? join(skillPath, 'SKILL.md')
    : skillPath;

  try {
    await access(resolvedPath, constants.R_OK);
  } catch (error) {
    throw new Error(`Skill file not found: ${resolvedPath}`);
  }

  const content = await readFile(resolvedPath, 'utf-8');
  const metadata = extractFrontmatter(content);

  // Walk up to find plugin root (directory containing package.json or .claude-plugin)
  const pluginRoot = await findPluginRoot(dirname(resolvedPath));

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
export async function findPluginRoot(startDir: string): Promise<string> {
  let dir = startDir;
  const root = dirname(dir) === dir ? dir : '/';

  while (dir !== root) {
    try {
      await access(join(dir, '.claude-plugin'), constants.R_OK);
      return dir;
    } catch (error) {
      // Expected: .claude-plugin may not exist in this directory
    }

    try {
      await access(join(dir, 'package.json'), constants.R_OK);
      return dir;
    } catch (error) {
      // Expected: package.json may not exist in this directory
    }

    dir = dirname(dir);
  }

  return startDir;
}

/**
 * Count lines in a file.
 * Reads the file from disk and counts newline characters.
 * 
 * @param filePath - Absolute path to the file
 * @returns Number of lines in the file
 * 
 * @example
 * ```typescript
 * const lines = await countLines('/path/to/SKILL.md');
 * console.log(`File has ${lines} lines`);
 * ```
 */
export async function countLines(filePath: string): Promise<number> {
  const content = await readFile(filePath, 'utf-8');
  return countLinesFromContent(content);
}

/**
 * Count lines in a string content.
 * Handles edge case of empty strings (returns 0, not 1).
 * 
 * Design Decision:
 * - Empty string returns 0 (no lines)
 * - Single line with no newline returns 1
 * - Content ending with newline counts the final line
 * 
 * This ensures consistent line counting across validators
 * and prevents off-by-one errors in performance checks.
 * 
 * @param content - String content to count lines in
 * @returns Number of lines in the content
 * 
 * @example
 * ```typescript
 * countLinesFromContent('') // => 0
 * countLinesFromContent('line1') // => 1
 * countLinesFromContent('line1\nline2') // => 2
 * countLinesFromContent('line1\nline2\n') // => 2
 * ```
 */
export function countLinesFromContent(content: string): number {
  // Empty string has no lines
  if (content.length === 0) {
    return 0;
  }
  
  // Count newline characters + 1 for the last line
  // But if content ends with newline, don't count extra line
  const lines = content.split('\n');
  
  // If last element is empty string (content ended with \n), don't count it
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    return lines.length - 1;
  }
  
  return lines.length;
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

/**
 * List files in a directory, filtering by extension
 */
export async function listFiles(dir: string, extension?: string): Promise<string[]> {
  try {
    await access(dir, constants.R_OK);
  } catch (error) {
    // Expected: directory may not exist
    return [];
  }
  
  const files = await readdir(dir);
  return extension
    ? files.filter(f => f.endsWith(extension))
    : files;
}

/**
 * Approximate token count (1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_ESTIMATION.CHARS_PER_TOKEN);
}
