/**
 * Structure Validator
 * Checks file existence, frontmatter validity, sections, links, and project scaffolding.
 * Migrated from structure.test.ts — all AVA dependencies removed.
 */

import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { BaseValidator } from './base-validator.js';
import type { ValidationResult, Violation, Skill, LintConfig } from '../types/index.js';

export class StructureValidator extends BaseValidator {
  readonly name = 'structure';
  readonly description = 'Validates skill file structure, metadata, and project scaffolding';

  async validate(skill: Skill, _config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];
    const root = skill.pluginRoot;

    // ── plugin.json ──
    violations.push(...this.checkPluginJson(root));

    // ── SKILL.md existence ──
    if (!existsSync(skill.path)) {
      violations.push(this.createViolation('error', 'skill-exists', `SKILL.md not found at ${skill.path}`));
    }

    // ── Frontmatter quality ──
    violations.push(...this.checkFrontmatter(skill));

    // ── Major sections ──
    violations.push(...this.checkSections(skill));

    // ── Broken links ──
    violations.push(...this.checkLinks(skill));

    // ── README.md ──
    violations.push(...this.checkReadme(root, skill));

    // ── Test fixtures ──
    violations.push(...this.checkTestFixtures(root));

    // ── package.json / tsconfig.json ──
    violations.push(...this.checkProjectFiles(root));

    return this.buildResult(violations, start);
  }

  // ── Private helpers ──

  private checkPluginJson(root: string): Violation[] {
    const violations: Violation[] = [];
    const pluginPath = join(root, '.claude-plugin/plugin.json');

    if (!existsSync(pluginPath)) {
      violations.push(this.createViolation('error', 'plugin-json-exists',
        'Missing .claude-plugin/plugin.json',
        { suggestion: 'Create a plugin.json with name, version, and skills array' }));
      return violations;
    }

    try {
      const plugin = JSON.parse(readFileSync(pluginPath, 'utf-8'));

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
    } catch {
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
    if (metadata.description && metadata.description.length <= 50) {
      violations.push(this.createViolation('warning', 'frontmatter-description-length',
        `Description is only ${metadata.description.length} chars — should be > 50 for effective triggering`,
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

  private checkLinks(skill: Skill): Violation[] {
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
      if (!existsSync(linkPath)) {
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

  private checkReadme(root: string, skill: Skill): Violation[] {
    const violations: Violation[] = [];
    const readmePath = join(root, 'README.md');

    if (!existsSync(readmePath)) {
      violations.push(this.createViolation('warning', 'readme-exists',
        'No README.md found at plugin root',
        { suggestion: 'Add a README.md with usage instructions' }));
      return violations;
    }

    const readme = readFileSync(readmePath, 'utf-8');
    if (!readme.includes(skill.metadata.name)) {
      violations.push(this.createViolation('warning', 'readme-references-skill',
        `README.md does not mention skill "${skill.metadata.name}"`,
        { file: readmePath }));
    }

    return violations;
  }

  private checkTestFixtures(root: string): Violation[] {
    const violations: Violation[] = [];
    const triggerCasesPath = join(root, 'test/fixtures/trigger-cases.json');

    if (!existsSync(triggerCasesPath)) {
      violations.push(this.createViolation('info', 'trigger-fixtures-exist',
        'No trigger-cases.json found at test/fixtures/ — triggering validation will be limited',
        { suggestion: 'Create test/fixtures/trigger-cases.json with prompt test cases' }));
      return violations;
    }

    try {
      const fixtures = JSON.parse(readFileSync(triggerCasesPath, 'utf-8'));
      if (!Array.isArray(fixtures.tests)) {
        violations.push(this.createViolation('error', 'trigger-fixtures-format',
          'trigger-cases.json must have a "tests" array', { file: triggerCasesPath }));
      } else if (fixtures.tests.length < 20) {
        violations.push(this.createViolation('warning', 'trigger-fixtures-count',
          `Only ${fixtures.tests.length} test cases — recommend at least 20`,
          { file: triggerCasesPath }));
      }
    } catch {
      violations.push(this.createViolation('error', 'trigger-fixtures-parse',
        'trigger-cases.json is not valid JSON', { file: triggerCasesPath }));
    }

    return violations;
  }

  private checkProjectFiles(root: string): Violation[] {
    const violations: Violation[] = [];
    const pkgPath = join(root, 'package.json');

    if (!existsSync(pkgPath)) {
      violations.push(this.createViolation('warning', 'package-json-exists',
        'No package.json at plugin root'));
      return violations;
    }

    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      if (typeof pkg.scripts !== 'object' || !pkg.scripts.test) {
        violations.push(this.createViolation('warning', 'package-json-test-script',
          'package.json has no "test" script', { file: pkgPath }));
      }
    } catch {
      violations.push(this.createViolation('error', 'package-json-parse',
        'package.json is not valid JSON', { file: pkgPath }));
    }

    return violations;
  }
}
