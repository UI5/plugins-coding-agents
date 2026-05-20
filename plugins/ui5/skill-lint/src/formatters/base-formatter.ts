/**
 * Abstract base formatter
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { LintResult } from '../types/index.js';

export abstract class BaseFormatter {
  abstract readonly name: string;
  abstract readonly extension: string;

  abstract format(result: LintResult): string;

  async writeToFile(result: LintResult, outputPath: string): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, this.format(result), 'utf-8');
  }
}
