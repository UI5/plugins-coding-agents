/**
 * Config schema and defaults using Zod
 */

import { z } from 'zod';
import type { LintConfig } from '../types/index.js';

export const lintConfigSchema = z.object({
  scenarios: z.preprocess(
    (val) => {
      if (typeof val !== 'object' || val === null) return val;
      const raw = val as Record<string, unknown>;
      const result = { ...raw };
      // Map old names → new before Zod applies defaults
      if (raw.performance !== undefined && raw.size === undefined) {
        result.size = raw.performance;
      }
      if (raw.triggering !== undefined && raw.keywords === undefined) {
        result.keywords = raw.triggering;
      }
      if (raw.integration !== undefined && raw.harness === undefined) {
        result.harness = raw.integration;
      }
      return result;
    },
    z.object({
      structure: z.boolean().default(true),
      size: z.boolean().default(true),
      references: z.boolean().default(true),
      links: z.preprocess(
        (val) => {
          if (typeof val === 'boolean') return { enabled: val };
          if (typeof val === 'object' && val !== null) return val;
          return { enabled: true };
        },
        z.object({
          enabled: z.boolean().default(true),
          checkExternal: z.boolean().default(false),
        }).default({ enabled: true, checkExternal: false }),
      ),
      keywords: z.boolean().default(true),
      harness: z.boolean().default(false),
      // Keep old names passthrough for backward compat (not used after transform)
      performance: z.boolean().optional(),
      triggering: z.boolean().optional(),
      integration: z.boolean().optional(),
    }).default({}),
  ),

  adapter: z.string().default('claude-code'),

  thresholds: z.preprocess(
    (val) => {
      if (typeof val !== 'object' || val === null) return val;
      const raw = val as Record<string, unknown>;
      const result = { ...raw };
      if (raw.performance && !raw.size) {
        result.size = raw.performance;
      }
      if (raw.triggering && !raw.keywords) {
        result.keywords = raw.triggering;
      }
      return result;
    },
    z.object({
      size: z.object({
        maxLines: z.number().positive().default(700),
        maxTokens: z.number().positive().default(4000),
      }).default({}),
      keywords: z.object({
        minAccuracy: z.number().min(0).max(100).default(90),
      }).default({}),
      // Backward compat aliases (passthrough)
      performance: z.object({
        maxLines: z.number().positive().default(700),
        maxTokens: z.number().positive().default(4000),
      }).optional(),
      triggering: z.object({
        minAccuracy: z.number().min(0).max(100).default(90),
      }).optional(),
    }).default({}),
  ),

  testCases: z.object({
    triggering: z.string().optional(),
    integration: z.string().optional(),
  }).default({}),

  execution: z.object({
    timeout: z.number().positive().default(60_000),
    maxRetries: z.number().nonnegative().default(2),
    parallel: z.boolean().default(false),
    maxConcurrency: z.number().positive().default(Infinity),
  }).default({}),

  formatters: z.object({
    default: z.enum(['text', 'json', 'github-actions']).default('text'),
    options: z.object({
      colors: z.boolean().default(true),
      verbose: z.boolean().default(false),
    }).default({}),
  }).default({}),

  output: z.object({
    directory: z.string().default('.lint-reports'),
    formats: z.array(z.string()).default(['text']),
  }).default({}),
});

export const DEFAULT_CONFIG: LintConfig = lintConfigSchema.parse({});

export function parseConfig(raw: unknown): LintConfig {
  return lintConfigSchema.parse(raw) as LintConfig;
}
