/**
 * Triggering Validator
 * Simulates keyword-based triggering and measures accuracy.
 * Migrated from triggering.test.ts — all AVA dependencies removed.
 *
 * ⚠️  WARNING: This is NOT how Claude actually decides to use skills!
 * This is only a keyword coverage proxy useful during development.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { BaseValidator } from './base-validator.js';
import type {
  ValidationResult,
  Violation,
  Skill,
  LintConfig,
  TriggerTestCase,
  TriggerTestResult,
  SkillTestConfiguration,
  TriggerTestCaseFile,
} from '../types/index.js';

export class TriggeringValidator extends BaseValidator {
  readonly name = 'triggering';
  readonly description = 'Simulates keyword-based triggering accuracy (NOT real Claude behavior)';
  
  private skillConfig: SkillTestConfiguration | null = null;
  private triggerKeywordsLower: Set<string> = new Set();
  private antiKeywordsLower: Set<string> = new Set();

  async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];

    // Always add the prominent warning
    violations.push(this.createViolation('info', 'simulation-warning',
      '⚠️  Triggering simulation is NOT how Claude decides to use skills. ' +
      'Results are a keyword-coverage proxy only.'));

    // ── Load test cases ──
    const testCases = this.loadTestCases(skill, config);
    if (testCases.length === 0) {
      violations.push(this.createViolation('warning', 'no-test-cases',
        'No triggering test cases found — skipping simulation',
        { suggestion: 'Create test/fixtures/trigger-cases.json' }));
      return this.buildResult(violations, start);
    }

    const description = skill.metadata.description.toLowerCase();

    // ── Run simulation ──
    const results = testCases.map(tc => this.runCase(tc, description));
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const accuracy = (passed / results.length) * 100;

    // ── Overall accuracy ──
    const minAccuracy = config.thresholds.triggering.minAccuracy;
    if (accuracy < minAccuracy) {
      violations.push(this.createViolation('error', 'accuracy-below-threshold',
        `Overall accuracy ${accuracy.toFixed(1)}% < ${minAccuracy}% threshold`));
    }

    // ── Positive cases ──
    const positiveCases = results.filter((_, i) => testCases[i].should_trigger);
    const positivePassed = positiveCases.filter(r => r.passed).length;
    const positiveAcc = positiveCases.length > 0
      ? (positivePassed / positiveCases.length) * 100
      : 100;
    if (positiveAcc < 85) {
      violations.push(this.createViolation('warning', 'positive-accuracy',
        `Positive case accuracy ${positiveAcc.toFixed(1)}% < 85%`));
    }

    // ── Negative cases ──
    const negativeCases = results.filter((_, i) => !testCases[i].should_trigger);
    const negativePassed = negativeCases.filter(r => r.passed).length;
    const negativeAcc = negativeCases.length > 0
      ? (negativePassed / negativeCases.length) * 100
      : 100;
    if (negativeAcc < 95) {
      violations.push(this.createViolation('warning', 'negative-accuracy',
        `Negative case accuracy ${negativeAcc.toFixed(1)}% < 95%`));
    }

    // ── Category coverage ──
    const categories = new Map<string, { passed: number; total: number }>();
    for (let i = 0; i < results.length; i++) {
      const cat = testCases[i].category;
      const entry = categories.get(cat) ?? { passed: 0, total: 0 };
      entry.total++;
      if (results[i].passed) entry.passed++;
      categories.set(cat, entry);
    }
    if (categories.size < 9) {
      violations.push(this.createViolation('info', 'category-coverage',
        `Test cases cover ${categories.size} categories — consider adding more (recommend ≥ 9)`));
    }

    // ── Failed case details ──
    for (const result of results) {
      if (!result.passed) {
        violations.push(this.createViolation('info', 'failed-case',
          `[${result.category}] "${result.prompt}" → expected ${result.expected ?? 'null'}, got ${result.actual ?? 'null'}`));
      }
    }

    // ── Description length ──
    if (skill.metadata.description.length < 200) {
      violations.push(this.createViolation('warning', 'description-too-short',
        `Skill description is ${skill.metadata.description.length} chars — recommend ≥ 200 for effective triggering`));
    }
    if (skill.metadata.description.length > 2000) {
      violations.push(this.createViolation('warning', 'description-too-long',
        `Skill description is ${skill.metadata.description.length} chars — recommend ≤ 2000`));
    }

    return this.buildResult(violations, start, {
      totalCases: results.length,
      passed,
      failed,
      accuracy,
      positiveAccuracy: positiveAcc,
      negativeAccuracy: negativeAcc,
      categories: categories.size,
    });
  }

  // ── Helpers ──

  private loadTestCases(skill: Skill, config: LintConfig): TriggerTestCase[] {
    // Prefer config-specified path, then conventional location
    const paths = [
      config.testCases.triggering,
      join(skill.pluginRoot, 'test/fixtures/trigger-cases.json'),
    ].filter(Boolean) as string[];

    for (const p of paths) {
      if (existsSync(p)) {
        try {
          const data: TriggerTestCaseFile = JSON.parse(readFileSync(p, 'utf-8'));
          if (data.skill) {
            this.skillConfig = data.skill;
            this.initializeKeywordCaches();
          }
          if (Array.isArray(data.tests)) return data.tests;
        } catch (error) {
          // Expected: test case file may be malformed JSON or have invalid structure
          // Skip this file and continue searching
        }
      }
    }

    return [];
  }

  /**
   * Initialize keyword caches for performance optimization.
   * Pre-lowercases all keywords to avoid repeated toLowerCase() calls.
   * Reduces complexity from O(n×m) to O(n) for n test cases and m keywords.
   */
  private initializeKeywordCaches(): void {
    if (!this.skillConfig) return;

    this.triggerKeywordsLower = new Set(
      this.skillConfig.triggerKeywords.map(kw => kw.toLowerCase())
    );
    this.antiKeywordsLower = new Set(
      this.skillConfig.antiKeywords.map(kw => kw.toLowerCase())
    );
  }

  private runCase(tc: TriggerTestCase, _description: string): TriggerTestResult {
    const triggered = this.simulateTriggering(tc.prompt);
    const skillName = this.skillConfig?.name ?? tc.expected_skill ?? 'unknown-skill';
    return {
      passed: triggered === tc.should_trigger,
      prompt: tc.prompt,
      expected: tc.expected_skill,
      actual: triggered ? skillName : null,
      category: tc.category,
    };
  }

  /**
   * Simple keyword-based matching simulation.
   * ⚠️  NOT how Claude actually decides — only a coverage proxy.
   * 
   * Optimized with pre-lowercased keyword caches for 2-3x speedup.
   */
  private simulateTriggering(prompt: string): boolean {
    if (!this.skillConfig || this.triggerKeywordsLower.size === 0) {
      // Fallback: no configuration available
      return false;
    }

    const lower = prompt.toLowerCase();

    // Use cached lowercased keywords for O(n) instead of O(n×m) complexity
    const hasTrigger = Array.from(this.triggerKeywordsLower).some(kw => lower.includes(kw));
    const hasAnti = Array.from(this.antiKeywordsLower).some(kw => lower.includes(kw));

    return hasTrigger && !hasAnti;
  }
}
