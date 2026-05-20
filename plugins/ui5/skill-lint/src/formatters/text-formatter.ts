/**
 * Text formatter — default terminal output with colors and icons
 */

import { BaseFormatter } from './base-formatter.js';
import type { LintResult, ValidationResult, Violation } from '../types/index.js';

const LEVEL_ICON: Record<string, string> = {
  error: '❌',
  warning: '⚠️ ',
  info: 'ℹ️ ',
};

const LEVEL_COLOR: Record<string, string> = {
  error: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[36m',
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

export class TextFormatter extends BaseFormatter {
  readonly name = 'text';
  readonly extension = '.txt';

  private useColors: boolean;

  constructor(options?: { colors?: boolean }) {
    super();
    this.useColors = options?.colors ?? true;
  }

  format(result: LintResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(this.styled(`${BOLD}skill-lint${RESET}  ${result.skill}`, BOLD));
    lines.push(this.styled(`${result.skillPath}`, DIM));
    lines.push('');

    for (const vr of result.results) {
      lines.push(this.formatValidator(vr));
    }

    lines.push('');
    lines.push(this.formatSummary(result));
    lines.push('');

    return lines.join('\n');
  }

  private formatValidator(vr: ValidationResult): string {
    const icon = vr.passed ? '✅' : '❌';
    const dur = `${vr.duration}ms`;
    const header = `${icon} ${vr.validator} (${dur})`;
    const violationLines = vr.violations.map(v => this.formatViolation(v));

    return [header, ...violationLines].join('\n');
  }

  private formatViolation(v: Violation): string {
    const icon = LEVEL_ICON[v.level] ?? '  ';
    const color = LEVEL_COLOR[v.level] ?? '';
    const loc = v.file ? ` ${this.styled(v.file, DIM)}` : '';
    const line = v.line ? `:${v.line}` : '';
    const rule = this.styled(`[${v.rule}]`, DIM);
    const suggestion = v.suggestion ? `\n      💡 ${v.suggestion}` : '';

    return this.styled(
      `   ${icon} ${v.message} ${rule}${loc}${line}${suggestion}`,
      color,
    );
  }

  private formatSummary(result: LintResult): string {
    const s = result.summary;
    const status = result.passed
      ? this.styled('PASSED', '\x1b[32m')
      : this.styled('FAILED', '\x1b[31m');

    return [
      `${status}  ${s.totalValidators} validator(s)  ` +
      `${s.errors} error(s)  ${s.warnings} warning(s)  ${s.infos} info(s)  ` +
      `${result.duration}ms`,
    ].join('\n');
  }

  private styled(text: string, ansi: string): string {
    if (!this.useColors) return text;
    return `${ansi}${text}${RESET}`;
  }
}
