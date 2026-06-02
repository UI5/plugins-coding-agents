/**
 * Constants for TriggerExtractor
 * Centralizes magic numbers and domain knowledge
 */

export const EXTRACTION_LIMITS = {
  /** Max number of primary keywords to display in violation message */
  PRIMARY_KEYWORDS_DISPLAY: 20,
  /** Max number of secondary keywords to display */
  SECONDARY_KEYWORDS_DISPLAY: 15,
  /** Max number of code patterns to display */
  CODE_PATTERNS_DISPLAY: 15,
  /** Max number of action phrases to display */
  ACTION_PHRASES_DISPLAY: 5,
  /** Max number of code patterns to extract total */
  CODE_PATTERNS_MAX: 30,
  /** Max number of action phrases to extract total */
  ACTION_PHRASES_MAX: 10,
  /** Top N most frequent body words to include as keywords */
  FREQUENT_WORDS_TOP_N: 20,
  /** Minimum frequency count for body words */
  WORD_FREQUENCY_MIN: 3,
  /** Max skill content size in bytes (10MB) to prevent ReDoS */
  MAX_CONTENT_SIZE: 10 * 1024 * 1024,
  /** Max description size in bytes (100KB) */
  MAX_DESCRIPTION_SIZE: 100 * 1024,
} as const;

export const AUTO_GENERATION_LIMITS = {
  /** Number of prompts to generate from primary keywords */
  KEYWORD_PROMPTS: 5,
  /** Number of prompts to generate from action phrases */
  ACTION_PROMPTS: 3,
  /** Number of negative prompts to generate from anti-keywords */
  NEGATIVE_PROMPTS: 3,
} as const;

/**
 * Domain confusion mappings for anti-keyword suggestions
 * Can be extended via config file in future
 */
export const DEFAULT_CONFUSION_DOMAINS: Record<string, string[]> = {
  // Frontend frameworks
  react: ['vue', 'angular', 'svelte'],
  vue: ['react', 'angular'],
  angular: ['react', 'vue'],
  
  // Backend frameworks
  express: ['django', 'flask', 'fastapi'],
  django: ['express', 'rails', 'laravel'],
  
  // Languages
  typescript: ['python', 'java', 'rust'],
  python: ['javascript', 'java', 'ruby'],
  javascript: ['python', 'java'],
  
  // Mobile
  ios: ['android', 'flutter'],
  android: ['ios', 'flutter'],
  
  // SAP/UI5 (can be removed if tool should be fully agnostic)
  ui5: ['react', 'vue', 'angular'],
  sapui5: ['react', 'vue', 'angular'],
  odata: ['rest', 'graphql'],
  cap: ['express', 'nestjs'],
  fiori: ['react', 'vue', 'angular'],
} as const;
