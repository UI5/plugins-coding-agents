/**
 * Adapter registry — manages available adapters
 */

import { BaseAdapter } from './base-adapter.js';
import { ClaudeCodeAdapter } from './claude-code-adapter.js';

const BUILTIN_ADAPTERS: ReadonlyMap<string, () => BaseAdapter> = new Map([
  ['claude-code', () => new ClaudeCodeAdapter()],
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
