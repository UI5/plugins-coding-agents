/**
 * Tests for audit formatters
 */

import { describe, it, expect } from 'vitest';
import { AuditTextFormatter } from '../../src/formatters/audit-text-formatter.js';
import { AuditJsonFormatter } from '../../src/formatters/audit-json-formatter.js';
import { AuditMarkdownFormatter } from '../../src/formatters/audit-markdown-formatter.js';
import { AuditHtmlFormatter } from '../../src/formatters/audit-html-formatter.js';
import type { AuditResult } from '../../src/types/audit-types.js';

const mockAuditResult: AuditResult = {
  skill: 'test-skill',
  skillPath: '/path/to/skill',
  timestamp: '2026-05-28T10:00:00.000Z',
  totalDuration: 12000,
  iterations: [],
  statistics: {
    accuracy: {
      mean: 85.5,
      median: 86.0,
      stdDev: 3.2,
      min: 80.0,
      max: 90.0,
      confidenceInterval: [83.0, 88.0],
    },
    latency: {
      mean: 2000,
      median: 1950,
      stdDev: 200,
      min: 1700,
      max: 2400,
    },
    tokenUsage: {
      mean: 450,
      median: 440,
      stdDev: 50,
      min: 380,
      max: 520,
    },
    cost: {
      mean: 0.00405,
      median: 0.00396,
      stdDev: 0.00045,
      min: 0.00342,
      max: 0.00468,
    },
  },
  aggregated: {
    totalTests: 10,
    totalPassed: 8,
    totalFailed: 2,
    overallAccuracy: 80.0,
    totalTokens: 4500,
    totalCost: 0.0405,
  },
  assessment: {
    grade: 'B',
    score: 85,
    passed: true,
    issues: ['Accuracy slightly below 90% optimal threshold'],
    recommendations: ['Consider adding more specific trigger keywords'],
  },
};

describe('AuditTextFormatter', () => {
  const formatter = new AuditTextFormatter();

  it('should have correct name and extension', () => {
    expect(formatter.name).toBe('audit-text');
    expect(formatter.extension).toBe('txt');
  });

  it('should format audit result as text', () => {
    const output = formatter.format(mockAuditResult);

    expect(output).toContain('HARNESS AUDIT REPORT');
    expect(output).toContain('test-skill');
    expect(output).toContain('Grade: B');
    expect(output).toContain('Score: 85/100');
    expect(output).toContain('✅ PASSED');
    expect(output).toContain('Mean: 85.5%');
    expect(output).toContain('Total Tests: 10');
  });

  it('should include confidence intervals when available', () => {
    const output = formatter.format(mockAuditResult);
    expect(output).toContain('95% CI: [83.0%, 88.0%]');
  });

  it('should include issues and recommendations', () => {
    const output = formatter.format(mockAuditResult);
    expect(output).toContain('Issues:');
    expect(output).toContain('Accuracy slightly below 90% optimal threshold');
    expect(output).toContain('Recommendations:');
    expect(output).toContain('Consider adding more specific trigger keywords');
  });

  it('should include baseline comparison when available', () => {
    const resultWithBaseline: AuditResult = {
      ...mockAuditResult,
      baseline: {
        accuracyDelta: 5.5,
        latencyDelta: -200,
        tokenDelta: -50,
        improved: true,
      },
    };

    const output = formatter.format(resultWithBaseline);
    expect(output).toContain('Baseline Comparison');
    expect(output).toContain('+5.5%');
    expect(output).toContain('-200ms');
    expect(output).toContain('✅ IMPROVED');
  });
});

describe('AuditJsonFormatter', () => {
  const formatter = new AuditJsonFormatter();

  it('should have correct name and extension', () => {
    expect(formatter.name).toBe('audit-json');
    expect(formatter.extension).toBe('json');
  });

  it('should format audit result as valid JSON', () => {
    const output = formatter.format(mockAuditResult);
    const parsed = JSON.parse(output);

    expect(parsed.skill).toBe('test-skill');
    expect(parsed.assessment.grade).toBe('B');
    expect(parsed.statistics.accuracy.mean).toBe(85.5);
  });

  it('should preserve all data fields', () => {
    const output = formatter.format(mockAuditResult);
    const parsed = JSON.parse(output);

    expect(parsed).toHaveProperty('skill');
    expect(parsed).toHaveProperty('skillPath');
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed).toHaveProperty('statistics');
    expect(parsed).toHaveProperty('aggregated');
    expect(parsed).toHaveProperty('assessment');
  });
});

describe('AuditMarkdownFormatter', () => {
  const formatter = new AuditMarkdownFormatter();

  it('should have correct name and extension', () => {
    expect(formatter.name).toBe('audit-markdown');
    expect(formatter.extension).toBe('md');
  });

  it('should format audit result as markdown', () => {
    const output = formatter.format(mockAuditResult);

    expect(output).toContain('# 🔍 Harness Audit Report');
    expect(output).toContain('## 📊 Summary');
    expect(output).toContain('| Metric | Value |');
    expect(output).toContain('test-skill');
  });

  it('should create proper markdown tables', () => {
    const output = formatter.format(mockAuditResult);

    expect(output).toContain('|--------|-------|');
    expect(output).toMatch(/\| Total Tests \| 10 \|/);
    expect(output).toMatch(/\| Passed \| 8 \|/);
  });

  it('should include statistical analysis sections', () => {
    const output = formatter.format(mockAuditResult);

    expect(output).toContain('### Accuracy');
    expect(output).toContain('### Latency');
    expect(output).toContain('### Token Usage');
  });

  it('should include baseline comparison table when available', () => {
    const resultWithBaseline: AuditResult = {
      ...mockAuditResult,
      baseline: {
        accuracyDelta: 5.5,
        latencyDelta: -200,
        tokenDelta: -50,
        improved: true,
      },
    };

    const output = formatter.format(resultWithBaseline);
    expect(output).toContain('## 📉 Baseline Comparison');
    expect(output).toContain('| Metric | Delta | Trend |');
  });
});

describe('AuditHtmlFormatter', () => {
  const formatter = new AuditHtmlFormatter();

  it('should have correct name and extension', () => {
    expect(formatter.name).toBe('audit-html');
    expect(formatter.extension).toBe('html');
  });

  it('should format audit result as valid HTML', () => {
    const output = formatter.format(mockAuditResult);

    expect(output).toContain('<!DOCTYPE html>');
    expect(output).toContain('<html lang="en">');
    expect(output).toContain('</html>');
  });

  it('should include CSS styling', () => {
    const output = formatter.format(mockAuditResult);
    expect(output).toContain('<style>');
    expect(output).toContain('</style>');
  });

  it('should escape HTML special characters', () => {
    const resultWithSpecialChars: AuditResult = {
      ...mockAuditResult,
      skill: 'test<script>alert("xss")</script>',
    };

    const output = formatter.format(resultWithSpecialChars);
    expect(output).not.toContain('<script>');
    expect(output).toContain('&lt;script&gt;');
  });

  it('should include grade badge with appropriate color', () => {
    const output = formatter.format(mockAuditResult);
    expect(output).toContain('grade-badge');
    expect(output).toContain('>B<');
  });

  it('should include baseline comparison when available', () => {
    const resultWithBaseline: AuditResult = {
      ...mockAuditResult,
      baseline: {
        accuracyDelta: 5.5,
        latencyDelta: -200,
        tokenDelta: -50,
        improved: true,
      },
    };

    const output = formatter.format(resultWithBaseline);
    expect(output).toContain('Baseline Comparison');
    expect(output).toContain('IMPROVED');
  });
});
