/**
 * Abstract base adapter — all integration adapters extend this
 * 
 * Provides common functionality for executing skills through different backends
 * (Claude Code CLI, API endpoints, etc.) with health checking and reconnection support.
 * 
 * @abstract
 * @example
 * ```typescript
 * class MyAdapter extends BaseAdapter {
 *   readonly name = 'my-adapter';
 *   readonly description = 'Connects to my backend';
 * 
 *   async isAvailable(): Promise<boolean> {
 *     // Check if backend is accessible
 *     return true;
 *   }
 * 
 *   async execute(request: ExecutionRequest): Promise<ExecutionResult> {
 *     // Execute skill and return results
 *     return { response: '...', tokens: 100, latency: 500 };
 *   }
 * 
 *   async healthCheck(): Promise<boolean> {
 *     // Verify connection is healthy
 *     return this.isAvailable();
 *   }
 * }
 * ```
 */

import type { ExecutionRequest, ExecutionResult, SkillVerification, AdapterInfo, HealthCheckResult } from '../types/index.js';

/**
 * Base class for all integration adapters.
 * 
 * Adapters connect the skill-lint framework to various execution backends,
 * enabling integration testing with real or simulated skill execution.
 */
export abstract class BaseAdapter {
  /**
   * Unique adapter identifier (e.g., 'claude-code', 'mock', 'api')
   */
  abstract readonly name: string;

  /**
   * Human-readable description of the adapter and its backend
   */
  abstract readonly description: string;

  /**
   * Check if the adapter's backend is available and ready to execute skills.
   * 
   * This is a lightweight check performed before test execution. For more
   * detailed health information, use `healthCheck()`.
   * 
   * @returns True if backend is available, false otherwise
   * 
   * @example
   * ```typescript
   * if (await adapter.isAvailable()) {
   *   const result = await adapter.execute(request);
   * } else {
   *   console.warn('Adapter not available, skipping test');
   * }
   * ```
   */
  abstract isAvailable(): Promise<boolean>;

  /**
   * Verify that a specific skill is loaded and accessible through this adapter.
   * 
   * @param skillId - Unique skill identifier (e.g., skill name or file path)
   * @returns Verification result with status and optional error details
   * 
   * @example
   * ```typescript
   * const verification = await adapter.verifySkillLoaded('my-skill');
   * if (!verification.loaded) {
   *   console.error(`Skill not loaded: ${verification.error}`);
   * }
   * ```
   */
  abstract verifySkillLoaded(skillId: string): Promise<SkillVerification>;

  /**
   * Execute a skill with the given request parameters.
   * 
   * This is the main adapter method for running integration tests. Implementations
   * should handle timeouts, retries, and error recovery internally.
   * 
   * @param request - Execution request with prompt, skill context, and options
   * @returns Execution result with response, token usage, and performance metrics
   * @throws Should not throw - return error in ExecutionResult instead
   * 
   * @example
   * ```typescript
   * const result = await adapter.execute({
   *   prompt: 'Create a new React component',
   *   skillId: 'react-component-creator',
   *   timeout: 30000,
   * });
   * 
   * if (result.error) {
   *   console.error('Execution failed:', result.error);
   * } else {
   *   console.log('Response:', result.response);
   * }
   * ```
   */
  abstract execute(request: ExecutionRequest): Promise<ExecutionResult>;

  /**
   * Perform a comprehensive health check on the adapter and its backend.
   * 
   * Unlike `isAvailable()`, this method performs thorough diagnostics including:
   * - Network connectivity
   * - Authentication status
   * - Resource availability (memory, disk space, API quotas)
   * - Backend responsiveness
   * 
   * Default implementation delegates to `isAvailable()`. Override for more
   * detailed health monitoring.
   * 
   * @returns Health check result with status and diagnostic details
   * 
   * @example
   * ```typescript
   * const health = await adapter.healthCheck();
   * if (!health.healthy) {
   *   console.error('Health check failed:', health.details);
   *   if (health.reconnectable) {
   *     await adapter.reconnect();
   *   }
   * }
   * ```
   */
  async healthCheck(): Promise<HealthCheckResult> {
    try {
      const available = await this.isAvailable();
      return {
        healthy: available,
        details: available ? 'Adapter is available' : 'Adapter is not available',
        reconnectable: !available,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        details: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
        reconnectable: true,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Attempt to reconnect or reinitialize the adapter after a failure.
   * 
   * Use this method to recover from transient errors, network interruptions,
   * or backend restarts. The adapter should attempt to restore full functionality.
   * 
   * Default implementation is a no-op. Override to implement reconnection logic.
   * 
   * @returns True if reconnection succeeded, false otherwise
   * 
   * @example
   * ```typescript
   * if (!(await adapter.healthCheck()).healthy) {
   *   console.log('Attempting to reconnect...');
   *   if (await adapter.reconnect()) {
   *     console.log('Reconnection successful');
   *   } else {
   *     console.error('Reconnection failed');
   *   }
   * }
   * ```
   */
  async reconnect(): Promise<boolean> {
    // Default: no reconnection logic
    // Subclasses should override if reconnection is supported
    return await this.isAvailable();
  }

  /**
   * Get adapter metadata and capabilities.
   * 
   * @returns Adapter information including name, description, and capabilities
   * 
   * @example
   * ```typescript
   * const info = adapter.getInfo();
   * console.log(`Using ${info.name}: ${info.description}`);
   * if (info.requiresApiKey) {
   *   console.log('API key required');
   * }
   * ```
   */
  getInfo(): AdapterInfo {
    return {
      name: this.name,
      description: this.description,
      requiresApiKey: false,
      supportedModels: [],
    };
  }

  /**
   * Clean up adapter resources (connections, processes, temp files, etc.).
   * 
   * Called automatically after validation completes. Implementations should
   * release all resources and handle cleanup errors gracefully.
   * 
   * Default implementation is a no-op. Override if cleanup is needed.
   * 
   * @example
   * ```typescript
   * try {
   *   await adapter.cleanup();
   * } catch (error) {
   *   console.warn('Cleanup error:', error);
   *   // Non-critical - continue anyway
   * }
   * ```
   */
  async cleanup(): Promise<void> {
    // Default: no cleanup
  }
}
