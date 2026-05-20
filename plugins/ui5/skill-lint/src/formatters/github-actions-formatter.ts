/**
 * GitHub Actions formatter — annotations for CI integration
 */

import { BaseFormatter } from './base-formatter.js';
import type { LintResult } from '../types/index.js';

export class GithubActionsFormatter extends BaseFormatter {
  readonly name = 'github-actions';
  readonly extension = '.txt';

  format(result: LintResult): string {
    const lines: string[] = [];

    for (const vr of result.results) {
      for (const v of vr.violations) {
        const level = v.level === 'error' ? 'error' : v.level === 'warning' ? 'warning' : 'notice';
        const file = v.file ?? result.skillPath;
        const line = v.line ? `,line=${v.line}` : '';
        lines.push(`::${level} file=${file}${line},title=${v.rule}::${v.message}`);
      }
    }

    // Summary
    const s = result.summary;
    lines.push('');
    lines.push(`::${result.passed ? 'notice' : 'error'}::` +
      `skill-lint: ${s.errors} error(s), ${s.warnings} warning(s), ${s.infos} info(s)`);

    return lines.join('\n');
  }
}
