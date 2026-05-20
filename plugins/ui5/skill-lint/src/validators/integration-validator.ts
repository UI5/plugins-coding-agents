/**
 * Integration Validator
 * Runs real prompts through an adapter (e.g. Claude Code CLI) and checks skill detection.
 * This executes ACTUAL Claude prompts — it is slow and uses real API calls.
 */

import { join } from 'path';
import { BaseValidator } from './base-validator.js';
import { getAdapter } from '../adapters/adapter-registry.js';
import { Logger } from '../utils/logger.js';
import { TEST_THRESHOLDS } from '../utils/constants.js';
import { globalFileSystemService, type FileSystemService } from '../services/file-system.service.js';
import type {
  ValidationResult,
  Violation,
  Skill,
  LintConfig,
  SkillTestConfiguration,
  TriggerTestCaseFile,
} from '../types/index.js';

interface IntegrationTestCase {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly prompt: string;
  readonly category: string;
  readonly expectedSkill: string | null;
  readonly expectedContent?: string;
}

export class IntegrationValidator extends BaseValidator {
  readonly name = 'integration';
  readonly description = 'Runs real prompts through Claude Code CLI and checks skill detection';
  
  private readonly fs: FileSystemService;
  private skillConfig: SkillTestConfiguration | null = null;

  constructor(fs: FileSystemService = globalFileSystemService) {
    super();
    this.fs = fs;
  }

  async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];

    // Load adapter
    const adapter = getAdapter(config.adapter);
    const available = await adapter.isAvailable();

    if (!available) {
      violations.push(this.createViolation('error', 'adapter-unavailable',
        `Adapter "${config.adapter}" is not available in this environment`,
        { suggestion: 'Install Claude Code CLI or use a different adapter' }));
      return this.buildResult(violations, start);
    }

    // Load test cases
    const testCases = this.loadTestCases(skill, config);
    if (testCases.length === 0) {
      violations.push(this.createViolation('warning', 'no-integration-cases',
        'No integration test cases found — skipping',
        { suggestion: 'Create test/integration/fixtures/test-cases.ts or a JSON equivalent' }));
      return this.buildResult(violations, start);
    }

    Logger.info(`Running ${testCases.length} integration test(s) with "${config.adapter}" adapter...`);

    let passed = 0;
    let failed = 0;
    let timedOut = 0;
    let totalTokens = 0;
    let totalLatency = 0;

    for (const tc of testCases) {
      Logger.plain(`  [${tc.id}] ${tc.name}: "${tc.prompt.substring(0, 60)}..."`);

      const result = await adapter.execute({
        prompt: tc.prompt,
        skillId: skill.metadata.name,
        skillConfig: this.skillConfig ?? undefined,
        timeout: config.execution.timeout,
        maxRetries: config.execution.maxRetries,
      });

      totalTokens += result.tokensUsed;
      totalLatency += result.latencyMs;

      if (!result.success) {
        failed++;
        if (result.error?.includes('Timeout')) timedOut++;

        violations.push(this.createViolation('error', 'execution-failed',
          `[${tc.name}] Execution failed: ${result.error ?? 'unknown error'}`));
        continue;
      }

      // Check skill detection
      const skillMatch = result.skillTriggered === tc.expectedSkill;
      if (!skillMatch) {
        failed++;
        violations.push(this.createViolation('warning', 'skill-not-detected',
          `[${tc.name}] Expected skill "${tc.expectedSkill}", got "${result.skillTriggered ?? 'none'}"`));
        continue;
      }

      // Check expected content if specified
      if (tc.expectedContent) {
        const hasContent = result.responseContent.toLowerCase().includes(tc.expectedContent.toLowerCase());
        if (!hasContent) {
          failed++;
          violations.push(this.createViolation('info', 'content-mismatch',
            `[${tc.name}] Expected content "${tc.expectedContent}" not found in response`));
          continue;
        }
      }

      passed++;
    }

    const total = testCases.length;
    const accuracy = total > 0 ? (passed / total) * 100 : 0;
    const avgLatency = total > 0 ? totalLatency / total : 0;

    if (accuracy < TEST_THRESHOLDS.INTEGRATION_ACCURACY.CRITICAL_THRESHOLD) {
      violations.push(this.createViolation('error', 'integration-accuracy-low',
        `Integration accuracy ${accuracy.toFixed(1)}% is below ${TEST_THRESHOLDS.INTEGRATION_ACCURACY.CRITICAL_THRESHOLD}% threshold`));
    } else if (accuracy < TEST_THRESHOLDS.INTEGRATION_ACCURACY.WARNING_THRESHOLD) {
      violations.push(this.createViolation('warning', 'integration-accuracy-moderate',
        `Integration accuracy ${accuracy.toFixed(1)}% is below ${TEST_THRESHOLDS.INTEGRATION_ACCURACY.WARNING_THRESHOLD}% — consider investigating failed cases`));
    }

    Logger.metrics(`Integration: ${passed}/${total} passed (${accuracy.toFixed(1)}%), ` +
      `${timedOut} timeouts, ${totalTokens} tokens, avg ${avgLatency.toFixed(0)}ms`);

    try {
      await adapter.cleanup();
    } catch (error) {
      // Expected: cleanup may fail, but we should not propagate the error
      // This is intentional - cleanup errors are non-critical
    }

    return this.buildResult(violations, start, {
      totalCases: total,
      passed,
      failed,
      timedOut,
      accuracy,
      totalTokens,
      averageLatency: avgLatency,
    });
  }

  private loadTestCases(skill: Skill, config: LintConfig): IntegrationTestCase[] {
    // Try config-specified path first, then integration path, finally triggering path (unified format)
    const paths = [
      config.testCases.integration,
      join(skill.pluginRoot, 'test/integration/fixtures/test-cases.json'),
      config.testCases.triggering,
      join(skill.pluginRoot, 'test/fixtures/trigger-cases.json'),
    ].filter(Boolean) as string[];

    for (const p of paths) {
      if (this.fs.exists(p)) {
        try {
          const raw = this.fs.readFile(p);
          const data = JSON.parse(raw);
          
          // Check if data has skill configuration
          if ((data as TriggerTestCaseFile).skill) {
            this.skillConfig = (data as TriggerTestCaseFile).skill;
          }
          
          // Return tests array
          if (Array.isArray(data)) return data;
          if (Array.isArray(data.tests)) {
            // Convert TriggerTestCase format to IntegrationTestCase format
            return (data.tests as any[]).map((tc, i) => ({
              id: (tc as any).id ?? i + 1,
              name: (tc as any).name ?? `case-${i + 1}`,
              description: tc.prompt,
              prompt: tc.prompt,
              category: tc.category,
              expectedSkill: tc.expected_skill,
              expectedContent: (tc as any).expectedContent,
            }));
          }
        } catch (error) {
          // Expected: test case file may be malformed JSON or have invalid structure
          // Skip this file and continue searching
        }
      }
    }

    return [];
  }
}
