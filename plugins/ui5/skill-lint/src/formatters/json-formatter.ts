/**
 * JSON formatter — machine-readable output
 */

import { BaseFormatter } from './base-formatter.js';
import type { LintResult } from '../types/index.js';

export class JsonFormatter extends BaseFormatter {
  readonly name = 'json';
  readonly extension = '.json';

  format(result: LintResult): string {
    return JSON.stringify(result, null, 2);
  }
}
