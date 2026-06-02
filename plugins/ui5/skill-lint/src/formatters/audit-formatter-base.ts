/**
 * Base class for audit formatters
 * Provides common functionality for writing formatted audit results to files
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import type { AuditResult } from '../types/audit-types.js';

export abstract class AuditFormatterBase {
  abstract readonly name: string;
  abstract readonly extension: string;

  /**
   * Format audit result for output
   * @param result - Complete audit result with statistics and assessment
   * @returns Formatted output string
   */
  abstract format(result: AuditResult): string;

  /**
   * Write formatted audit report to file
   * @param result - Audit result to format
   * @param outputPath - Destination file path (directory created if needed)
   */
  async writeToFile(result: AuditResult, outputPath: string): Promise<void> {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, this.format(result), 'utf-8');
  }
}
