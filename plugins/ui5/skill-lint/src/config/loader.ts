/**
 * Config loader using cosmiconfig
 * Searches for .skilllintrc.json, .skilllintrc.yaml, skill-lint.config.js, etc.
 */

import { cosmiconfig } from 'cosmiconfig';
import { parseConfig, DEFAULT_CONFIG } from './schema.js';
import type { LintConfig } from '../types/index.js';

const MODULE_NAME = 'skilllint';

export async function loadConfig(configPath?: string): Promise<LintConfig> {
  const explorer = cosmiconfig(MODULE_NAME);

  const result = configPath
    ? await explorer.load(configPath)
    : await explorer.search();

  if (!result || result.isEmpty) {
    return DEFAULT_CONFIG;
  }

  return parseConfig(result.config);
}

export function mergeWithDefaults(partial: Partial<LintConfig>): LintConfig {
  return parseConfig(partial);
}
