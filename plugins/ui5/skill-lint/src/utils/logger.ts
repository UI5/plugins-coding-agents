/**
 * Logger utility — semantic logging with emoji prefixes
 * Reused from test-logger.ts
 */

export const Logger = {
  success: (message: string): void => {
    console.log(`✅ ${message}`);
  },
  warning: (message: string): void => {
    console.warn(`⚠️  ${message}`);
  },
  info: (message: string): void => {
    console.log(`ℹ️  ${message}`);
  },
  error: (message: string): void => {
    console.error(`❌ ${message}`);
  },
  skip: (message: string): void => {
    console.log(`⊘ ${message}`);
  },
  metrics: (message: string): void => {
    console.log(`📊 ${message}`);
  },
  document: (message: string): void => {
    console.log(`📄 ${message}`);
  },
  start: (message: string): void => {
    console.log(`🚀 ${message}`);
  },
  plain: (message: string): void => {
    console.log(`   ${message}`);
  },
} as const;
