/**
 * Error Message Catalog
 * Centralized error messages with consistent formatting
 */

export interface ErrorMessage {
  readonly message: string;
  readonly suggestion?: string;
}

export type ErrorMessageFactory = (...args: any[]) => ErrorMessage;

/**
 * Structure Validator Error Messages
 */
export const STRUCTURE_ERRORS = {
  pluginJsonExists: (): ErrorMessage => ({
    message: 'Missing .claude-plugin/plugin.json',
    suggestion: 'Create a plugin.json with name, version, and skills array',
  }),
  
  pluginJsonParse: (): ErrorMessage => ({
    message: 'plugin.json is not valid JSON',
  }),
  
  pluginJsonName: (): ErrorMessage => ({
    message: 'plugin.json missing "name" string field',
  }),
  
  pluginJsonVersion: (): ErrorMessage => ({
    message: 'plugin.json missing "version" string field',
  }),
  
  pluginJsonSkills: (): ErrorMessage => ({
    message: 'plugin.json must have a non-empty "skills" array',
  }),
  
  skillExists: (path: string): ErrorMessage => ({
    message: `SKILL.md not found at ${path}`,
  }),
  
  frontmatterName: (): ErrorMessage => ({
    message: 'Frontmatter is missing "name"',
  }),
  
  frontmatterDescription: (): ErrorMessage => ({
    message: 'Frontmatter is missing "description"',
  }),
  
  frontmatterDescriptionLength: (length: number, minLength: number): ErrorMessage => ({
    message: `Description is only ${length} chars — should be > ${minLength} for effective triggering`,
    suggestion: 'Add more keywords and context to the description',
  }),
  
  sectionsCount: (count: number): ErrorMessage => ({
    message: `SKILL.md has only ${count} numbered section(s) — consider adding more`,
  }),
  
  brokenLink: (url: string): ErrorMessage => ({
    message: `Broken relative link: ${url}`,
  }),
  
  readmeExists: (): ErrorMessage => ({
    message: 'No README.md found at plugin root',
    suggestion: 'Add a README.md with usage instructions',
  }),
  
  readmeReferencesSkill: (skillName: string): ErrorMessage => ({
    message: `README.md does not mention skill "${skillName}"`,
  }),
  
  triggerFixturesExist: (): ErrorMessage => ({
    message: 'No trigger-cases.json found at test/fixtures/ — triggering validation will be limited',
    suggestion: 'Create test/fixtures/trigger-cases.json with prompt test cases',
  }),
  
  triggerFixturesFormat: (): ErrorMessage => ({
    message: 'trigger-cases.json must have a "tests" array',
  }),
  
  triggerFixturesCount: (count: number, minCount: number): ErrorMessage => ({
    message: `Only ${count} test cases — recommend at least ${minCount}`,
  }),
  
  triggerFixturesParse: (): ErrorMessage => ({
    message: 'trigger-cases.json is not valid JSON',
  }),
  
  packageJsonExists: (): ErrorMessage => ({
    message: 'No package.json at plugin root',
  }),
  
  packageJsonTestScript: (): ErrorMessage => ({
    message: 'package.json has no "test" script',
  }),
  
  packageJsonParse: (): ErrorMessage => ({
    message: 'package.json is not valid JSON',
  }),
} as const;

/**
 * Performance Validator Error Messages
 */
export const PERFORMANCE_ERRORS = {
  skillEmpty: (): ErrorMessage => ({
    message: 'SKILL.md is empty',
  }),
  
  skillTooLarge: (lineCount: number, maxLines: number): ErrorMessage => ({
    message: `SKILL.md is ${lineCount} lines — max ${maxLines}`,
    suggestion: 'Move detailed content to reference files',
  }),
  
  skillGettingLarge: (lineCount: number, maxLines: number): ErrorMessage => ({
    message: `SKILL.md is ${lineCount} lines (${Math.round(lineCount / maxLines * 100)}% of ${maxLines} limit)`,
    suggestion: 'Consider using reference files for detailed sections',
  }),
  
  tokenBudgetExceeded: (tokens: number, maxTokens: number): ErrorMessage => ({
    message: `SKILL.md is ~${tokens} tokens — max ${maxTokens}`,
  }),
  
  contextBudget: (totalTokens: number, contextWindowSize: number, maxContextBudget: number): ErrorMessage => ({
    message: `Total context budget is ~${totalTokens} tokens (${(totalTokens / contextWindowSize * 100).toFixed(1)}% of context window)`,
    suggestion: `Keep total plugin context under ${maxContextBudget / 1000}k tokens`,
  }),
  
  referenceFiles: (count: number, files: string[]): ErrorMessage => ({
    message: `Found ${count} reference file(s): ${files.join(', ')}`,
  }),
  
  readmeTooLong: (lineCount: number, maxLines: number): ErrorMessage => ({
    message: `README.md is ${lineCount} lines — recommend ≤ ${maxLines}`,
  }),
  
  duplicateCodeBlocks: (count: number): ErrorMessage => ({
    message: `${count} duplicate code block(s) found between README.md and SKILL.md`,
    suggestion: 'Remove duplicate examples — keep them only in SKILL.md',
  }),
  
  fixtureTooLarge: (sizeKB: number, maxSizeKB: number): ErrorMessage => ({
    message: `trigger-cases.json is ${sizeKB} KB — recommend < ${maxSizeKB} KB`,
  }),
} as const;

/**
 * Triggering Validator Error Messages
 */
export const TRIGGERING_ERRORS = {
  noTestCases: (): ErrorMessage => ({
    message: 'No triggering test cases found — validation skipped',
    suggestion: 'Create test/fixtures/trigger-cases.json with prompt test cases',
  }),
  
  accuracyBelowThreshold: (accuracy: number, threshold: number): ErrorMessage => ({
    message: `Triggering accuracy is ${accuracy.toFixed(1)}% — below ${threshold}% threshold`,
    suggestion: 'Review and improve keyword patterns, or update test cases',
  }),
  
  positiveAccuracyLow: (accuracy: number): ErrorMessage => ({
    message: `Positive case accuracy is ${accuracy.toFixed(1)}% — skill not triggering when expected`,
    suggestion: 'Add more trigger keywords or check anti-keywords are not blocking',
  }),
  
  negativeAccuracyLow: (accuracy: number): ErrorMessage => ({
    message: `Negative case accuracy is ${accuracy.toFixed(1)}% — skill triggering when it should not`,
    suggestion: 'Add anti-keywords or make trigger patterns more specific',
  }),
  
  failedCase: (prompt: string, expected: boolean, actual: boolean): ErrorMessage => ({
    message: `Test case failed: "${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}" (expected: ${expected ? 'trigger' : 'no trigger'}, actual: ${actual ? 'trigger' : 'no trigger'})`,
  }),
  
  simulationWarning: (): ErrorMessage => ({
    message: 'Note: This is a simulation and NOT how Claude decides which skill to invoke. Claude uses semantic understanding, not keyword matching.',
    suggestion: 'Use these results as guidelines, not absolute truth',
  }),
} as const;

/**
 * Integration Validator Error Messages
 */
export const INTEGRATION_ERRORS = {
  noTestCases: (): ErrorMessage => ({
    message: 'No integration test cases found — validation skipped',
    suggestion: 'Create test/fixtures/integration-cases.json with test cases',
  }),
  
  adapterError: (error: string): ErrorMessage => ({
    message: `Adapter error: ${error}`,
  }),
  
  accuracyBelowCritical: (accuracy: number, threshold: number): ErrorMessage => ({
    message: `Integration accuracy is ${accuracy.toFixed(1)}% — below critical ${threshold}% threshold`,
    suggestion: 'Review skill detection patterns and test cases',
  }),
  
  accuracyBelowWarning: (accuracy: number, threshold: number): ErrorMessage => ({
    message: `Integration accuracy is ${accuracy.toFixed(1)}% — below warning ${threshold}% threshold`,
  }),
  
  testCaseFailed: (prompt: string, expected: string | null, actual: string | null): ErrorMessage => ({
    message: `Test case failed: "${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}" (expected: ${expected || 'none'}, actual: ${actual || 'none'})`,
  }),
} as const;

/**
 * Validator Errors (System-level)
 */
export const VALIDATOR_ERRORS = {
  validatorCrash: (validatorName: string, error: string): ErrorMessage => ({
    message: `Validator "${validatorName}" crashed: ${error}`,
    suggestion: 'This is likely a bug in the validator. Please report this issue.',
  }),
} as const;

/**
 * Get all error message catalogs
 */
export const ERROR_CATALOGS = {
  structure: STRUCTURE_ERRORS,
  performance: PERFORMANCE_ERRORS,
  triggering: TRIGGERING_ERRORS,
  integration: INTEGRATION_ERRORS,
  validator: VALIDATOR_ERRORS,
} as const;
