/**
 * Result collector — aggregates validation results into a LintResult
 */

import type { ValidationResult, LintResult, LintSummary, Skill } from '../types/index.js';

export function collectResults(
  skill: Skill,
  results: readonly ValidationResult[],
  startTime: number,
): LintResult {
  const duration = Date.now() - startTime;
  const summary = buildSummary(results);

  return {
    skill: skill.metadata.name,
    skillPath: skill.path,
    timestamp: new Date().toISOString(),
    duration,
    passed: summary.errors === 0,
    results,
    summary,
  };
}

function buildSummary(results: readonly ValidationResult[]): LintSummary {
  const errors = results.reduce(
    (sum, r) => sum + r.violations.filter(v => v.level === 'error').length,
    0,
  );
  const warnings = results.reduce(
    (sum, r) => sum + r.violations.filter(v => v.level === 'warning').length,
    0,
  );
  const infos = results.reduce(
    (sum, r) => sum + r.violations.filter(v => v.level === 'info').length,
    0,
  );

  return {
    totalValidators: results.length,
    passedValidators: results.filter(r => r.passed).length,
    failedValidators: results.filter(r => !r.passed).length,
    errors,
    warnings,
    infos,
  };
}
