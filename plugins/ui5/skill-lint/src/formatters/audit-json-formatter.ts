/**
 * Audit JSON Formatter
 * Machine-readable JSON output for CI/CD integration
 */

import { AuditFormatterBase } from './audit-formatter-base.js';
import type { AuditResult } from '../types/audit-types.js';

export class AuditJsonFormatter extends AuditFormatterBase {
  readonly name = 'audit-json';
  readonly extension = 'json';

  format(result: AuditResult): string {
    return JSON.stringify(result, null, 2);
  }
}
