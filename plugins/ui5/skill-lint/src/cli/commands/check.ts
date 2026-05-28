/**
 * CLI check command — verify if a skill is installed and loadable
 */

import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { Logger } from '../../utils/logger.js';
import { loadSkill } from '../../utils/file-utils.js';
import { getAdapter } from '../../adapters/adapter-registry.js';

export interface CheckOptions {
  adapter?: string;
}

export async function checkCommand(
  skillPath: string,
  options: CheckOptions,
): Promise<number> {
  const resolvedPath = resolve(skillPath);
  Logger.start(`Checking skill at ${resolvedPath}`);

  // Check file exists
  const isDir = existsSync(join(resolvedPath, 'SKILL.md'));
  const skillFile = isDir ? join(resolvedPath, 'SKILL.md') : resolvedPath;

  if (!existsSync(skillFile)) {
    Logger.error(`Skill file not found: ${skillFile}`);
    return 1;
  }

  // Parse skill metadata
  try {
    const skill = await loadSkill(resolvedPath);
    Logger.success(`Skill "${skill.metadata.name}" loaded successfully`);
    Logger.info(`Description: ${skill.metadata.description.substring(0, 100)}...`);
    Logger.info(`Plugin root: ${skill.pluginRoot}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Failed to parse skill: ${message}`);
    return 1;
  }

  // Check adapter availability if requested
  if (options.adapter) {
    try {
      const adapter = getAdapter(options.adapter);
      const available = await adapter.isAvailable();

      if (available) {
        Logger.success(`Adapter "${options.adapter}" is available`);
      } else {
        Logger.warning(`Adapter "${options.adapter}" is not available in this environment`);
        return 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      Logger.error(message);
      return 1;
    }
  }

  return 0;
}
