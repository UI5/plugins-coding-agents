import { describe, it, expect, beforeEach } from 'vitest';
import { extractFrontmatter, countLinesFromContent } from '../../src/utils/file-utils.js';

describe('File Utils', () => {
  describe('extractFrontmatter', () => {
    it('should extract YAML frontmatter', () => {
      const content = `---
name: test-skill
description: Test description
compatibility:
  - version: 1.0.0
---

# Skill Content`;
      
      const result = extractFrontmatter(content);
      
      expect(result.name).toBe('test-skill');
      expect(result.description).toBe('Test description');
      expect(result.compatibility).toHaveLength(1);
    });

    it('should return empty object for no frontmatter', () => {
      const content = '# Skill without frontmatter';
      
      const result = extractFrontmatter(content);
      
      expect(result).toEqual({ name: '', description: '', compatibility: [] });
    });

    it('should handle empty frontmatter', () => {
      const content = `---
---

# Content`;
      
      const result = extractFrontmatter(content);
      
      expect(result).toEqual({ name: '', description: '', compatibility: [] });
    });

    it('should handle malformed YAML', () => {
      const content = `---
invalid: yaml: :
---

# Content`;
      
      const result = extractFrontmatter(content);
      
      expect(result).toEqual({ name: '', description: '', compatibility: [] });
    });

    it('should handle content without closing delimiter', () => {
      const content = `---
name: test

# No closing`;
      
      const result = extractFrontmatter(content);
      
      expect(result).toEqual({ name: '', description: '', compatibility: [] });
    });
  });

  describe('countLinesFromContent', () => {
    it('should return 0 for empty string', () => {
      expect(countLinesFromContent('')).toBe(0);
    });

    it('should return 1 for single line without newline', () => {
      expect(countLinesFromContent('line1')).toBe(1);
    });

    it('should return 2 for two lines separated by newline', () => {
      expect(countLinesFromContent('line1\nline2')).toBe(2);
    });

    it('should not count trailing newline as extra line', () => {
      // Content ending with newline should not add an extra empty line
      expect(countLinesFromContent('line1\nline2\n')).toBe(2);
    });

    it('should handle multiple trailing newlines correctly', () => {
      // Multiple trailing newlines should still count as part of the last line
      expect(countLinesFromContent('line1\nline2\n\n')).toBe(3);
    });

    it('should count empty lines in the middle', () => {
      expect(countLinesFromContent('line1\n\nline3')).toBe(3);
    });

    it('should handle Windows line endings (CRLF)', () => {
      // \r\n should split the same way as \n
      expect(countLinesFromContent('line1\r\nline2\r\n')).toBe(2);
    });

    it('should match split().length behavior for non-empty content', () => {
      const content = 'line1\nline2\nline3';
      // Without the edge case handling, split would give us 3 lines
      expect(countLinesFromContent(content)).toBe(3);
    });

    it('should handle very long content efficiently', () => {
      // Generate 1000 lines of content
      const lines = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`);
      const content = lines.join('\n');
      expect(countLinesFromContent(content)).toBe(1000);
    });
  });
});
