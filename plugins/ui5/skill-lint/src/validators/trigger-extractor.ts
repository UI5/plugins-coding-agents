/**
 * Trigger Keyword Extractor
 * Analyzes skill content and suggests likely trigger keywords and phrases.
 * 
 * This validator READS the skill and SUGGESTS what would trigger it,
 * eliminating the need for manual trigger-cases.json creation.
 * 
 * Extraction strategy:
 * 1. Parse YAML description for domain-specific terms
 * 2. Scan body for technical keywords (code patterns, APIs, etc.)
 * 3. Extract action phrases ("Use when...", "Helps with...")
 * 4. Identify code patterns (import statements, API calls)
 * 5. Suggest anti-keywords based on common confusion domains
 */

import { BaseValidator } from './base-validator.js';
import { DESCRIPTION_SCORING } from '../utils/constants.js';
import type { ValidationResult, Violation, Skill, LintConfig } from '../types/index.js';

export class TriggerExtractor extends BaseValidator {
  readonly name = 'trigger-extractor';
  readonly description = 'Extracts and suggests likely trigger keywords from skill content';

  async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];

    // Extract keywords from different sources
    const primaryKeywords = this.extractPrimaryKeywords(skill);
    const secondaryKeywords = this.extractSecondaryKeywords(skill);
    const codePatterns = this.extractCodePatterns(skill.content);
    const actionPhrases = this.extractActionPhrases(skill.metadata.description);
    const antiKeywords = this.suggestAntiKeywords(primaryKeywords);

    // Report extracted keywords
    violations.push(this.createViolation('info', 'extracted-primary-keywords',
      `Primary keywords (${primaryKeywords.length}): ${primaryKeywords.slice(0, 20).join(', ')}${primaryKeywords.length > 20 ? '...' : ''}`,
      { 
        metadata: { 
          keywords: primaryKeywords,
          source: 'YAML description + critical terms from body'
        } 
      }
    ));

    if (secondaryKeywords.length > 0) {
      violations.push(this.createViolation('info', 'extracted-secondary-keywords',
        `Secondary keywords (${secondaryKeywords.length}): ${secondaryKeywords.slice(0, 15).join(', ')}${secondaryKeywords.length > 15 ? '...' : ''}`,
        { 
          metadata: { 
            keywords: secondaryKeywords,
            source: 'Multi-word phrases from description and headings'
          } 
        }
      ));
    }

    if (codePatterns.length > 0) {
      violations.push(this.createViolation('info', 'extracted-code-patterns',
        `Code patterns (${codePatterns.length}): ${codePatterns.slice(0, 15).join(', ')}${codePatterns.length > 15 ? '...' : ''}`,
        { 
          metadata: { 
            patterns: codePatterns,
            source: 'Import statements, API calls, and code blocks'
          } 
        }
      ));
    }

    if (actionPhrases.length > 0) {
      violations.push(this.createViolation('info', 'extracted-action-phrases',
        `Action phrases (${actionPhrases.length}): ${actionPhrases.slice(0, 5).join('; ')}${actionPhrases.length > 5 ? '...' : ''}`,
        { 
          metadata: { 
            phrases: actionPhrases,
            source: 'Descriptions of what the skill does'
          } 
        }
      ));
    }

    if (antiKeywords.length > 0) {
      violations.push(this.createViolation('info', 'suggested-anti-keywords',
        `Anti-keywords (${antiKeywords.length}): ${antiKeywords.join(', ')}`,
        { 
          metadata: { 
            antiKeywords,
            source: 'Common confusion domains based on primary keywords'
          },
          suggestion: 'Use these to prevent false positive skill triggers'
        }
      ));
    }

    // Generate summary with actionable next steps
    const totalKeywords = primaryKeywords.length + secondaryKeywords.length;
    violations.push(this.createViolation('info', 'extraction-summary',
      `Extracted ${totalKeywords} keywords, ${codePatterns.length} code patterns, ${actionPhrases.length} action phrases, ${antiKeywords.length} anti-keywords`,
      { 
        suggestion: 'Use these to create or update test/fixtures/trigger-cases.json'
      }
    ));

    return this.buildResult(violations, start, {
      primaryKeywords: primaryKeywords.length,
      secondaryKeywords: secondaryKeywords.length,
      codePatterns: codePatterns.length,
      actionPhrases: actionPhrases.length,
      antiKeywords: antiKeywords.length,
      totalSuggestions: totalKeywords + codePatterns.length,
    });
  }

  /**
   * Extract primary keywords from description and critical terms
   * These are single words or short technical terms
   */
  private extractPrimaryKeywords(skill: Skill): string[] {
    const keywords = new Set<string>();
    const description = skill.metadata.description.toLowerCase();

    // 1. Extract from "Keywords:" section in description
    const keywordMatch = description.match(/keywords?:\s*([^\n]+)/i);
    if (keywordMatch) {
      const explicitKeywords = keywordMatch[1]
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      explicitKeywords.forEach(k => keywords.add(k));
    }

    // 2. Extract technical terms (words with dots, slashes, or uppercase)
    const technicalTerms = description.match(/\b[a-z]+\.[a-z.]+\b|\b[A-Z][a-zA-Z]+\b|\b[a-z]+\/[a-z\/]+\b/g) || [];
    technicalTerms.forEach(term => {
      if (term.length > 2 && !DESCRIPTION_SCORING.COMMON_WORDS.has(term.toLowerCase())) {
        keywords.add(term.toLowerCase());
      }
    });

    // 3. Extract domain-specific words (4+ chars, not common)
    const words = description.match(/\b[a-z]{4,}\b/gi) || [];
    words.forEach(word => {
      const lower = word.toLowerCase();
      if (!DESCRIPTION_SCORING.COMMON_WORDS.has(lower) && lower.length >= 4) {
        keywords.add(lower);
      }
    });

    // 4. Scan body for frequently mentioned terms (3+ occurrences)
    const bodyWords = skill.content.toLowerCase().match(/\b[a-z]{4,}\b/gi) || [];
    const frequency = new Map<string, number>();
    bodyWords.forEach(word => {
      const lower = word.toLowerCase();
      if (!DESCRIPTION_SCORING.COMMON_WORDS.has(lower)) {
        frequency.set(lower, (frequency.get(lower) || 0) + 1);
      }
    });
    
    Array.from(frequency.entries())
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20) // Top 20 most frequent
      .forEach(([word]) => keywords.add(word));

    return Array.from(keywords).sort();
  }

  /**
   * Extract secondary keywords (multi-word phrases)
   */
  private extractSecondaryKeywords(skill: Skill): string[] {
    const phrases = new Set<string>();
    const description = skill.metadata.description;

    // Extract 2-3 word technical phrases
    const multiWordPatterns = [
      /\b([a-z]+ (?:loading|binding|types?|integration|initialization|validation|handling|workflow))\b/gi,
      /\b((?:async|data|event|module|component|type) [a-z]+)\b/gi,
      /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g, // Capitalized phrases
    ];

    multiWordPatterns.forEach(pattern => {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) phrases.add(match[1].toLowerCase());
      }
    });

    // Extract from markdown headings in body
    const headingMatches = skill.content.matchAll(/^#+\s+(.+)$/gm);
    for (const match of headingMatches) {
      const heading = match[1].trim();
      // Skip generic headings
      if (!/^(overview|introduction|example|usage|note|why)$/i.test(heading) && heading.length < 50) {
        phrases.add(heading.toLowerCase());
      }
    }

    return Array.from(phrases).sort();
  }

  /**
   * Extract code patterns from code blocks
   */
  private extractCodePatterns(content: string): string[] {
    const patterns = new Set<string>();

    // Extract from code blocks
    const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
    
    codeBlocks.forEach(block => {
      // Import statements
      const imports = block.match(/(?:import|from|require)\s+["']([^"']+)["']/g) || [];
      imports.forEach(imp => {
        const match = imp.match(/["']([^"']+)["']/);
        if (match) patterns.add(match[1]);
      });

      // API calls (method names)
      const apiCalls = block.match(/\b[a-z][a-zA-Z]+\.[a-z][a-zA-Z]+(?:\.[a-z][a-zA-Z]+)*\b/g) || [];
      apiCalls.forEach(call => {
        if (call.length > 5) patterns.add(call);
      });

      // Class/type names with special characters
      const specialTypes = block.match(/\b[A-Z][a-zA-Z]*\$[A-Z][a-zA-Z]*\b/g) || [];
      specialTypes.forEach(type => patterns.add(type));
    });

    // Extract inline code
    const inlineCode = content.match(/`([^`]+)`/g) || [];
    inlineCode.forEach(code => {
      const cleaned = code.replace(/`/g, '').trim();
      if (cleaned.includes('.') || cleaned.includes('/') || cleaned.includes('$')) {
        if (cleaned.length > 3 && cleaned.length < 50) {
          patterns.add(cleaned);
        }
      }
    });

    return Array.from(patterns)
      .filter(p => p.length > 2)
      .sort()
      .slice(0, 30); // Limit to top 30
  }

  /**
   * Extract action phrases ("Use when...", "Helps with...")
   */
  private extractActionPhrases(description: string): string[] {
    const phrases: string[] = [];

    // Match patterns like "Use when...", "Helps with...", etc.
    const actionPatterns = [
      /(?:Use|Invoke|Call|Run|Apply)\s+(?:when|for|to)\s+([^.]+)/gi,
      /(?:Helps?|Assists?)\s+(?:with|in)\s+([^.]+)/gi,
      /(?:Covers?|Includes?|Provides?)\s+([^.]+)/gi,
      /(?:Validates?|Checks?|Ensures?|Enforces?)\s+([^.]+)/gi,
    ];

    actionPatterns.forEach(pattern => {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          const phrase = match[1].trim();
          if (phrase.length > 10 && phrase.length < 100) {
            phrases.push(phrase);
          }
        }
      }
    });

    return phrases.slice(0, 10); // Limit to 10 most relevant
  }

  /**
   * Suggest anti-keywords based on common confusion domains
   */
  private suggestAntiKeywords(primaryKeywords: string[]): string[] {
    const antiKeywords = new Set<string>();
    
    // Domain confusion mappings
    const confusionDomains: Record<string, string[]> = {
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
      
      // SAP/UI5 specific
      ui5: ['react', 'vue', 'angular'],
      sapui5: ['react', 'vue', 'angular'],
      odata: ['rest', 'graphql'],
      cap: ['express', 'nestjs'],
    };

    // Check if any primary keywords trigger confusion domains
    primaryKeywords.forEach(keyword => {
      const lower = keyword.toLowerCase();
      if (confusionDomains[lower]) {
        confusionDomains[lower].forEach(anti => antiKeywords.add(anti));
      }
    });

    // If UI5/SAP related, add common web framework anti-keywords
    const isUI5Related = primaryKeywords.some(k => 
      /ui5|sap|odata|fiori/i.test(k)
    );
    if (isUI5Related) {
      ['react', 'vue', 'angular', 'python', 'django', 'express'].forEach(k => 
        antiKeywords.add(k)
      );
    }

    return Array.from(antiKeywords).sort();
  }
}
