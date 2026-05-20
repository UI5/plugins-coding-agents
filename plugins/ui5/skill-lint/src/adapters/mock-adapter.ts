/**
 * Mock Adapter for Testing
 * 
 * This adapter allows programmatic control of responses for testing purposes.
 * It does not make any actual API calls, making tests fast, deterministic, and free.
 * 
 * Usage:
 * ```typescript
 * const adapter = new MockAdapter();
 * adapter.setResponse("Test prompt", {
 *   success: true,
 *   skillTriggered: "test-skill",
 *   responseContent: "Test response",
 *   tokensUsed: 100,
 *   latencyMs: 50,
 *   cost: 0,
 * });
 * 
 * const result = await adapter.execute({ prompt: "Test prompt" });
 * ```
 */

import { BaseAdapter } from './base-adapter.js';
import type {
  ExecutionRequest,
  ExecutionResult,
  SkillVerification,
  AdapterInfo,
} from '../types/index.js';

export class MockAdapter extends BaseAdapter {
  readonly name = 'mock';
  readonly description = 'Mock adapter for testing (no API calls)';

  private responses: Map<string, ExecutionResult> = new Map();
  private defaultResponse: ExecutionResult | null = null;
  private available: boolean = true;

  /**
   * Set a specific response for a given prompt
   */
  setResponse(prompt: string, result: ExecutionResult): void {
    this.responses.set(prompt, result);
  }

  /**
   * Set a default response for any prompt not explicitly configured
   */
  setDefaultResponse(result: ExecutionResult): void {
    this.defaultResponse = result;
  }

  /**
   * Clear all configured responses
   */
  clearResponses(): void {
    this.responses.clear();
    this.defaultResponse = null;
  }

  /**
   * Set whether the adapter reports as available
   */
  setAvailable(available: boolean): void {
    this.available = available;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async verifySkillLoaded(skillId: string): Promise<SkillVerification> {
    // Mock always reports skill as loaded
    return {
      loaded: true,
      confidence: 'high',
      method: 'assumed',
      evidence: [`Mock adapter always reports ${skillId} as loaded`],
    };
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Check for specific response first
    const specific = this.responses.get(request.prompt);
    if (specific) {
      return specific;
    }

    // Fall back to default response
    if (this.defaultResponse) {
      return this.defaultResponse;
    }

    // If no response configured, return a default success response
    return {
      success: true,
      skillTriggered: request.skillId ?? null,
      responseContent: `Mock response for: ${request.prompt}`,
      tokensUsed: Math.ceil(request.prompt.length / 4),
      latencyMs: 10,
      cost: 0,
    };
  }

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      description: this.description,
      requiresApiKey: false,
      supportedModels: ['mock'],
    };
  }
}
