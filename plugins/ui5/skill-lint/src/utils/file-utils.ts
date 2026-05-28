/**
 * File system helpers for reading and parsing skill files
 */

import { readFile, access, constants, readdir, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { createInterface } from 'readline';
import * as yaml from 'js-yaml';
import { TOKEN_ESTIMATION, SECURITY_LIMITS } from './constants.js';
import { sanitizePath } from './path-security.js';
import { retryOperation } from './retry.js';
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

  const resolvedPath = existsSync(join(sanitized, 'SKILL.md'))
    ? join(sanitized, 'SKILL.md')
    : sanitized;

  // Check file accessibility with retry logic (handles EMFILE, EBUSY, etc.)
  try {
    await retryOperation(() => access(resolvedPath, constants.R_OK));
  } catch (error) {
    throw new Error(`Skill file not found: ${resolvedPath}`);
  }

  // SECURITY: Check file size before reading to prevent OOM attacks
  const fileSize = await getFileSize(resolvedPath);
  if (fileSize > SECURITY_LIMITS.MAX_FILE_SIZE_BYTES) {
    const maxMB = SECURITY_LIMITS.MAX_FILE_SIZE_BYTES / (1024 * 1024);
    const actualMB = (fileSize / (1024 * 1024)).toFixed(2);
    throw new Error(
      `File too large: ${actualMB}MB exceeds maximum allowed size of ${maxMB}MB. ` +
      `Set MAX_FILE_SIZE_MB environment variable to increase limit.`
    );
  }

  // Read file with retry logic
  const content = await retryOperation(() => readFile(resolvedPath, 'utf-8'));
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
      await retryOperation(() => access(join(dir, '.claude-plugin'), constants.R_OK));
      return dir;
    } catch (error) {
      // Expected: .claude-plugin may not exist in this directory
    }

    try {
      await retryOperation(() => access(join(dir, 'package.json'), constants.R_OK));
      return dir;
    } catch (error) {
      // Expected: package.json may not exist in this directory
    }

    dir = dirname(dir);
  }

  return startDir;
}



/**
 * Count lines in a file using streaming.
 * Memory-efficient approach for large files (>10MB).
 * Uses Node.js readline interface with createReadStream.
 * 
 * @param filePath - Absolute path to the file
 * @returns Number of lines in the file
 * 
 * @example
 * ```typescript
 * // Efficiently count lines in a 500MB file
 * const lines = await countLinesStreaming('/path/to/huge.log');
 * console.log(`Large file has ${lines} lines`);
 * ```
 */
async function countLinesStreaming(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let lineCount = 0;
    
    const stream = createReadStream(filePath, { encoding: 'utf-8' });
    const rl = createInterface({
      input: stream,
      crlfDelay: Infinity, // Treat \r\n as single line break
    });

    rl.on('line', () => {
      lineCount++;
    });

    rl.on('close', () => {
      resolve(lineCount);
    });

    stream.on('error', (error) => {
      reject(error);
    });

    rl.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Count lines in a file.
 * Automatically chooses between in-memory and streaming approach based on file size.
 * 
 * - Files ≤10MB: In-memory (fast, simple)
 * - Files >10MB: Streaming (memory-efficient, prevents OOM)
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
  // Check file size to decide approach
  const size = await getFileSize(filePath);
  
  if (size > SECURITY_LIMITS.STREAMING_THRESHOLD_BYTES) {
    // Large file: use streaming to prevent OOM
    return retryOperation(() => countLinesStreaming(filePath));
  }
  
  // Small file: load into memory (faster)
  const content = await retryOperation(() => readFile(filePath, 'utf-8'));
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
  const stats = await retryOperation(() => stat(filePath));
  return stats.size;
}

/**
 * List files in a directory, filtering by extension
 */
export async function listFiles(dir: string, extension?: string): Promise<string[]> {
  try {
    await retryOperation(() => access(dir, constants.R_OK));
  } catch (error) {
    // Expected: directory may not exist
    return [];
  }
  
  const files = await retryOperation(() => readdir(dir));
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
