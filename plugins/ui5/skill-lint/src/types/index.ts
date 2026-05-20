/**
 * Core linter types
 */

// ── Violation & Results ──

export type ViolationLevel = 'error' | 'warning' | 'info';

export interface Violation {
  readonly level: ViolationLevel;
  readonly rule: string;
  readonly message: string;
  readonly file?: string;
  readonly line?: number;
  readonly suggestion?: string;
}

export interface ValidationResult {
  readonly validator: string;
  readonly passed: boolean;
  readonly duration: number;
  readonly violations: readonly Violation[];
  readonly metrics?: Readonly<Record<string, unknown>>;
}

export interface LintResult {
  readonly skill: string;
  readonly skillPath: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly passed: boolean;
  readonly results: readonly ValidationResult[];
  readonly summary: LintSummary;
}

export interface LintSummary {
  readonly totalValidators: number;
  readonly passedValidators: number;
  readonly failedValidators: number;
  readonly errors: number;
  readonly warnings: number;
  readonly infos: number;
}

// ── Skill ──

export interface SkillMetadata {
  readonly name: string;
  readonly description: string;
  readonly compatibility?: readonly string[];
}

export interface Skill {
  readonly path: string;
  readonly content: string;
  readonly metadata: SkillMetadata;
  readonly pluginRoot: string;
}

// ── Test Cases ──

export interface SkillTestConfiguration {
  readonly name: string;
  readonly triggerKeywords: readonly string[];
  readonly antiKeywords: readonly string[];
  readonly detectionPatterns: readonly string[];
  readonly criticalKeywords: readonly string[];
}

export interface TriggerTestCaseFile {
  readonly version: string;
  readonly description: string;
  readonly skill: SkillTestConfiguration;
  readonly tests: readonly TriggerTestCase[];
}

export interface TriggerTestCase {
  readonly prompt: string;
  readonly expected_skill: string | null;
  readonly should_trigger: boolean;
  readonly category: string;
  readonly reason?: string;
}

export interface TriggerTestResult {
  readonly passed: boolean;
  readonly prompt: string;
  readonly expected: string | null;
  readonly actual: string | null;
  readonly category: string;
}

// ── Adapter ──

export interface ExecutionRequest {
  readonly prompt: string;
  readonly skillId?: string;
  readonly skillConfig?: SkillTestConfiguration;
  readonly timeout?: number;
  readonly maxRetries?: number;
}

export interface ExecutionResult {
  readonly success: boolean;
  readonly skillTriggered: string | null;
  readonly responseContent: string;
  readonly tokensUsed: number;
  readonly latencyMs: number;
  readonly cost: number;
  readonly error?: string;
  readonly retryCount?: number;
}

export interface SkillVerification {
  readonly loaded: boolean;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly method: 'hook' | 'heuristic' | 'assumed';
  readonly evidence: readonly string[];
}

export interface AdapterInfo {
  readonly name: string;
  readonly description: string;
  readonly requiresApiKey: boolean;
  readonly supportedModels: readonly string[];
}

// ── Config ──

export interface LintConfig {
  readonly scenarios: {
    readonly structure: boolean;
    readonly triggering: boolean;
    readonly performance: boolean;
    readonly integration: boolean;
  };
  readonly adapter: string;
  readonly thresholds: {
    readonly performance: {
      readonly maxLines: number;
      readonly maxTokens: number;
    };
    readonly triggering: {
      readonly minAccuracy: number;
    };
  };
  readonly testCases: {
    readonly triggering?: string;
    readonly integration?: string;
  };
  readonly execution: {
    readonly timeout: number;
    readonly maxRetries: number;
    readonly parallel: boolean;
    readonly maxConcurrency?: number;
  };
  readonly formatters: {
    readonly default: string;
    readonly options: {
      readonly colors: boolean;
      readonly verbose: boolean;
    };
  };
  readonly output: {
    readonly directory: string;
    readonly formats: readonly string[];
  };
}
