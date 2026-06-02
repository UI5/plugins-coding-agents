/**
 * Adapter registry — manages available adapters
 */

import { BaseAdapter } from './base-adapter.js';
import { ClaudeCodeAdapter } from './claude-code-adapter.js';
import { MockAdapter } from './mock-adapter.js';

const BUILTIN_ADAPTERS: ReadonlyMap<string, () => BaseAdapter> = new Map<string, () => BaseAdapter>([
  ['claude-code', () => new ClaudeCodeAdapter()],
  ['mock', () => new MockAdapter()],
]);

export function getAdapter(name: string): BaseAdapter {
  const factory = BUILTIN_ADAPTERS.get(name);
  if (!factory) {
    const available = [...BUILTIN_ADAPTERS.keys()].join(', ');
    throw new Error(`Unknown adapter "${name}". Available: ${available}`);
  }
  return factory();
}

export function listAdapters(): string[] {
  return [...BUILTIN_ADAPTERS.keys()];
}
