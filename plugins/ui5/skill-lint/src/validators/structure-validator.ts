/**
 * Structure Validator
 * Checks file existence, frontmatter validity, sections, links, and project scaffolding.
 * Migrated from structure.test.ts — all AVA dependencies removed.
 */

import { readFile, access, constants } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { BaseValidator } from './base-validator.js';
import { FRONTMATTER, TEST_THRESHOLDS } from '../utils/constants.js';
import type { ValidationResult, Violation, Skill, LintConfig } from '../types/index.js';

export class StructureValidator extends BaseValidator {
  readonly name = 'structure';
  readonly description = 'Validates skill file structure, metadata, and project scaffolding';

  async validate(skill: Skill, _config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];
    const root = skill.pluginRoot;

    // ── SKILL.md existence ──
    try {
      await access(skill.path, constants.R_OK);
    } catch (error) {
      // Expected: SKILL.md may not exist, validation handles this
      violations.push(this.createViolation('error', 'skill-exists', `SKILL.md not found at ${skill.path}`));
    }

    // ── Synchronous checks (no parallelization needed) ──
    violations.push(...this.checkFrontmatter(skill));
    violations.push(...this.checkSections(skill));

    // ── Parallel async checks for independent file operations ──
    const [pluginViolations, linksViolations, readmeViolations, fixturesViolations, projectViolations] = await Promise.all([
      this.checkPluginJson(root),
      this.checkLinks(skill),
      this.checkReadme(root, skill),
      this.checkTestFixtures(root),
      this.checkProjectFiles(root),
    ]);

    violations.push(...pluginViolations, ...linksViolations, ...readmeViolations, ...fixturesViolations, ...projectViolations);

    return this.buildResult(violations, start);
  }

  // ── Private helpers ──

  private async checkPluginJson(root: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const pluginPath = join(root, '.claude-plugin/plugin.json');

    try {
      await access(pluginPath, constants.R_OK);
    } catch (error) {
      // Expected: plugin.json may not exist in new projects
      violations.push(this.createViolation('error', 'plugin-json-exists',
        'Missing .claude-plugin/plugin.json',
        { suggestion: 'Create a plugin.json with name, version, and skills array' }));
      return violations;
    }

    try {
      const content = await readFile(pluginPath, 'utf-8');
      const plugin = JSON.parse(content);

      if (typeof plugin.name !== 'string') {
        violations.push(this.createViolation('error', 'plugin-json-name',
          'plugin.json missing "name" string field', { file: pluginPath }));
      }
      if (typeof plugin.version !== 'string') {
        violations.push(this.createViolation('error', 'plugin-json-version',
          'plugin.json missing "version" string field', { file: pluginPath }));
      }
      if (!Array.isArray(plugin.skills) || plugin.skills.length === 0) {
        violations.push(this.createViolation('error', 'plugin-json-skills',
          'plugin.json must have a non-empty "skills" array', { file: pluginPath }));
      }
    } catch (error) {
      // JSON parsing or field validation failed
      violations.push(this.createViolation('error', 'plugin-json-parse',
        'plugin.json is not valid JSON', { file: pluginPath }));
    }

    return violations;
  }

  private checkFrontmatter(skill: Skill): Violation[] {
    const violations: Violation[] = [];
    const { metadata, path: filePath } = skill;

    if (!metadata.name) {
      violations.push(this.createViolation('error', 'frontmatter-name',
        'Frontmatter is missing "name"', { file: filePath }));
    }
    if (!metadata.description) {
      violations.push(this.createViolation('error', 'frontmatter-description',
        'Frontmatter is missing "description"', { file: filePath }));
    }
    if (metadata.description && metadata.description.length <= FRONTMATTER.MIN_DESCRIPTION_LENGTH) {
      violations.push(this.createViolation('warning', 'frontmatter-description-length',
        `Description is only ${metadata.description.length} chars — should be > ${FRONTMATTER.MIN_DESCRIPTION_LENGTH} for effective triggering`,
        { file: filePath, suggestion: 'Add more keywords and context to the description' }));
    }

    return violations;
  }

  private checkSections(skill: Skill): Violation[] {
    const violations: Violation[] = [];

    // Only check sections if the skill has known section patterns
    const sectionPattern = /^## \d+\./m;
    if (!sectionPattern.test(skill.content)) {
      return violations; // No numbered sections — not an error for all skills
    }

    // Detect numbered sections present
    const headingMatches = [...skill.content.matchAll(/^(## \d+\..+)$/gm)];
    if (headingMatches.length < 2) {
      violations.push(this.createViolation('info', 'sections-count',
        `SKILL.md has only ${headingMatches.length} numbered section(s) — consider adding more`,
        { file: skill.path }));
    }

    return violations;
  }

  private async checkLinks(skill: Skill): Promise<Violation[]> {
    const violations: Violation[] = [];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [...skill.content.matchAll(linkPattern)];
    let checkedCount = 0;

    for (const [, , url] of links) {
      // Skip external URLs and anchors
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#')) {
        continue;
      }

      const linkPath = join(dirname(skill.path), url);
      try {
        await access(linkPath, constants.R_OK);
      } catch (error) {
        // Expected: linked file may not exist
        violations.push(this.createViolation('error', 'broken-link',
          `Broken relative link: ${url}`, { file: skill.path }));
      }
      checkedCount++;
    }

    if (checkedCount > 0) {
      // info-level: all links resolved
    }

    return violations;
  }

  private async checkReadme(root: string, skill: Skill): Promise<Violation[]> {
    const violations: Violation[] = [];
    const readmePath = join(root, 'README.md');

    try {
      await access(readmePath, constants.R_OK);
    } catch (error) {
      // Expected: README.md is optional but recommended
      violations.push(this.createViolation('warning', 'readme-exists',
        'No README.md found at plugin root',
        { suggestion: 'Add a README.md with usage instructions' }));
      return violations;
    }

    const readme = await readFile(readmePath, 'utf-8');
    if (!readme.includes(skill.metadata.name)) {
      violations.push(this.createViolation('warning', 'readme-references-skill',
        `README.md does not mention skill "${skill.metadata.name}"`,
        { file: readmePath }));
    }

    return violations;
  }

  private async checkTestFixtures(root: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const triggerCasesPath = join(root, 'test/fixtures/trigger-cases.json');

    try {
      await access(triggerCasesPath, constants.R_OK);
    } catch (error) {
      // Expected: test fixtures may not exist yet
      violations.push(this.createViolation('info', 'trigger-fixtures-exist',
        'No trigger-cases.json found at test/fixtures/ — triggering validation will be limited',
        { suggestion: 'Create test/fixtures/trigger-cases.json with prompt test cases' }));
      return violations;
    }

    try {
      const content = await readFile(triggerCasesPath, 'utf-8');
      const fixtures = JSON.parse(content);
      if (!Array.isArray(fixtures.tests)) {
        violations.push(this.createViolation('error', 'trigger-fixtures-format',
          'trigger-cases.json must have a "tests" array', { file: triggerCasesPath }));
      } else if (fixtures.tests.length < TEST_THRESHOLDS.MIN_TRIGGER_TEST_CASES) {
        violations.push(this.createViolation('warning', 'trigger-fixtures-count',
          `Only ${fixtures.tests.length} test cases — recommend at least ${TEST_THRESHOLDS.MIN_TRIGGER_TEST_CASES}`,
          { file: triggerCasesPath }));
      }
    } catch (error) {
      // JSON parsing or structure validation failed
      violations.push(this.createViolation('error', 'trigger-fixtures-parse',
        'trigger-cases.json is not valid JSON', { file: triggerCasesPath }));
    }

    return violations;
  }

  private async checkProjectFiles(root: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const pkgPath = join(root, 'package.json');

    try {
      await access(pkgPath, constants.R_OK);
    } catch (error) {
      // Expected: package.json is optional for simple plugins
      violations.push(this.createViolation('warning', 'package-json-exists',
        'No package.json at plugin root'));
      return violations;
    }

    try {
      const content = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(content);
      if (typeof pkg.scripts !== 'object' || !pkg.scripts.test) {
        violations.push(this.createViolation('warning', 'package-json-test-script',
          'package.json has no "test" script', { file: pkgPath }));
      }
    } catch (error) {
      // JSON parsing failed
      violations.push(this.createViolation('error', 'package-json-parse',
        'package.json is not valid JSON', { file: pkgPath }));
    }

    return violations;
  }
}
