/**
 * Abstract base adapter — all integration adapters extend this
 */

import type { ExecutionRequest, ExecutionResult, SkillVerification, AdapterInfo } from '../types/index.js';

export abstract class BaseAdapter {
  abstract readonly name: string;
  abstract readonly description: string;

  abstract isAvailable(): Promise<boolean>;
  abstract verifySkillLoaded(skillId: string): Promise<SkillVerification>;
  abstract execute(request: ExecutionRequest): Promise<ExecutionResult>;

  getInfo(): AdapterInfo {
    return {
      name: this.name,
      description: this.description,
      requiresApiKey: false,
      supportedModels: [],
    };
  }

  async cleanup(): Promise<void> {
    // Default: no cleanup
  }
}
