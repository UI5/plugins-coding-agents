/**
 * Trigger Extractor Test Suite
 *
 * Tests the TriggerExtractor which analyzes skill content and suggests
 * likely trigger keywords without requiring manual test case creation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TriggerExtractor } from '../../src/validators/trigger-extractor.js';
import { createMockSkill, createMockConfig } from '../helpers/test-fixtures.js';
import type { LintConfig } from '../../src/types/index.js';

describe('TriggerExtractor', () => {
  let validator: TriggerExtractor;
  let mockConfig: LintConfig;

  beforeEach(() => {
    validator = new TriggerExtractor();
    mockConfig = createMockConfig();
  });

  describe('Basic Properties', () => {
    it('should have correct name and description', () => {
      expect(validator.name).toBe('trigger-extractor');
      expect(validator.description).toContain('trigger keywords');
    });
  });

  describe('Keyword Extraction', () => {
    it('should extract primary keywords from description', async () => {
      const skill = createMockSkill({
        metadata: {
          name: 'ui5-test',
          description: 'UI5 development with sap.ui.define, OData types, and TypeScript. ' +
            'Keywords: ui5, odata, typescript, component, data binding',
          compatibility: []
        }
      });

      const result = await validator.validate(skill, mockConfig);

      expect(result.passed).toBe(true);
      const primaryKeywords = result.violations.find(v => v.rule === 'extracted-primary-keywords');
      expect(primaryKeywords).toBeDefined();
      expect(primaryKeywords?.message).toContain('ui5');
      expect(primaryKeywords?.message).toContain('odata');
    });

    it('should extract code patterns from content', async () => {
      const skill = createMockSkill({
        content: `
# Test Skill

\`\`\`javascript
import Button from "sap/m/Button";
sap.ui.define(["sap/ui/core/Control"], function(Control) {
  // code
});
\`\`\`

Use \`Button$PressEvent\` for type safety.
        `
      });

      const result = await validator.validate(skill, mockConfig);

      const codePatterns = result.violations.find(v => v.rule === 'extracted-code-patterns');
      expect(codePatterns).toBeDefined();
      expect(codePatterns?.message).toMatch(/sap\/m\/Button|sap\.ui\.define|Button\$PressEvent/);
    });

    it('should extract action phrases', async () => {
      const skill = createMockSkill({
        metadata: {
          name: 'test-skill',
          description: 'Use when writing UI5 applications. Helps with async module loading. ' +
            'Covers data binding patterns.',
          compatibility: []
        }
      });

      const result = await validator.validate(skill, mockConfig);

      const actionPhrases = result.violations.find(v => v.rule === 'extracted-action-phrases');
      expect(actionPhrases).toBeDefined();
      expect(actionPhrases?.message).toMatch(/writing UI5 applications|async module loading|data binding patterns/);
    });

    it('should suggest anti-keywords for UI5 skills', async () => {
      const skill = createMockSkill({
        metadata: {
          name: 'ui5-skill',
          description: 'UI5 development with SAP patterns. Keywords: ui5, sapui5, odata',
          compatibility: []
        }
      });

      const result = await validator.validate(skill, mockConfig);

      const antiKeywords = result.violations.find(v => v.rule === 'suggested-anti-keywords');
      expect(antiKeywords).toBeDefined();
      expect(antiKeywords?.message).toMatch(/react|vue|angular/);
    });

    it('should provide extraction summary', async () => {
      const skill = createMockSkill();

      const result = await validator.validate(skill, mockConfig);

      const summary = result.violations.find(v => v.rule === 'extraction-summary');
      expect(summary).toBeDefined();
      expect(summary?.message).toContain('Extracted');
      expect(summary?.suggestion).toContain('trigger-cases.json');
    });
  });

  describe('Edge Cases', () => {
    it('should handle skill with minimal content', async () => {
      const skill = createMockSkill({
        metadata: {
          name: 'simple',
          description: 'Simple skill',
          compatibility: []
        },
        content: '# Simple\n\nBasic content.'
      });

      const result = await validator.validate(skill, mockConfig);

      expect(result.passed).toBe(true);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('should handle skill with no code blocks', async () => {
      const skill = createMockSkill({
        content: '# Test\n\nJust text content without code.'
      });

      const result = await validator.validate(skill, mockConfig);

      expect(result.passed).toBe(true);
      // Should still extract keywords from description
      const primaryKeywords = result.violations.find(v => v.rule === 'extracted-primary-keywords');
      expect(primaryKeywords).toBeDefined();
    });
  });

  describe('Metrics', () => {
    it('should provide extraction metrics', async () => {
      const skill = createMockSkill({
        metadata: {
          name: 'test',
          description: 'Test skill with keywords: ui5, typescript, component',
          compatibility: []
        },
        content: '# Test\n\n```js\nimport Button from "sap/m/Button";\n```'
      });

      const result = await validator.validate(skill, mockConfig);

      expect(result.metrics).toBeDefined();
      expect(result.metrics?.primaryKeywords).toBeGreaterThan(0);
      expect(result.metrics?.totalSuggestions).toBeGreaterThan(0);
    });
  });
});
