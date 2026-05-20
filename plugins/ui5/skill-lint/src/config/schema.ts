/**
 * Config schema and defaults using Zod
 */

import { z } from 'zod';
import type { LintConfig } from '../types/index.js';

export const lintConfigSchema = z.object({
  scenarios: z.object({
    structure: z.boolean().default(true),
    triggering: z.boolean().default(true),
    performance: z.boolean().default(true),
    integration: z.boolean().default(false),
  }).default({}),

  adapter: z.string().default('claude-code'),

  thresholds: z.object({
    performance: z.object({
      maxLines: z.number().positive().default(700),
      maxTokens: z.number().positive().default(4000),
    }).default({}),
    triggering: z.object({
      minAccuracy: z.number().min(0).max(100).default(90),
    }).default({}),
  }).default({}),

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
