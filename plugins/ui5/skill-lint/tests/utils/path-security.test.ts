/**
 * Tests for Path Security Utilities
 * Critical security testing for path validation and sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizePath,
  validatePathPattern,
  isPathWithinRoot,
  validateSecurePath,
} from '../../src/utils/path-security.js';
import { join, normalize } from 'path';

describe('Path Security Utilities', () => {
  describe('sanitizePath', () => {
    describe('Null Byte Injection (CVE-2008-2958)', () => {
      it('should reject path with null byte', () => {
        expect(() => sanitizePath('file.txt\0.exe')).toThrow('null byte');
      });

      it('should reject path with null byte in middle', () => {
        expect(() => sanitizePath('path/to/\0file.txt')).toThrow('null byte');
      });

      it('should reject path with multiple null bytes', () => {
        expect(() => sanitizePath('\0\0\0')).toThrow('null byte');
      });
    });

    describe('Unicode Normalization (CVE-2019-9636)', () => {
      it('should normalize Unicode to NFC form', () => {
        // é can be represented as single char (U+00E9) or combining (e + U+0301)
        const combining = 'caf\u0065\u0301'; // e + combining acute
        const precomposed = 'café'; // é as single character
        
        const result = sanitizePath(combining);
        expect(result).toBe(normalize(precomposed));
      });

      it('should reject Unicode fraction slash (U+2044)', () => {
        expect(() => sanitizePath('path⁄to⁄file')).toThrow('Unicode characters that resemble path separators');
      });

      it('should reject Unicode division slash (U+2215)', () => {
        expect(() => sanitizePath('path∕to∕file')).toThrow('Unicode characters that resemble path separators');
      });

      it('should reject fullwidth solidus (U+FF0F)', () => {
        expect(() => sanitizePath('path／to／file')).toThrow('Unicode characters that resemble path separators');
      });

      it('should reject big solidus (U+29F8)', () => {
        expect(() => sanitizePath('path⧸to⧸file')).toThrow('Unicode characters that resemble path separators');
      });
    });

    describe('Path Normalization', () => {
      it('should normalize redundant slashes', () => {
        const result = sanitizePath('path//to///file');
        expect(result).toBe(normalize('path/to/file'));
      });

      it('should resolve current directory references', () => {
        const result = sanitizePath('path/./to/./file');
        expect(result).toBe(normalize('path/to/file'));
      });

      it('should resolve parent directory references', () => {
        const result = sanitizePath('path/to/../file');
        expect(result).toBe(normalize('path/file'));
      });

      it('should preserve path separators per OS', () => {
        // normalize() handles path separators according to OS
        const result = sanitizePath('path/to/file');
        expect(result).toBe(normalize('path/to/file'));
      });
    });

    describe('Valid Paths', () => {
      it('should accept simple relative path', () => {
        expect(sanitizePath('file.txt')).toBe('file.txt');
      });

      it('should accept nested relative path', () => {
        const result = sanitizePath('path/to/file.txt');
        expect(result).toBe(normalize('path/to/file.txt'));
      });

      it('should accept absolute path', () => {
        const result = sanitizePath('/absolute/path/file.txt');
        expect(result).toBe(normalize('/absolute/path/file.txt'));
      });

      it('should accept path with spaces', () => {
        const result = sanitizePath('path with spaces/file.txt');
        expect(result).toBe(normalize('path with spaces/file.txt'));
      });

      it('should accept path with special characters', () => {
        const result = sanitizePath('path-with_special.chars/file@2x.png');
        expect(result).toBe(normalize('path-with_special.chars/file@2x.png'));
      });
    });

    describe('Error Handling', () => {
      it('should reject non-string input', () => {
        expect(() => sanitizePath(null as any)).toThrow('must be a string');
        expect(() => sanitizePath(undefined as any)).toThrow('must be a string');
        expect(() => sanitizePath(123 as any)).toThrow('must be a string');
      });
    });
  });

  describe('validatePathPattern', () => {
    describe('Path Traversal Prevention', () => {
      it('should reject parent directory traversal', () => {
        expect(() => validatePathPattern('../etc/passwd')).toThrow('Path traversal');
      });

      it('should reject nested parent traversal', () => {
        expect(() => validatePathPattern('path/../../etc/passwd')).toThrow('Path traversal');
      });

      it('should reject multiple parent traversals', () => {
        expect(() => validatePathPattern('../../../../../etc/passwd')).toThrow('Path traversal');
      });
    });

    describe('Absolute Path Handling', () => {
      it('should reject absolute Unix paths by default', () => {
        expect(() => validatePathPattern('/etc/passwd')).toThrow('Absolute paths are not allowed');
      });

      it('should reject absolute Windows paths by default', () => {
        expect(() => validatePathPattern('C:\\Windows\\System32')).toThrow('Absolute paths are not allowed');
      });

      it('should allow absolute paths when explicitly enabled', () => {
        expect(() => validatePathPattern('/etc/passwd', true)).not.toThrow();
        expect(() => validatePathPattern('C:\\Windows\\System32', true)).not.toThrow();
      });
    });

    describe('Windows Reserved Names', () => {
      it('should reject CON', () => {
        expect(() => validatePathPattern('path/CON/file')).toThrow('reserved name');
      });

      it('should reject PRN', () => {
        expect(() => validatePathPattern('PRN')).toThrow('reserved name');
      });

      it('should reject AUX', () => {
        expect(() => validatePathPattern('path/AUX')).toThrow('reserved name');
      });

      it('should reject NUL', () => {
        expect(() => validatePathPattern('NUL')).toThrow('reserved name');
      });

      it('should reject COM1-9', () => {
        expect(() => validatePathPattern('COM1')).toThrow('reserved name');
        expect(() => validatePathPattern('COM5')).toThrow('reserved name');
        expect(() => validatePathPattern('COM9')).toThrow('reserved name');
      });

      it('should reject LPT1-9', () => {
        expect(() => validatePathPattern('LPT1')).toThrow('reserved name');
        expect(() => validatePathPattern('LPT5')).toThrow('reserved name');
        expect(() => validatePathPattern('LPT9')).toThrow('reserved name');
      });

      it('should reject case-insensitive reserved names', () => {
        expect(() => validatePathPattern('con')).toThrow('reserved name');
        expect(() => validatePathPattern('Con')).toThrow('reserved name');
        expect(() => validatePathPattern('cOn')).toThrow('reserved name');
      });
    });

    describe('Valid Patterns', () => {
      it('should accept simple relative path', () => {
        expect(() => validatePathPattern('file.txt')).not.toThrow();
      });

      it('should accept nested relative path', () => {
        expect(() => validatePathPattern('path/to/file.txt')).not.toThrow();
      });

      it('should accept path with spaces', () => {
        expect(() => validatePathPattern('path with spaces/file.txt')).not.toThrow();
      });

      it('should accept path with special characters', () => {
        expect(() => validatePathPattern('path-with_special.chars/file@2x.png')).not.toThrow();
      });
    });
  });

  describe('isPathWithinRoot', () => {
    it('should return true for path within root', () => {
      const root = '/home/user/workspace';
      const path = '/home/user/workspace/project/file.txt';
      expect(isPathWithinRoot(path, root)).toBe(true);
    });

    it('should return true for path equal to root', () => {
      const root = '/home/user/workspace';
      expect(isPathWithinRoot(root, root)).toBe(true);
    });

    it('should return false for path outside root', () => {
      const root = '/home/user/workspace';
      const path = '/home/user/other/file.txt';
      expect(isPathWithinRoot(path, root)).toBe(false);
    });

    it('should return false for parent of root', () => {
      const root = '/home/user/workspace';
      const path = '/home/user';
      expect(isPathWithinRoot(path, root)).toBe(false);
    });

    it('should handle relative paths', () => {
      const root = 'workspace';
      const path = 'workspace/project/file.txt';
      expect(isPathWithinRoot(path, root)).toBe(true);
    });

    it('should handle paths with redundant separators', () => {
      const root = '/home/user/workspace';
      const path = '/home/user//workspace///project/file.txt';
      expect(isPathWithinRoot(path, root)).toBe(true);
    });

    it('should prevent traversal attacks', () => {
      const root = '/home/user/workspace';
      const path = '/home/user/workspace/../../../etc/passwd';
      // After normalization, this becomes /etc/passwd
      expect(isPathWithinRoot(path, root)).toBe(false);
    });
  });

  describe('validateSecurePath', () => {
    describe('Combined Validation', () => {
      it('should apply all security checks', () => {
        expect(() => validateSecurePath('file\0.txt')).toThrow('null byte');
        expect(() => validateSecurePath('../etc/passwd')).toThrow('Path traversal');
        expect(() => validateSecurePath('path⁄to⁄file')).toThrow('Unicode');
      });

      it('should return sanitized path for valid input', () => {
        const result = validateSecurePath('path//to/./file.txt');
        expect(result).toBe(normalize('path/to/file.txt'));
      });
    });

    describe('Root Containment', () => {
      it('should enforce root containment when specified', () => {
        const root = normalize('/home/user/workspace');
        const options = { requireWithinRoot: root, allowAbsolute: true };

        // Should accept path within root
        const validPath = join(root, 'project/file.txt');
        expect(() => validateSecurePath(validPath, options)).not.toThrow();

        // Should reject path outside root
        const invalidPath = '/etc/passwd';
        expect(() => validateSecurePath(invalidPath, options)).toThrow('must be within root directory');
      });

      it('should work without root containment check', () => {
        expect(() => validateSecurePath('/any/absolute/path', { allowAbsolute: true })).not.toThrow();
      });
    });

    describe('Absolute Path Control', () => {
      it('should reject absolute paths by default', () => {
        expect(() => validateSecurePath('/absolute/path')).toThrow('Absolute paths are not allowed');
      });

      it('should allow absolute paths when enabled', () => {
        expect(() => validateSecurePath('/absolute/path', { allowAbsolute: true })).not.toThrow();
      });
    });

    describe('Real-world Attack Scenarios', () => {
      it('should prevent null byte directory traversal', () => {
        // Classic attack: "/safe/path\0/../../../etc/passwd"
        expect(() => validateSecurePath('/safe/path\0/../../../etc/passwd')).toThrow('null byte');
      });

      it('should prevent Unicode homoglyph path traversal', () => {
        // Attack using look-alike Unicode slash
        expect(() => validateSecurePath('safe⁄path⁄..⁄..⁄etc⁄passwd')).toThrow('Unicode');
      });

      it('should prevent combined attacks', () => {
        // Multiple attack vectors in one path
        expect(() => validateSecurePath('../safe⁄path\0/file')).toThrow();
      });

      it('should allow legitimate paths with special chars', () => {
        const result = validateSecurePath('my-project/src/components/Button_v2.tsx');
        expect(result).toBe(normalize('my-project/src/components/Button_v2.tsx'));
      });
    });
  });
});
