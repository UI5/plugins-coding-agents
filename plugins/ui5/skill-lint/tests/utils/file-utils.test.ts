import { describe, it, expect, beforeEach } from 'vitest';
import { extractFrontmatter } from '../../src/utils/file-utils.js';

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
});
