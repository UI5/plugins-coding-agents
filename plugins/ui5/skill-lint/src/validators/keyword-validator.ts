/**
 * Keyword Validator
 * Simulates keyword-based triggering and measures accuracy.
 * Renamed from TriggeringValidator — same core logic with enhanced scoring.
 *
 * ⚠️  WARNING: This is NOT how Claude actually decides to use skills!
 * This is only a keyword coverage proxy useful during development.
 *
 * New rules added:
 * - description-quality-score: Heuristic 0–100 score for description quality
 * - keyword-overlap: Warns about trigger keywords that are common English words
 * - missing-critical-keywords: Domain terms in SKILL.md body absent from triggerKeywords
 * - anti-keyword-gaps: Suggests anti-keywords for common false-positive domains
 */

import { join } from 'path';
import { BaseValidator } from './base-validator.js';
import { DESCRIPTION_SCORING } from '../utils/constants.js';
import { globalFileSystemService, type FileSystemService } from '../services/file-system.service.js';
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

export class KeywordValidator extends BaseValidator {
  readonly name = 'keywords';
  readonly description = 'Simulates keyword-based triggering accuracy (NOT real Claude behavior)';

  private readonly fs: FileSystemService;
  private skillConfig: SkillTestConfiguration | null = null;
  private triggerKeywordsLower: Set<string> = new Set();
  private antiKeywordsLower: Set<string> = new Set();

  constructor(fs: FileSystemService = globalFileSystemService) {
    super();
    this.fs = fs;
  }

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
    const minAccuracy = config.thresholds.keywords.minAccuracy;
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

    // ── NEW: Description quality score ──
    violations.push(...this.scoreDescription(skill));

    // ── NEW: Keyword overlap with common words ──
    violations.push(...this.checkKeywordOverlap());

    // ── NEW: Missing critical keywords ──
    violations.push(...this.checkMissingCriticalKeywords(skill));

    // ── NEW: Anti-keyword gaps ──
    violations.push(...this.checkAntiKeywordGaps(skill));

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

  // ── New Scoring Rules ──

  private scoreDescription(skill: Skill): Violation[] {
    const desc = skill.metadata.description;
    if (!desc) return [];

    const words = desc.split(/\s+/).filter(w => w.length > 0);
    let score = 0;

    // Word count score (0–30): 10–50 words is optimal
    if (words.length >= DESCRIPTION_SCORING.MIN_WORD_COUNT && words.length <= DESCRIPTION_SCORING.MAX_WORD_COUNT) {
      score += 30;
    } else if (words.length >= 5) {
      score += Math.min(20, Math.round(words.length / DESCRIPTION_SCORING.MIN_WORD_COUNT * 15));
    }

    // Action verbs (0–25): contains "use when", "helps", "creates", etc.
    const actionPatterns = [
      /\buse\s+when\b/i, /\bhelps?\b/i, /\bcreates?\b/i, /\bgenerates?\b/i,
      /\banalyze[sd]?\b/i, /\bvalidates?\b/i, /\bchecks?\b/i, /\bconverts?\b/i,
      /\boptimize[sd]?\b/i, /\bdetects?\b/i, /\bfix(es)?\b/i, /\breviews?\b/i,
    ];
    const actionCount = actionPatterns.filter(p => p.test(desc)).length;
    score += Math.min(25, actionCount * 8);

    // Specificity (0–25): contains technical terms (not common English)
    const lowerWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
    const specificWords = lowerWords.filter(w =>
      w.length > 3 && !DESCRIPTION_SCORING.COMMON_WORDS.has(w),
    );
    const specificRatio = specificWords.length / Math.max(1, words.length);
    score += Math.round(specificRatio * 25);

    // Negative indicators (0–20): avoids vague or filler words
    const fillerWords = ['stuff', 'things', 'various', 'etc', 'miscellaneous', 'general'];
    const fillerCount = lowerWords.filter(w => fillerWords.includes(w)).length;
    score += Math.max(0, 20 - fillerCount * 10);

    return [this.createViolation('info', 'description-quality-score',
      `Description quality score: ${score}/100 (${words.length} words, ${actionCount} action verb(s), ${specificWords.length} specific term(s))`)];
  }

  private checkKeywordOverlap(): Violation[] {
    if (this.triggerKeywordsLower.size === 0) return [];

    const overlapping = Array.from(this.triggerKeywordsLower).filter(kw =>
      DESCRIPTION_SCORING.COMMON_WORDS.has(kw),
    );

    if (overlapping.length > 0) {
      return [this.createViolation('warning', 'keyword-overlap',
        `${overlapping.length} trigger keyword(s) are common English words: ${overlapping.join(', ')}`,
        { suggestion: 'Replace with more specific domain terms to reduce false positives' })];
    }

    return [];
  }

  private checkMissingCriticalKeywords(skill: Skill): Violation[] {
    if (this.triggerKeywordsLower.size === 0) return [];

    // Extract words appearing 3+ times in skill content
    const wordFreq = new Map<string, number>();
    const contentWords = skill.content.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    for (const w of contentWords) {
      if (!DESCRIPTION_SCORING.COMMON_WORDS.has(w)) {
        wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
      }
    }

    const frequentWords = Array.from(wordFreq.entries())
      .filter(([, count]) => count >= 3)
      .map(([word]) => word);

    const missing = frequentWords.filter(w => !this.triggerKeywordsLower.has(w));
    // Limit to top 10 most relevant
    const topMissing = missing.slice(0, 10);

    if (topMissing.length > 0) {
      return [this.createViolation('info', 'missing-critical-keywords',
        `${topMissing.length} domain term(s) appear 3+ times in SKILL.md but aren't in triggerKeywords: ${topMissing.join(', ')}`,
        { suggestion: 'Consider adding relevant terms to triggerKeywords' })];
    }

    return [];
  }

  private checkAntiKeywordGaps(skill: Skill): Violation[] {
    if (!this.skillConfig || this.antiKeywordsLower.size === 0) return [];

    // Common domain confusion pairs
    const confusionDomains: Record<string, readonly string[]> = {
      testing: ['unit test', 'jest', 'vitest', 'mocha', 'pytest'],
      deployment: ['deploy', 'ci/cd', 'pipeline', 'docker', 'kubernetes'],
      database: ['sql', 'postgres', 'mysql', 'mongodb', 'redis'],
      frontend: ['react', 'vue', 'angular', 'css', 'html'],
      backend: ['express', 'fastify', 'flask', 'django', 'spring'],
    };

    const skillLower = skill.content.toLowerCase();
    const suggestions: string[] = [];

    for (const [domain, terms] of Object.entries(confusionDomains)) {
      // If skill doesn't cover this domain but has no anti-keywords for it
      const skillCovers = terms.some(t => skillLower.includes(t));
      if (skillCovers) continue;

      const hasAnti = terms.some(t => this.antiKeywordsLower.has(t));
      if (!hasAnti) {
        suggestions.push(domain);
      }
    }

    if (suggestions.length > 0) {
      return [this.createViolation('info', 'anti-keyword-gaps',
        `Consider adding anti-keywords for unrelated domains: ${suggestions.join(', ')}`,
        { suggestion: 'Anti-keywords prevent false positive triggering for unrelated prompts' })];
    }

    return [];
  }

  // ── Existing Helpers ──

  private loadTestCases(skill: Skill, config: LintConfig): TriggerTestCase[] {
    const paths = [
      config.testCases.triggering,
      join(skill.pluginRoot, 'test/fixtures/trigger-cases.json'),
    ].filter(Boolean) as string[];

    for (const p of paths) {
      if (this.fs.exists(p)) {
        try {
          const data: TriggerTestCaseFile = JSON.parse(this.fs.readFile(p));
          if (data.skill) {
            this.skillConfig = data.skill;
            this.initializeKeywordCaches();
          }
          if (Array.isArray(data.tests)) return data.tests;
        } catch {
          // Test case file may be malformed
        }
      }
    }

    return [];
  }

  private initializeKeywordCaches(): void {
    if (!this.skillConfig) return;

    this.triggerKeywordsLower = new Set(
      this.skillConfig.triggerKeywords.map(kw => kw.toLowerCase()),
    );
    this.antiKeywordsLower = new Set(
      this.skillConfig.antiKeywords.map(kw => kw.toLowerCase()),
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

  private simulateTriggering(prompt: string): boolean {
    if (!this.skillConfig || this.triggerKeywordsLower.size === 0) {
      return false;
    }

    const lower = prompt.toLowerCase();
    const hasTrigger = Array.from(this.triggerKeywordsLower).some(kw => lower.includes(kw));
    const hasAnti = Array.from(this.antiKeywordsLower).some(kw => lower.includes(kw));

    return hasTrigger && !hasAnti;
  }
}
