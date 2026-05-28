/**
 * Reference Validator Test Suite
 *
 * Tests the ReferenceValidator which checks:
 * - Reference file discovery and counting
 * - README conciseness
 * - Duplicate code blocks between README and SKILL.md
 * - Fixture file size
 * - Should-split recommendation
 * - Loading instructions check
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { ReferenceValidator } from '../../src/validators/reference-validator.js';
import type { LintConfig, Skill } from '../../src/types/index.js';
import { createMockConfig } from '../helpers/test-fixtures.js';

describe('ReferenceValidator', () => {
  let validator: ReferenceValidator;
  let mockConfig: LintConfig;
  let tempDir: string;

  beforeEach(() => {
    validator = new ReferenceValidator();
    tempDir = join(tmpdir(), `skill-lint-ref-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, 'skills/test-skill'), { recursive: true });

    mockConfig = createMockConfig({
      scenarios: {
        structure: false,
        size: false,
        references: true,
        links: { enabled: false, checkExternal: false },
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

  function createSkill(overrides: Partial<Skill> = {}): Skill {
    const skillPath = join(tempDir, 'skills/test-skill/SKILL.md');
    const content = overrides.content ?? '# Test Skill\n\nA test skill.';
    writeFileSync(skillPath, content);
    return {
      path: skillPath,
      content,
      metadata: {
        name: 'test-skill',
        description: 'A test skill for reference validation',
      },
      pluginRoot: tempDir,
      ...overrides,
    };
  }

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('references');
      expect(validator.description).toContain('reference');
    });
  });

  describe('Reference File Discovery', () => {
    it('should detect reference files alongside SKILL.md', async () => {
      const skill = createSkill();
      writeFileSync(join(tempDir, 'skills/test-skill/api-patterns.md'), '# API Patterns');

      const result = await validator.validate(skill, mockConfig);

      const refCount = result.violations.find(v => v.rule === 'reference-file-count');
      expect(refCount).toBeDefined();
      expect(refCount?.message).toContain('1 reference file');
    });

    it('should count multiple reference files', async () => {
      const skill = createSkill();
      writeFileSync(join(tempDir, 'skills/test-skill/patterns.md'), '# Patterns');
      writeFileSync(join(tempDir, 'skills/test-skill/examples.md'), '# Examples');
      writeFileSync(join(tempDir, 'skills/test-skill/api.md'), '# API');

      const result = await validator.validate(skill, mockConfig);

      const refCount = result.violations.find(v => v.rule === 'reference-file-count');
      expect(refCount).toBeDefined();
      expect(refCount?.message).toContain('3 reference file');
    });

    it('should not count non-md files as references', async () => {
      const skill = createSkill();
      writeFileSync(join(tempDir, 'skills/test-skill/data.json'), '{}');

      const result = await validator.validate(skill, mockConfig);

      const refCount = result.violations.find(v => v.rule === 'reference-file-count');
      expect(refCount).toBeUndefined();
    });
  });

  describe('Loading Instructions', () => {
    it('should warn when references exist but no loading instructions', async () => {
      const skill = createSkill({ content: '# Test Skill\n\nNo loading guidance here.' });
      writeFileSync(join(tempDir, 'skills/test-skill/patterns.md'), '# Patterns');

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'reference-loading-instructions');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });

    it('should not warn when loading instructions exist', async () => {
      const skill = createSkill({ content: '# Test Skill\n\nUse read_file to load reference patterns.' });
      writeFileSync(join(tempDir, 'skills/test-skill/patterns.md'), '# Patterns');

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'reference-loading-instructions');
      expect(violation).toBeUndefined();
    });
  });

  describe('Should Split', () => {
    it('should suggest splitting when SKILL.md is large with no references', async () => {
      const largeContent = Array(500).fill('This is a line of content.').join('\n');
      const skill = createSkill({ content: largeContent });

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'should-use-references');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });

    it('should not suggest splitting when references exist', async () => {
      const largeContent = Array(500).fill('This is a line of content.').join('\n');
      const skill = createSkill({ content: largeContent });
      writeFileSync(join(tempDir, 'skills/test-skill/details.md'), '# Details');

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'should-use-references');
      expect(violation).toBeUndefined();
    });

    it('should not suggest splitting for small skills', async () => {
      const skill = createSkill({ content: Array(100).fill('Short.').join('\n') });

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'should-use-references');
      expect(violation).toBeUndefined();
    });
  });

  describe('README Conciseness', () => {
    it('should warn when README is too long', async () => {
      const skill = createSkill();
      writeFileSync(join(tempDir, 'README.md'), Array(200).fill('Line').join('\n'));

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'readme-too-long');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });

    it('should not warn for concise README', async () => {
      const skill = createSkill();
      writeFileSync(join(tempDir, 'README.md'), Array(50).fill('Line').join('\n'));

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'readme-too-long');
      expect(violation).toBeUndefined();
    });
  });

  describe('Duplicate Content', () => {
    it('should detect duplicate code blocks', async () => {
      const codeBlock = '```typescript\nconst x = 1;\nconst y = 2;\nconst z = x + y;\nconsole.log(z);\n```';
      const skill = createSkill({ content: `# Skill\n\n${codeBlock}` });
      writeFileSync(join(tempDir, 'README.md'), `# README\n\n${codeBlock}`);

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'duplicate-code-blocks');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });

    it('should not flag short code blocks', async () => {
      const shortBlock = '```ts\nx\n```';
      const skill = createSkill({ content: `# Skill\n\n${shortBlock}` });
      writeFileSync(join(tempDir, 'README.md'), `# README\n\n${shortBlock}`);

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'duplicate-code-blocks');
      expect(violation).toBeUndefined();
    });
  });

  describe('Fixture Size', () => {
    it('should warn when trigger-cases.json is too large', async () => {
      const skill = createSkill();
      mkdirSync(join(tempDir, 'test/fixtures'), { recursive: true });
      const largeData = JSON.stringify({ tests: Array(500).fill({ prompt: 'x'.repeat(200), category: 'test' }) });
      writeFileSync(join(tempDir, 'test/fixtures/trigger-cases.json'), largeData);

      const result = await validator.validate(skill, mockConfig);

      const violation = result.violations.find(v => v.rule === 'fixture-too-large');
      expect(violation).toBeDefined();
      expect(violation?.level).toBe('warning');
    });
  });

  describe('Pass/Fail Logic', () => {
    it('should pass when no error-level violations', async () => {
      const skill = createSkill({ content: '# Test\n\nSmall skill.' });

      const result = await validator.validate(skill, mockConfig);

      expect(result.passed).toBe(true);
    });
  });
});
