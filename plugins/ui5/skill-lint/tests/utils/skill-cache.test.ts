/**
 * Skill Cache Test Suite
 * 
 * Tests the in-memory skill caching system with mtime-based invalidation.
 * 
 * Coverage:
 * - Cache hits and misses
 * - LRU eviction when cache is full
 * - Automatic invalidation on file changes
 * - Cache statistics tracking
 * - Global cache instance behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { SkillCache } from '../../src/utils/skill-cache.js';

describe('SkillCache', () => {
  let tempDir: string;
  let skillPath: string;

  beforeEach(() => {
    // Create temp directory and skill file
    tempDir = mkdtempSync(join(tmpdir(), 'skill-cache-test-'));
    skillPath = join(tempDir, 'SKILL.md');
    
    writeFileSync(skillPath, `---
name: test-skill
description: Test skill for caching
compatibility: []
---

# Test Skill

This is a test skill for cache testing.`);
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic Operations', () => {
    it('should cache a loaded skill', async () => {
      const cache = new SkillCache();
      
      const skill1 = await cache.get(skillPath);
      const skill2 = await cache.get(skillPath);
      
      // Same object reference (cached)
      expect(skill2).toBe(skill1);
      expect(skill1.metadata.name).toBe('test-skill');
    });

    it('should track cache hits and misses', async () => {
      const cache = new SkillCache();
      
      await cache.get(skillPath); // Miss
      await cache.get(skillPath); // Hit
      await cache.get(skillPath); // Hit
      
      const stats = cache.stats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    it('should check if skill is cached without loading', async () => {
      const cache = new SkillCache();
      
      expect(cache.has(skillPath)).toBe(false);
      
      await cache.get(skillPath);
      
      expect(cache.has(skillPath)).toBe(true);
    });

    it('should clear all cached entries', async () => {
      const cache = new SkillCache();
      
      await cache.get(skillPath);
      expect(cache.stats().size).toBe(1);
      
      cache.clear();
      
      expect(cache.stats().size).toBe(0);
      expect(cache.has(skillPath)).toBe(false);
    });

    it('should reset statistics', async () => {
      const cache = new SkillCache();
      
      await cache.get(skillPath);
      await cache.get(skillPath);
      
      expect(cache.stats().hits).toBe(1);
      expect(cache.stats().misses).toBe(1);
      
      cache.resetStats();
      
      expect(cache.stats().hits).toBe(0);
      expect(cache.stats().misses).toBe(0);
    });
  });

  describe('Invalidation', () => {
    it('should invalidate on file modification', async () => {
      const cache = new SkillCache();
      
      const skill1 = await cache.get(skillPath);
      expect(cache.stats().misses).toBe(1);
      
      // Modify file (update mtime by 1 second in the future)
      const futureTime = new Date(Date.now() + 1000);
      utimesSync(skillPath, futureTime, futureTime);
      
      const skill2 = await cache.get(skillPath);
      
      // Should be different object (reloaded)
      expect(skill2).not.toBe(skill1);
      expect(cache.stats().misses).toBe(2);
    });

    it('should manually invalidate a cache entry', async () => {
      const cache = new SkillCache();
      
      await cache.get(skillPath);
      expect(cache.has(skillPath)).toBe(true);
      
      const removed = cache.invalidate(skillPath);
      
      expect(removed).toBe(true);
      expect(cache.has(skillPath)).toBe(false);
    });

    it('should return false when invalidating non-existent entry', () => {
      const cache = new SkillCache();
      
      const removed = cache.invalidate('/nonexistent/path');
      
      expect(removed).toBe(false);
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest entry when cache is full', async () => {
      const cache = new SkillCache(3); // Max 3 entries
      
      // Create multiple skill files
      const skill1Path = join(tempDir, 'skill1.md');
      const skill2Path = join(tempDir, 'skill2.md');
      const skill3Path = join(tempDir, 'skill3.md');
      const skill4Path = join(tempDir, 'skill4.md');
      
      for (const path of [skill1Path, skill2Path, skill3Path, skill4Path]) {
        writeFileSync(path, `---
name: ${path}
description: Test
---
# Test`);
      }
      
      // Fill cache
      await cache.get(skill1Path);
      await cache.get(skill2Path);
      await cache.get(skill3Path);
      
      expect(cache.stats().size).toBe(3);
      expect(cache.stats().evictions).toBe(0);
      
      // Add one more - should evict oldest (skill1)
      await cache.get(skill4Path);
      
      expect(cache.stats().size).toBe(3);
      expect(cache.stats().evictions).toBe(1);
      expect(cache.has(skill1Path)).toBe(false);
      expect(cache.has(skill4Path)).toBe(true);
    });

    it('should update LRU order on cache hit', async () => {
      const cache = new SkillCache(2); // Max 2 entries
      
      const skill1Path = join(tempDir, 'skill1.md');
      const skill2Path = join(tempDir, 'skill2.md');
      const skill3Path = join(tempDir, 'skill3.md');
      
      for (const path of [skill1Path, skill2Path, skill3Path]) {
        writeFileSync(path, `---\nname: test\n---\n# Test`);
      }
      
      await cache.get(skill1Path); // skill1 = oldest
      await cache.get(skill2Path); // skill2 = newest
      
      // Access skill1 again - makes it newest
      await cache.get(skill1Path);
      
      // Add skill3 - should evict skill2 (now oldest)
      await cache.get(skill3Path);
      
      expect(cache.has(skill1Path)).toBe(true);
      expect(cache.has(skill2Path)).toBe(false);
      expect(cache.has(skill3Path)).toBe(true);
    });
  });

  describe('Path Normalization', () => {
    it('should handle case-insensitive paths', async () => {
      const cache = new SkillCache();
      
      await cache.get(skillPath);
      
      // Same path, different case
      const upperPath = skillPath.toUpperCase();
      const skill2 = await cache.get(upperPath);
      
      // Should be cached (same normalized path)
      expect(cache.stats().hits).toBe(1);
      expect(cache.stats().misses).toBe(1);
    });

    it('should normalize backslashes to forward slashes', async () => {
      const cache = new SkillCache();
      
      await cache.get(skillPath);
      
      // Replace forward slashes with backslashes
      const backslashPath = skillPath.replace(/\//g, '\\');
      
      // Should find cached entry (same normalized path)
      expect(cache.has(backslashPath)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should calculate hit rate correctly', async () => {
      const cache = new SkillCache();
      
      // 1 miss, 3 hits = 75% hit rate
      await cache.get(skillPath);
      await cache.get(skillPath);
      await cache.get(skillPath);
      await cache.get(skillPath);
      
      const stats = cache.stats();
      expect(stats.hitRate).toBeCloseTo(75, 1);
    });

    it('should return 0% hit rate when no operations', () => {
      const cache = new SkillCache();
      
      const stats = cache.stats();
      expect(stats.hitRate).toBe(0);
    });

    it('should track cache size', async () => {
      const cache = new SkillCache();
      
      expect(cache.stats().size).toBe(0);
      
      await cache.get(skillPath);
      
      expect(cache.stats().size).toBe(1);
    });

    it('should preserve cumulative stats after clear', async () => {
      const cache = new SkillCache();
      
      await cache.get(skillPath);
      await cache.get(skillPath);
      
      cache.clear();
      
      // Stats should persist
      expect(cache.stats().hits).toBe(1);
      expect(cache.stats().misses).toBe(1);
      expect(cache.stats().size).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from loadSkill', async () => {
      const cache = new SkillCache();
      
      await expect(
        cache.get('/nonexistent/skill/path.md')
      ).rejects.toThrow();
    });
  });
});
