/**
 * Link Validator Test Suite
 *
 * Tests the LinkValidator which checks:
 * - Broken relative links
 * - Broken reference file links
 * - Invalid anchor links
 * - External link checking (opt-in)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { LinkValidator } from '../../src/validators/link-validator.js';
import type { LintConfig, Skill } from '../../src/types/index.js';
import { createMockConfig } from '../helpers/test-fixtures.js';

describe('LinkValidator', () => {
  let validator: LinkValidator;
  let mockConfig: LintConfig;
  let tempDir: string;

  beforeEach(() => {
    validator = new LinkValidator();
    tempDir = join(tmpdir(), `skill-lint-link-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, 'skills/test-skill'), { recursive: true });

    mockConfig = createMockConfig({
      scenarios: {
        structure: false,
        size: false,
        references: false,
        links: { enabled: true, checkExternal: false },
        keywords: false,
        harness: false,
      }
    });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createSkill(content: string): Skill {
    const skillPath = join(tempDir, 'skills/test-skill/SKILL.md');
    writeFileSync(skillPath, content);
    return {
      path: skillPath,
      content,
      metadata: {
        name: 'test-skill',
        description: 'A test skill for link validation',
      },
      pluginRoot: tempDir,
    };
  }

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('links');
      expect(validator.description).toContain('link');
    });
  });

  describe('Relative Links', () => {
    it('should pass when relative links resolve', async () => {
      writeFileSync(join(tempDir, 'skills/test-skill/patterns.md'), '# Patterns');
      const skill = createSkill('# Skill\n\nSee [patterns](patterns.md) for details.');

      const result = await validator.validate(skill, mockConfig);

      const broken = result.violations.find(v => v.rule === 'broken-relative-link');
      expect(broken).toBeUndefined();
    });

    it('should error on broken relative links', async () => {
      const skill = createSkill('# Skill\n\nSee [missing](missing-file.txt) for details.');

      const result = await validator.validate(skill, mockConfig);

      const broken = result.violations.find(v => v.rule === 'broken-relative-link');
      expect(broken).toBeDefined();
      expect(broken?.level).toBe('error');
    });

    it('should detect broken reference links', async () => {
      const skill = createSkill('# Skill\n\nSee [ref](references/missing.md) for details.');

      const result = await validator.validate(skill, mockConfig);

      const broken = result.violations.find(v => v.rule === 'broken-reference-link');
      expect(broken).toBeDefined();
      expect(broken?.level).toBe('error');
    });
  });

  describe('Anchor Links', () => {
    it('should pass when anchor matches a heading', async () => {
      const skill = createSkill('# Skill\n\n## Installation\n\nSee [Installation](#installation).');

      const result = await validator.validate(skill, mockConfig);

      const invalid = result.violations.find(v => v.rule === 'anchor-link-invalid');
      expect(invalid).toBeUndefined();
    });

    it('should warn on invalid anchor links', async () => {
      const skill = createSkill('# Skill\n\n## Installation\n\nSee [Setup](#setup-guide).');

      const result = await validator.validate(skill, mockConfig);

      const invalid = result.violations.find(v => v.rule === 'anchor-link-invalid');
      expect(invalid).toBeDefined();
      expect(invalid?.level).toBe('warning');
    });
  });

  describe('External Links', () => {
    it('should skip external links by default', async () => {
      const skill = createSkill('# Skill\n\n[Docs](https://example.com/nonexistent-page-12345)');

      const result = await validator.validate(skill, mockConfig);

      const ext = result.violations.find(v => v.rule === 'external-link-unreachable');
      expect(ext).toBeUndefined();
    });
  });

  describe('Metrics', () => {
    it('should count link types in metrics', async () => {
      writeFileSync(join(tempDir, 'skills/test-skill/ref.md'), '# Ref');
      const skill = createSkill(
        '# Skill\n\n[local](ref.md)\n[ext](https://example.com)\n[anchor](#skill)'
      );

      const result = await validator.validate(skill, mockConfig);

      expect(result.metrics?.relativeLinks).toBe(1);
      expect(result.metrics?.externalLinks).toBe(1);
      expect(result.metrics?.anchorLinks).toBe(1);
    });
  });

  describe('No Links', () => {
    it('should pass when skill has no links', async () => {
      const skill = createSkill('# Skill\n\nNo links here.');

      const result = await validator.validate(skill, mockConfig);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });

  describe('Combined Scenarios', () => {
    it('should report multiple broken links', async () => {
      const skill = createSkill(
        '# Skill\n\n[a](missing1.md)\n[b](missing2.md)\n[c](references/gone.md)'
      );

      const result = await validator.validate(skill, mockConfig);

      const broken = result.violations.filter(v =>
        v.rule === 'broken-relative-link' || v.rule === 'broken-reference-link'
      );
      expect(broken.length).toBe(3);
    });
  });
});
