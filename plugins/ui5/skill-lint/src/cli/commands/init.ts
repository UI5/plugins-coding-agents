/**
 * CLI init command — generate a .skilllintrc.json config file
 */

import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { DEFAULT_CONFIG } from '../../config/schema.js';
import { Logger } from '../../utils/logger.js';

export async function initCommand(): Promise<number> {
  const configPath = resolve('.skilllintrc.json');

  if (existsSync(configPath)) {
    Logger.warning(`.skilllintrc.json already exists at ${configPath}`);
    return 1;
  }

  writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + '\n', 'utf-8');
  Logger.success(`Created ${configPath}`);
  return 0;
}
