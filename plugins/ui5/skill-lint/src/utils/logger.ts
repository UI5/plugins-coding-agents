/**
 * Logger utility — semantic logging with optional emoji prefixes
 * Reused from test-logger.ts
 * 
 * Emoji usage is configurable:
 * - Auto-detected via TTY (disabled in CI/CD environments)
 * - Can be forced via DISABLE_EMOJI=1 or ENABLE_EMOJI=1 env vars
 */

/**
 * Detect if terminal supports emojis
 * Checks:
 * - stdout.isTTY (true for interactive terminals)
 * - CI environment variables (GitHub Actions, GitLab CI, etc.)
 * - DISABLE_EMOJI / ENABLE_EMOJI env vars
 */
function shouldUseEmoji(): boolean {
  // Explicit configuration takes precedence
  if (process.env.DISABLE_EMOJI === '1') return false;
  if (process.env.ENABLE_EMOJI === '1') return true;

  // Detect CI environment (most CI systems set CI=true)
  if (process.env.CI === 'true' || process.env.CI === '1') return false;

  // Check if running in interactive terminal
  if (process.stdout && typeof process.stdout.isTTY === 'boolean') {
    return process.stdout.isTTY;
  }

  // Default: assume TTY support
  return true;
}

const USE_EMOJI = shouldUseEmoji();

/**
 * Add emoji prefix if enabled, otherwise use text alternative
 */
function prefix(emoji: string, text: string): string {
  return USE_EMOJI ? emoji : text;
}

export const Logger = {
  success: (message: string): void => {
    console.log(`${prefix('✅', '[✓]')} ${message}`);
  },
  warning: (message: string): void => {
    console.warn(`${prefix('⚠️ ', '[!]')} ${message}`);
  },
  info: (message: string): void => {
    console.log(`${prefix('ℹ️ ', '[i]')} ${message}`);
  },
  error: (message: string): void => {
    console.error(`${prefix('❌', '[✗]')} ${message}`);
  },
  skip: (message: string): void => {
    console.log(`${prefix('⊘', '[-]')} ${message}`);
  },
  metrics: (message: string): void => {
    console.log(`${prefix('📊', '[📊]')} ${message}`);
  },
  document: (message: string): void => {
    console.log(`${prefix('📄', '[📄]')} ${message}`);
  },
  start: (message: string): void => {
    console.log(`${prefix('🚀', '[→]')} ${message}`);
  },
  plain: (message: string): void => {
    console.log(`   ${message}`);
  },
} as const;
