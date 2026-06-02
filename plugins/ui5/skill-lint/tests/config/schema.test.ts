/**
 * Configuration Schema Test Suite
 * 
 * Tests the Zod-based configuration schema for skill-lint:
 * - Default configuration values
 * - Schema validation and parsing
 * - Partial config merging with defaults
 * - Type safety and validation errors
 * 
 * Configuration Structure:
 * - scenarios: Which validators to run (structure, triggering, performance, integration)
 * - adapter: Test execution adapter (claude-code, mock, etc.)
 * - thresholds: Validation limits (max lines/tokens, min accuracy)
 * - execution: Timeout, retries, parallel execution
 * - formatters: Output format and options
 * - output: Report directory and formats
 * 
 * Default Values (aligned with project guidelines):
 * - maxLines: 700 (context efficiency)
 * - maxTokens: 4000 (leaves room for conversation)
 * - minAccuracy: 90% (high quality without being too strict)
 * - integration: false (requires live adapter, expensive)
 * 
 * Why Zod?
 * - Runtime validation (catches config errors early)
 * - TypeScript inference (type-safe configs)
 * - Clear error messages for invalid configs
 * - Composable schemas (easy to extend)
 * 
 * Test Strategy:
 * - Verify defaults are sensible and documented
 * - Test partial config merging (user overrides)
 * - Validate error handling for invalid configs
 * - Ensure schema matches TypeScript types
 */

import { describe, it, expect } from 'vitest';
import { parseConfig, DEFAULT_CONFIG, lintConfigSchema } from '../../src/config/schema.js';

describe('Config Schema', () => {
  describe('DEFAULT_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_CONFIG).toBeDefined();
      expect(DEFAULT_CONFIG.scenarios).toBeDefined();
      expect(DEFAULT_CONFIG.adapter).toBe('claude-code');
      expect(DEFAULT_CONFIG.thresholds).toBeDefined();
    });

    it('should enable structure/size/references/links/keywords by default', () => {
      expect(DEFAULT_CONFIG.scenarios.structure).toBe(true);
      expect(DEFAULT_CONFIG.scenarios.size).toBe(true);
      expect(DEFAULT_CONFIG.scenarios.references).toBe(true);
      expect(DEFAULT_CONFIG.scenarios.links.enabled).toBe(true);
      expect(DEFAULT_CONFIG.scenarios.links.checkExternal).toBe(false);
      expect(DEFAULT_CONFIG.scenarios.keywords).toBe(true);
      expect(DEFAULT_CONFIG.scenarios.harness).toBe(false);
    });

    it('should have reasonable default thresholds', () => {
      expect(DEFAULT_CONFIG.thresholds.size.maxLines).toBe(700);
      expect(DEFAULT_CONFIG.thresholds.size.maxTokens).toBe(4000);
      expect(DEFAULT_CONFIG.thresholds.keywords.minAccuracy).toBe(90);
    });
  });

  describe('parseConfig', () => {
    it('should parse empty config with defaults', () => {
      const config = parseConfig({});
      
      expect(config.scenarios.structure).toBe(true);
      expect(config.adapter).toBe('claude-code');
    });

    it('should override defaults with provided values', () => {
      const config = parseConfig({
        scenarios: { structure: false },
        adapter: 'custom-adapter'
      });
      
      expect(config.scenarios.structure).toBe(false);
      expect(config.adapter).toBe('custom-adapter');
    });

    it('should validate positive numbers for thresholds', () => {
      expect(() => {
        parseConfig({
          thresholds: { size: { maxLines: -100 } }
        });
      }).toThrow();
    });

    it('should validate accuracy range (0-100)', () => {
      expect(() => {
        parseConfig({
          thresholds: { keywords: { minAccuracy: 150 } }
        });
      }).toThrow();
    });

    it('should map old config names to new names (backward compat)', () => {
      const config = parseConfig({
        scenarios: { performance: true, triggering: false, integration: true },
        thresholds: {
          performance: { maxLines: 500, maxTokens: 3000 },
          triggering: { minAccuracy: 85 }
        }
      });
      // Old names are mapped to new
      expect(config.scenarios.size).toBe(true);
      expect(config.scenarios.keywords).toBe(false);
      expect(config.scenarios.harness).toBe(true);
      expect(config.thresholds.size.maxLines).toBe(500);
      expect(config.thresholds.keywords.minAccuracy).toBe(85);
    });

    it('should accept valid formatter types', () => {
      const config = parseConfig({
        formatters: { default: 'json' }
      });
      
      expect(config.formatters.default).toBe('json');
    });

    it('should reject invalid formatter types', () => {
      expect(() => {
        parseConfig({
          formatters: { default: 'invalid' }
        });
      }).toThrow();
    });

    it('should handle nested config objects', () => {
      const config = parseConfig({
        thresholds: {
          size: { maxLines: 500, maxTokens: 3000 },
          keywords: { minAccuracy: 85 }
        }
      });
      
      expect(config.thresholds.size.maxLines).toBe(500);
      expect(config.thresholds.keywords.minAccuracy).toBe(85);
    });

    it('should handle testCases paths', () => {
      const config = parseConfig({
        testCases: {
          triggering: './custom/path.json',
          integration: './integration.json'
        }
      });
      
      expect(config.testCases.triggering).toBe('./custom/path.json');
      expect(config.testCases.integration).toBe('./integration.json');
    });
  });

  describe('Schema Validation', () => {
    it('should accept valid config', () => {
      const validConfig = {
        scenarios: {
          structure: true,
          size: true,
          references: true,
          links: { enabled: true, checkExternal: false },
          keywords: true,
          harness: false
        },
        adapter: 'claude-code',
        thresholds: {
          size: { maxLines: 700, maxTokens: 4000 },
          keywords: { minAccuracy: 90 }
        },
        execution: { timeout: 60000, maxRetries: 2, parallel: false }
      };
      
      expect(() => lintConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should accept old config format (backward compat)', () => {
      const oldConfig = {
        scenarios: {
          structure: true,
          triggering: true,
          performance: true,
          integration: false
        },
        thresholds: {
          performance: { maxLines: 700, maxTokens: 4000 },
          triggering: { minAccuracy: 90 }
        }
      };
      
      expect(() => lintConfigSchema.parse(oldConfig)).not.toThrow();
    });

    it('should reject config with invalid types', () => {
      const invalidConfig = {
        scenarios: 'invalid' // should be object
      };
      
      expect(() => lintConfigSchema.parse(invalidConfig)).toThrow();
    });
  });
});
