/**
 * Configuration constants and thresholds for skill-lint
 * 
 * These values are extracted from various validators and utilities
 * to provide a single source of truth for all magic numbers and thresholds.
 */

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  /**
   * Maximum recommended lines in SKILL.md
   * Rationale: Based on readability studies, skills over 700 lines become hard to maintain
   */
  MAX_SKILL_LINES: 700,

  /**
   * Maximum recommended tokens in SKILL.md
   * Rationale: Keeps skill context under 2% of typical 200K context window
   */
  MAX_SKILL_TOKENS: 4000,

  /**
   * Warning threshold as percentage of max lines
   * Rationale: Alert developers when approaching the limit
   */
  LINE_WARNING_THRESHOLD: 0.7, // 70% of max

  /**
   * Maximum recommended README.md lines
   * Rationale: READMEs should be concise - detailed docs go in separate files
   */
  MAX_README_LINES: 150,

  /**
   * Maximum recommended test fixture file size (bytes)
   * Rationale: Large fixtures slow down test execution and Git operations
   */
  MAX_FIXTURE_SIZE_BYTES: 50_000, // 50 KB

  /**
   * Total context budget limit (tokens)
   * Rationale: Keep total plugin context under 5% of 200K window (10K tokens)
   */
  MAX_CONTEXT_BUDGET: 10_000,

  /**
   * Estimated metadata overhead (tokens)
   * Rationale: plugin.json and other metadata typically use ~100 tokens
   */
  METADATA_OVERHEAD_TOKENS: 100,

  /**
   * Full context window size (tokens)
   * Rationale: Claude's typical context window
   */
  CONTEXT_WINDOW_SIZE: 200_000,
} as const;

/**
 * Token estimation constants
 */
export const TOKEN_ESTIMATION = {
  /**
   * Characters per token approximation
   * Rationale: Standard approximation for English text (1 token ≈ 4 characters)
   */
  CHARS_PER_TOKEN: 4,
} as const;

/**
 * Test case thresholds
 */
export const TEST_THRESHOLDS = {
  /**
   * Minimum recommended trigger test cases
   * Rationale: 20 cases provide good coverage of positive/negative scenarios
   */
  MIN_TRIGGER_TEST_CASES: 20,

  /**
   * Minimum trigger accuracy threshold (percentage)
   * Rationale: 90% accuracy indicates reliable skill detection
   */
  MIN_TRIGGER_ACCURACY: 90,

  /**
   * Integration accuracy thresholds
   */
  INTEGRATION_ACCURACY: {
    /** Below this is critical error (percentage) */
    CRITICAL_THRESHOLD: 70,
    /** Below this is warning (percentage) */
    WARNING_THRESHOLD: 90,
  },
} as const;

/**
 * Frontmatter validation constants
 */
export const FRONTMATTER = {
  /**
   * Minimum description length (characters)
   * Rationale: Descriptions under 50 chars are typically too vague
   */
  MIN_DESCRIPTION_LENGTH: 50,

  /**
   * Maximum description length (characters)
   * Rationale: Descriptions over 200 chars should be in main content
   */
  MAX_DESCRIPTION_LENGTH: 200,
} as const;

/**
 * Duplicate content detection
 */
export const DUPLICATE_DETECTION = {
  /**
   * Minimum block length for duplicate detection (characters)
   * Rationale: Shorter blocks create too many false positives
   */
  MIN_BLOCK_LENGTH: 100,

  /**
   * Threshold for significant duplication (percentage)
   * Rationale: Over 30% duplication suggests content should be refactored
   */
  SIGNIFICANT_DUPLICATION_THRESHOLD: 30,
} as const;

/**
 * Integration validator settings
 */
export const INTEGRATION = {
  /**
   * Batch size for AI categorization
   * Rationale: Balances API efficiency vs. token limits
   */
  AI_BATCH_SIZE: 5,

  /**
   * Batch size for AI duplicate disambiguation
   * Rationale: Larger batches for simpler comparisons
   */
  AI_DEDUP_BATCH_SIZE: 10,

  /**
   * Default timeout for integration tests (milliseconds)
   * Rationale: Most skills should respond within 60 seconds
   */
  DEFAULT_TIMEOUT_MS: 60_000,

  /**
   * Default max retries for failed requests
   * Rationale: 2 retries handle transient failures without excessive delay
   */
  DEFAULT_MAX_RETRIES: 2,
} as const;

/**
 * Security limits for file operations
 */
export const SECURITY_LIMITS = {
  /**
   * Maximum file size before reading (bytes)
   * Rationale: Prevent OOM attacks with malicious 100GB+ files
   * Default: 50 MB (configurable via MAX_FILE_SIZE_MB env var)
   */
  MAX_FILE_SIZE_BYTES: Number(process.env.MAX_FILE_SIZE_MB || 50) * 1024 * 1024,

  /**
   * Streaming threshold for large files (bytes)
   * Rationale: Files >10MB should use streaming to prevent memory issues
   */
  STREAMING_THRESHOLD_BYTES: 10 * 1024 * 1024,
} as const;

/**
 * Reference validator thresholds
 */
export const REFERENCE_THRESHOLDS = {
  /**
   * Line count threshold for suggesting reference file split
   * Rationale: Skills over 400 lines benefit from splitting into reference files
   */
  SHOULD_SPLIT_LINES: 400,

  /**
   * Timeout for external link HEAD requests (milliseconds)
   * Rationale: 5 seconds is enough for a healthy URL, avoids blocking on slow servers
   */
  EXTERNAL_LINK_TIMEOUT_MS: 5_000,
} as const;

/**
 * Description quality scoring constants
 */
export const DESCRIPTION_SCORING = {
  /**
   * Minimum word count for optimal description
   * Rationale: 10 words provides enough context for triggering
   */
  MIN_WORD_COUNT: 10,

  /**
   * Maximum word count for optimal description
   * Rationale: 50 words keeps description focused
   */
  MAX_WORD_COUNT: 50,

  /**
   * Common English words to flag as low-specificity keywords
   * Rationale: These words appear in too many prompts to be useful triggers
   */
  COMMON_WORDS: new Set([
    'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'shall', 'can', 'need',
    'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on',
    'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
    'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
    'same', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'nor', 'not', 'so', 'if', 'while', 'about', 'up', 'that',
    'this', 'what', 'which', 'who', 'whom', 'these', 'those', 'also',
    'make', 'like', 'time', 'know', 'take', 'come', 'think', 'look',
    'want', 'give', 'use', 'find', 'tell', 'work', 'call', 'try',
    'ask', 'seem', 'feel', 'leave', 'keep', 'let', 'begin', 'show',
    'hear', 'play', 'run', 'move', 'live', 'believe', 'bring', 'happen',
    'write', 'provide', 'sit', 'stand', 'lose', 'pay', 'meet', 'include',
    'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
    'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add', 'spend',
    'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider',
    'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build',
    'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'file', 'code',
    'function', 'using', 'based', 'help', 'best', 'practices',
  ]),
} as const;

/**
 * Export all constants as a single namespace
 */
export const CONSTANTS = {
  PERFORMANCE_THRESHOLDS,
  TOKEN_ESTIMATION,
  TEST_THRESHOLDS,
  FRONTMATTER,
  DUPLICATE_DETECTION,
  INTEGRATION,
  SECURITY_LIMITS,
  REFERENCE_THRESHOLDS,
  DESCRIPTION_SCORING,
} as const;
