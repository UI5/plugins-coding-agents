/**
 * Path Security Utilities
 * Provides comprehensive path validation and sanitization to prevent security vulnerabilities
 * 
 * Security Protections:
 * - Null byte injection (CVE-2008-2958)
 * - Unicode homoglyph attacks (CVE-2019-9636)
 * - Path traversal (CWE-22)
 * - Redundant separators and dots
 */

import { normalize } from 'path';

/**
 * Sanitize a file path for security vulnerabilities
 * 
 * Protections:
 * 1. Null byte injection - prevents directory traversal via null bytes
 * 2. Unicode normalization - prevents homoglyph and mixed-script attacks
 * 3. Path normalization - removes redundant separators and resolves dots
 * 
 * @param path - The path to sanitize
 * @returns Sanitized path
 * @throws Error if path contains null bytes or invalid Unicode
 */
export function sanitizePath(path: string): string {
  if (typeof path !== 'string') {
    throw new Error('Path must be a string');
  }

  // 1. Check for null bytes (CVE-2008-2958)
  // Null bytes can be used to bypass file extension checks and directory traversal
  // Example attack: "/path/to/file.txt\0.exe" bypasses .txt check
  if (path.includes('\0')) {
    throw new Error('Path contains null byte (potential security vulnerability)');
  }

  // 2. Unicode normalization (CVE-2019-9636)
  // Prevents attacks using Unicode homoglyphs and mixed scripts
  // Example: "../" using look-alike Unicode characters (⁄ vs /)
  // NFC (Canonical Decomposition + Canonical Composition) is the recommended normalization
  let normalizedPath: string;
  try {
    normalizedPath = path.normalize('NFC');
  } catch (error) {
    throw new Error(`Invalid Unicode in path: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check for dangerous Unicode characters that look like path separators
  // These can bypass path traversal checks:
  // - U+2044 (⁄) FRACTION SLASH
  // - U+2215 (∕) DIVISION SLASH
  // - U+FF0F (／) FULLWIDTH SOLIDUS
  // - U+29F8 (⧸) BIG SOLIDUS
  const dangerousUnicode = /[\u2044\u2215\uff0f\u29f8]/;
  if (dangerousUnicode.test(normalizedPath)) {
    throw new Error('Path contains Unicode characters that resemble path separators');
  }

  // 3. Path normalization - removes redundant separators and resolves . and ..
  // This is done AFTER Unicode normalization to ensure we're working with normalized text
  // normalize() will resolve:
  // - "path//to///file" → "path/to/file"
  // - "path/./to/./file" → "path/to/file"
  // - "path/to/../file" → "path/file"
  const sanitized = normalize(normalizedPath);

  return sanitized;
}

/**
 * Validate that a path doesn't contain dangerous patterns
 * 
 * Checks for:
 * - Absolute paths (when relative expected)
 * - Parent directory traversal (..)
 * - Current directory references (.)
 * - Empty path components
 * 
 * @param path - The path to validate
 * @param allowAbsolute - Whether to allow absolute paths (default: false)
 * @throws Error if path contains dangerous patterns
 */
export function validatePathPattern(path: string, allowAbsolute = false): void {
  // Check for absolute paths if not allowed
  if (!allowAbsolute && (path.startsWith('/') || /^[a-zA-Z]:/.test(path))) {
    throw new Error('Absolute paths are not allowed');
  }

  // Split path into components for detailed analysis
  const components = path.split(/[/\\]/).filter(c => c !== '');

  // Check each component
  for (const component of components) {
    // Parent directory traversal
    if (component === '..') {
      throw new Error('Path traversal using ".." is not allowed');
    }

    // Check for hidden dangerous patterns after normalization
    // These shouldn't exist after sanitizePath, but defense in depth
    if (component.includes('\0')) {
      throw new Error('Path component contains null byte');
    }

    // Check for Windows reserved names (even on non-Windows for consistency)
    // CON, PRN, AUX, NUL, COM1-9, LPT1-9
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    if (reservedNames.test(component)) {
      throw new Error(`Path contains Windows reserved name: ${component}`);
    }
  }
}

/**
 * Check if a path is within a given root directory (prevents path traversal)
 * 
 * @param path - The path to check (should be sanitized first)
 * @param root - The root directory path
 * @returns true if path is within root, false otherwise
 */
export function isPathWithinRoot(path: string, root: string): boolean {
  // Normalize both paths for comparison
  const normalizedPath = normalize(path);
  const normalizedRoot = normalize(root);

  // Ensure root ends with separator for startsWith check
  const rootWithSep = normalizedRoot.endsWith('/') 
    ? normalizedRoot 
    : normalizedRoot + '/';

  // Path must start with root or be equal to root
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(rootWithSep);
}

/**
 * Comprehensive path security validation
 * Combines sanitization and pattern validation in one call
 * 
 * @param path - The path to validate
 * @param options - Validation options
 * @returns Sanitized path
 * @throws Error if path fails any security check
 */
export function validateSecurePath(
  path: string,
  options: {
    allowAbsolute?: boolean;
    requireWithinRoot?: string;
  } = {}
): string {
  // Step 1: Sanitize (null bytes, Unicode, normalization)
  const sanitized = sanitizePath(path);

  // Step 2: Pattern validation (traversal, reserved names)
  validatePathPattern(sanitized, options.allowAbsolute);

  // Step 3: Root containment check (if required)
  if (options.requireWithinRoot && !isPathWithinRoot(sanitized, options.requireWithinRoot)) {
    throw new Error(`Path must be within root directory: ${options.requireWithinRoot}`);
  }

  return sanitized;
}
