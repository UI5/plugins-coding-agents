/**
 * Analyze Command
 * Analyzes a skill and suggests trigger keywords without requiring test case files.
 * 
 * This command reads the skill content and automatically extracts:
 * - Primary keywords from description
 * - Secondary keywords (multi-word phrases)
 * - Code patterns (imports, API calls)
 * - Action phrases (use cases)
 * - Suggested anti-keywords
 */

import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { TriggerExtractor } from '../../validators/trigger-extractor.js';
import { loadSkill } from '../../utils/file-utils.js';
import { Logger } from '../../utils/logger.js';
import { sanitizeForTerminal } from '../../utils/sanitization.js';
import { DEFAULT_CONFIG } from '../../config/schema.js';

export interface AnalyzeOptions {
  /** Path to save extracted keywords as JSON */
  output?: string;
  /** Output format (currently only 'text' and 'json' supported) */
  format?: 'text' | 'json';
}

export async function analyzeCommand(
  skillPath: string,
  options: AnalyzeOptions = {},
): Promise<number> {
  try {
    const resolvedPath = resolve(process.cwd(), skillPath);
    
    Logger.start(`Analyzing ${resolvedPath}`);
    
    // Load skill
    const skill = await loadSkill(resolvedPath);
    const safeName = sanitizeForTerminal(skill.metadata.name);
    
    // Run extractor
    const extractor = new TriggerExtractor();
    const result = await extractor.validate(skill, DEFAULT_CONFIG);
    
    // Extract data from violations using helper
    const extractedData = extractViolationData(result.violations);
    
    // Output based on format
    if (options.format === 'json') {
      const jsonOutput = {
        skill: safeName,
        ...extractedData,
        duration: result.duration
      };
      
      if (options.output) {
        writeFileSync(options.output, JSON.stringify(jsonOutput, null, 2));
        Logger.success(`Analysis saved to ${options.output}`);
      } else {
        console.log(JSON.stringify(jsonOutput, null, 2));
      }
    } else {
      // Text format (default)
      displayTextOutput(safeName, result.violations);
      
      // Save to file if requested
      if (options.output) {
        const jsonOutput = { skill: safeName, ...extractedData, duration: result.duration };
        writeFileSync(options.output, JSON.stringify(jsonOutput, null, 2));
        Logger.success(`\nAnalysis also saved to ${options.output}`);
      }
    }
    
    Logger.success(`\nAnalysis complete! Duration: ${result.duration}ms\n`);
    
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Analysis failed: ${message}`);
    return 2;
  }
}

/**
 * Extract structured data from violations (DRY helper)
 */
function extractViolationData(violations: readonly any[]) {
  return {
    primaryKeywords: violations.find(v => v.rule === 'extracted-primary-keywords')?.metadata?.keywords ?? [],
    secondaryKeywords: violations.find(v => v.rule === 'extracted-secondary-keywords')?.metadata?.keywords ?? [],
    codePatterns: violations.find(v => v.rule === 'extracted-code-patterns')?.metadata?.patterns ?? [],
    actionPhrases: violations.find(v => v.rule === 'extracted-action-phrases')?.metadata?.phrases ?? [],
    antiKeywords: violations.find(v => v.rule === 'suggested-anti-keywords')?.metadata?.antiKeywords ?? [],
  };
}

/**
 * Display text output (extracted from main function for readability)
 */
function displayTextOutput(skillName: string, violations: readonly any[]) {
  console.log(`\n📊 Trigger Keyword Analysis for "${skillName}"\n`);
  console.log('='.repeat(70));
  
  // Rule formatters map (DRY)
  const formatters: Record<string, { emoji: string; showSuggestion?: boolean }> = {
    'extracted-primary-keywords': { emoji: '✨' },
    'extracted-secondary-keywords': { emoji: '🔤' },
    'extracted-code-patterns': { emoji: '⚙️' },
    'extracted-action-phrases': { emoji: '🎯' },
    'suggested-anti-keywords': { emoji: '🚫', showSuggestion: true },
    'extraction-summary': { emoji: '📈', showSuggestion: true },
  };
  
  violations.forEach(v => {
    const formatter = formatters[v.rule];
    if (formatter) {
      if (v.rule === 'extraction-summary') {
        console.log(`\n${'='.repeat(70)}`);
      }
      console.log(`\n${formatter.emoji} ${v.message}`);
      if (formatter.showSuggestion && v.suggestion) {
        console.log(`💡 ${v.suggestion}`);
      }
    }
  });
  
  // Show example usage
  const data = extractViolationData(violations);
  console.log(`\n\n💾 Example trigger-cases.json structure:\n`);
  console.log(JSON.stringify({
    version: "3.0.0",
    skill: {
      name: skillName,
      triggerKeywords: data.primaryKeywords.slice(0, 10),
      antiKeywords: data.antiKeywords,
      detectionPatterns: data.codePatterns.slice(0, 10),
    },
    tests: [
      {
        prompt: data.actionPhrases[0] ?? "(create test prompts using action phrases)",
        expected_skill: skillName,
        should_trigger: true,
        category: "category-name"
      }
    ]
  }, null, 2));
}
