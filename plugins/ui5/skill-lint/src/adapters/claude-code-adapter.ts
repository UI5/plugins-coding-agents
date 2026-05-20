/**
 * Claude Code CLI Adapter
 * Runs prompts through the claude CLI and detects skill usage.
 * Migrated from claude-code.ts provider — retry logic & detection preserved.
 */

import { spawn } from 'child_process';
import { BaseAdapter } from './base-adapter.js';
import type {
  ExecutionRequest,
  ExecutionResult,
  SkillVerification,
  AdapterInfo,
} from '../types/index.js';

export class ClaudeCodeAdapter extends BaseAdapter {
  readonly name = 'claude-code';
  readonly description = 'Claude Code CLI adapter (free, local testing)';

  private static readonly CHARS_PER_TOKEN = 4;
  private static readonly DEFAULT_RETRIES = 2;
  private static readonly RETRY_DELAY_MS = 5_000;
  private static readonly RATE_LIMIT_DELAY_MS = 30_000;

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn('claude', ['--version'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      child.on('error', () => resolve(false));
      child.on('exit', (code) => resolve(code === 0));
      setTimeout(() => { child.kill(); resolve(false); }, 5_000);
    });
  }

  async verifySkillLoaded(skillId: string): Promise<SkillVerification> {
    // Heuristic-based for now — hook-based detection will be added later
    const result = await this.execute({
      prompt: `What skills do you have for ${skillId}?`,
      timeout: 15_000,
      maxRetries: 0,
    });

    if (result.success && result.skillTriggered === skillId) {
      return {
        loaded: true,
        confidence: 'medium',
        method: 'heuristic',
        evidence: [`Response referenced ${skillId} patterns`],
      };
    }

    return {
      loaded: false,
      confidence: 'low',
      method: 'heuristic',
      evidence: ['Could not confirm skill loading via heuristic'],
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const maxRetries = request.maxRetries ?? ClaudeCodeAdapter.DEFAULT_RETRIES;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.executeOnce(request);

      if (result.success) {
        return { ...result, retryCount: attempt };
      }

      const isTimeout = result.error?.includes('Timeout');
      const isRateLimit = result.error?.includes('429') || result.error?.includes('rate limit');

      if ((!isTimeout && !isRateLimit) || attempt >= maxRetries) {
        return { ...result, retryCount: attempt };
      }

      const delay = isRateLimit
        ? ClaudeCodeAdapter.RATE_LIMIT_DELAY_MS
        : ClaudeCodeAdapter.RETRY_DELAY_MS;
      await this.sleep(delay);
    }

    return {
      success: false,
      skillTriggered: null,
      responseContent: '',
      tokensUsed: 0,
      latencyMs: 0,
      cost: 0,
      error: 'Max retries exceeded',
    };
  }

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      description: this.description,
      requiresApiKey: false,
      supportedModels: ['default (Claude Sonnet 4.6)'],
    };
  }

  // ── Private ──

  private executeOnce(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      let resolved = false;
      const safeResolve = (result: ExecutionResult) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(result);
        }
      };

      let stdout = '';
      let stderr = '';

      // SECURITY: spawn with array arguments prevents command injection
      // -p / --print enables non-interactive mode (required for programmatic use)
      const child = spawn('claude', ['-p', request.prompt], {
        env: {
          ...process.env,
          CLAUDE_PLUGINS: 'ui5',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
      child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

      child.on('close', (code) => {
        if (code === 0) {
          safeResolve({
            success: true,
            skillTriggered: this.detectSkillUsage(stdout),
            responseContent: stdout,
            tokensUsed: this.estimateTokens(request.prompt, stdout),
            latencyMs: Date.now() - startTime,
            cost: 0,
          });
        } else {
          safeResolve({
            success: false,
            skillTriggered: null,
            responseContent: stdout,
            tokensUsed: 0,
            latencyMs: Date.now() - startTime,
            cost: 0,
            error: `Command failed with code ${code}: ${stderr || stdout.trim().substring(0, 200)}`,
          });
        }
      });

      child.on('error', (error: Error) => {
        safeResolve({
          success: false,
          skillTriggered: null,
          responseContent: '',
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          error: error.message,
        });
      });

      const timeoutMs = request.timeout ?? 60_000;
      const timer = setTimeout(() => {
        child.kill();
        safeResolve({
          success: false,
          skillTriggered: null,
          responseContent: stdout,
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          cost: 0,
          error: `Timeout after ${timeoutMs}ms`,
        });
      }, timeoutMs);
    });
  }

  private detectSkillUsage(response: string): string | null {
    const lower = response.toLowerCase();

    const ui5Patterns = [
      'sap.ui.define', 'sap.ui.require', 'sap/m/', 'sap/ui/',
      'sap.ui.core', 'sap.m.', 'sap.ui.model',
      'columnlayout', 'simpleform', 'component.js', 'manifest.json',
      'odata type', 'odata v2', 'odata v4', 'odata model', 'sap.ui.model.odata',
      'button$press', 'button$pressevent', 'event$', 'ui5 types',
      'cds watch', 'cds serve', 'cap project',
      'content security policy', 'csp violation', 'nonce',
      'ui5.yaml', 'ui5 tooling', 'ui5-tooling',
      'get_api_reference', 'run_ui5_linter',
    ];

    const criticalKeywords = ['sap.ui.', 'sapui5', 'ui5 best practices', 'ui5 guidelines'];

    const matchCount = ui5Patterns.filter(p => lower.includes(p)).length;
    const hasCritical = criticalKeywords.some(k => lower.includes(k));

    return (matchCount >= 1 || hasCritical) ? 'ui5-best-practices' : null;
  }

  private estimateTokens(prompt: string, response: string): number {
    return Math.ceil((prompt.length + response.length) / ClaudeCodeAdapter.CHARS_PER_TOKEN);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
