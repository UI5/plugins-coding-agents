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
import { TriggerExtractor } from '../../validators/trigger-extractor.js';
import { loadSkill } from '../../utils/file-utils.js';
import { Logger } from '../../utils/logger.js';
import { DEFAULT_CONFIG } from '../../config/schema.js';

export interface AnalyzeOptions {
  output?: string;
  format?: string;
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
    
    // Run extractor
    const extractor = new TriggerExtractor();
    const result = await extractor.validate(skill, DEFAULT_CONFIG);
    
    // Display results
    console.log(`\n📊 Trigger Keyword Analysis for "${skill.metadata.name}"\n`);
    console.log('=' .repeat(70));
    
    result.violations.forEach(v => {
      if (v.rule === 'extracted-primary-keywords') {
        console.log(`\n✨ ${v.message}`);
      } else if (v.rule === 'extracted-secondary-keywords') {
        console.log(`\n🔤 ${v.message}`);
      } else if (v.rule === 'extracted-code-patterns') {
        console.log(`\n⚙️  ${v.message}`);
      } else if (v.rule === 'extracted-action-phrases') {
        console.log(`\n🎯 ${v.message}`);
      } else if (v.rule === 'suggested-anti-keywords') {
        console.log(`\n🚫 ${v.message}`);
        if (v.metadata?.suggestion) {
          console.log(`   💡 ${v.metadata.suggestion}`);
        }
      } else if (v.rule === 'extraction-summary') {
        console.log(`\n${'='.repeat(70)}`);
        console.log(`📈 ${v.message}`);
        if (v.metadata?.suggestion) {
          console.log(`💡 ${v.metadata.suggestion}`);
        }
      }
    });
    
    // Show example usage
    console.log(`\n\n💾 Example trigger-cases.json structure:\n`);
    console.log(JSON.stringify({
      version: "3.0.0",
      skill: {
        name: skill.metadata.name,
        triggerKeywords: "(use extracted primary keywords here)",
        antiKeywords: "(use suggested anti-keywords here)",
        detectionPatterns: "(use code patterns here)",
      },
      tests: [
        {
          prompt: "(create test prompts using action phrases)",
          expected_skill: skill.metadata.name,
          should_trigger: true,
          category: "category-name"
        }
      ]
    }, null, 2));
    
    Logger.success(`\nAnalysis complete! Duration: ${result.duration}ms\n`);
    
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    Logger.error(`Analysis failed: ${message}`);
    return 2;
  }
}
