/**
 * Input sanitization utilities
 * Prevents terminal injection, prompt injection, and other security issues
 */

/**
 * Sanitize a string for safe display in terminal output
 * Removes ANSI codes, control characters, and normalizes whitespace
 */
export function sanitizeForTerminal(input: string): string {
  return input
    // Remove ANSI escape codes
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
    // Remove other control characters except newline and tab
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize a skill name for safe use in prompts and file names
 * Removes potentially dangerous characters
 */
export function sanitizeSkillName(name: string): string {
  return name
    // Remove shell metacharacters
    .replace(/[;&|`$(){}[\]<>]/g, '')
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    // Remove quotes and backslashes
    .replace(/['"\\]/g, '')
    // Normalize to single spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if content size is within safe limits
 * @throws Error if content exceeds limit
 */
export function validateContentSize(content: string, maxSize: number, label: string): void {
  const size = Buffer.byteLength(content, 'utf8');
  if (size > maxSize) {
    throw new Error(
      `${label} size (${Math.round(size / 1024)}KB) exceeds maximum (${Math.round(maxSize / 1024)}KB). ` +
      `This may indicate a malformed file or potential security issue.`
    );
  }
}

/**
 * Deduplicate an array of strings (case-insensitive)
 */
export function deduplicateStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const lower = item.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}
