/**
 * Tests for Error Message Catalog
 */

import { describe, it, expect } from 'vitest';
import { STRUCTURE_ERRORS, PERFORMANCE_ERRORS, TRIGGERING_ERRORS, INTEGRATION_ERRORS, VALIDATOR_ERRORS, ERROR_CATALOGS } from '../../src/utils/error-messages.js';

describe('Error Message Catalog', () => {
  describe('Structure Errors', () => {
    it('should provide plugin.json error messages', () => {
      expect(STRUCTURE_ERRORS.pluginJsonExists().message).toContain('plugin.json');
      expect(STRUCTURE_ERRORS.pluginJsonExists().suggestion).toBeDefined();
      
      expect(STRUCTURE_ERRORS.pluginJsonParse().message).toContain('valid JSON');
      expect(STRUCTURE_ERRORS.pluginJsonName().message).toContain('name');
      expect(STRUCTURE_ERRORS.pluginJsonVersion().message).toContain('version');
      expect(STRUCTURE_ERRORS.pluginJsonSkills().message).toContain('skills');
    });

    it('should provide skill existence error', () => {
      const error = STRUCTURE_ERRORS.skillExists('/path/to/SKILL.md');
      expect(error.message).toContain('/path/to/SKILL.md');
    });

    it('should provide frontmatter error messages', () => {
      expect(STRUCTURE_ERRORS.frontmatterName().message).toContain('name');
      expect(STRUCTURE_ERRORS.frontmatterDescription().message).toContain('description');
      
      const lengthError = STRUCTURE_ERRORS.frontmatterDescriptionLength(30, 50);
      expect(lengthError.message).toContain('30');
      expect(lengthError.message).toContain('50');
      expect(lengthError.suggestion).toBeDefined();
    });

    it('should provide sections error', () => {
      const error = STRUCTURE_ERRORS.sectionsCount(1);
      expect(error.message).toContain('1');
      expect(error.message).toContain('section');
    });

    it('should provide broken link error', () => {
      const error = STRUCTURE_ERRORS.brokenLink('../missing.md');
      expect(error.message).toContain('../missing.md');
    });

    it('should provide README error messages', () => {
      expect(STRUCTURE_ERRORS.readmeExists().message).toContain('README');
      expect(STRUCTURE_ERRORS.readmeExists().suggestion).toBeDefined();
      
      const refError = STRUCTURE_ERRORS.readmeReferencesSkill('test-skill');
      expect(refError.message).toContain('test-skill');
    });

    it('should provide test fixtures error messages', () => {
      expect(STRUCTURE_ERRORS.triggerFixturesExist().message).toContain('trigger-cases.json');
      expect(STRUCTURE_ERRORS.triggerFixturesFormat().message).toContain('tests');
      
      const countError = STRUCTURE_ERRORS.triggerFixturesCount(5, 20);
      expect(countError.message).toContain('5');
      expect(countError.message).toContain('20');
    });

    it('should provide package.json error messages', () => {
      expect(STRUCTURE_ERRORS.packageJsonExists().message).toContain('package.json');
      expect(STRUCTURE_ERRORS.packageJsonTestScript().message).toContain('test');
      expect(STRUCTURE_ERRORS.packageJsonParse().message).toContain('valid JSON');
    });
  });

  describe('Performance Errors', () => {
    it('should provide skill size error messages', () => {
      expect(PERFORMANCE_ERRORS.skillEmpty().message).toContain('empty');
      
      const tooLarge = PERFORMANCE_ERRORS.skillTooLarge(800, 700);
      expect(tooLarge.message).toContain('800');
      expect(tooLarge.message).toContain('700');
      expect(tooLarge.suggestion).toBeDefined();
      
      const gettingLarge = PERFORMANCE_ERRORS.skillGettingLarge(600, 700);
      expect(gettingLarge.message).toContain('600');
      expect(gettingLarge.suggestion).toBeDefined();
    });

    it('should provide token budget error messages', () => {
      const tokenError = PERFORMANCE_ERRORS.tokenBudgetExceeded(5000, 4000);
      expect(tokenError.message).toContain('5000');
      expect(tokenError.message).toContain('4000');
      
      const contextError = PERFORMANCE_ERRORS.contextBudget(12000, 200000, 10000);
      expect(contextError.message).toContain('12000');
      expect(contextError.suggestion).toBeDefined();
    });

    it('should provide reference files message', () => {
      const error = PERFORMANCE_ERRORS.referenceFiles(2, ['guide.md', 'examples.md']);
      expect(error.message).toContain('2');
      expect(error.message).toContain('guide.md');
      expect(error.message).toContain('examples.md');
    });

    it('should provide README size error', () => {
      const error = PERFORMANCE_ERRORS.readmeTooLong(200, 150);
      expect(error.message).toContain('200');
      expect(error.message).toContain('150');
    });

    it('should provide duplicate content error', () => {
      const error = PERFORMANCE_ERRORS.duplicateCodeBlocks(3);
      expect(error.message).toContain('3');
      expect(error.suggestion).toBeDefined();
    });

    it('should provide fixture size error', () => {
      const error = PERFORMANCE_ERRORS.fixtureTooLarge(75, 50);
      expect(error.message).toContain('75');
      expect(error.message).toContain('50');
    });
  });

  describe('Triggering Errors', () => {
    it('should provide no test cases error', () => {
      const error = TRIGGERING_ERRORS.noTestCases();
      expect(error.message).toContain('No triggering test cases');
      expect(error.suggestion).toBeDefined();
    });

    it('should provide accuracy error messages', () => {
      const accuracyError = TRIGGERING_ERRORS.accuracyBelowThreshold(85, 90);
      expect(accuracyError.message).toContain('85');
      expect(accuracyError.message).toContain('90');
      expect(accuracyError.suggestion).toBeDefined();
      
      const positiveError = TRIGGERING_ERRORS.positiveAccuracyLow(75);
      expect(positiveError.message).toContain('75');
      expect(positiveError.suggestion).toBeDefined();
      
      const negativeError = TRIGGERING_ERRORS.negativeAccuracyLow(80);
      expect(negativeError.message).toContain('80');
      expect(negativeError.suggestion).toBeDefined();
    });

    it('should provide failed case error', () => {
      const error = TRIGGERING_ERRORS.failedCase('Test prompt for validation', true, false);
      expect(error.message).toContain('Test prompt');
      expect(error.message).toContain('trigger');
      expect(error.message).toContain('no trigger');
    });

    it('should truncate long prompts', () => {
      const longPrompt = 'x'.repeat(100);
      const error = TRIGGERING_ERRORS.failedCase(longPrompt, true, false);
      expect(error.message.length).toBeLessThan(longPrompt.length + 100);
      expect(error.message).toContain('...');
    });

    it('should provide simulation warning', () => {
      const error = TRIGGERING_ERRORS.simulationWarning();
      expect(error.message).toContain('simulation');
      expect(error.message).toContain('NOT how Claude decides');
      expect(error.suggestion).toBeDefined();
    });
  });

  describe('Integration Errors', () => {
    it('should provide no test cases error', () => {
      const error = INTEGRATION_ERRORS.noTestCases();
      expect(error.message).toContain('No integration test cases');
      expect(error.suggestion).toBeDefined();
    });

    it('should provide adapter error', () => {
      const error = INTEGRATION_ERRORS.adapterError('Connection timeout');
      expect(error.message).toContain('Connection timeout');
    });

    it('should provide accuracy error messages', () => {
      const criticalError = INTEGRATION_ERRORS.accuracyBelowCritical(65, 70);
      expect(criticalError.message).toContain('65');
      expect(criticalError.message).toContain('70');
      expect(criticalError.message).toContain('critical');
      expect(criticalError.suggestion).toBeDefined();
      
      const warningError = INTEGRATION_ERRORS.accuracyBelowWarning(85, 90);
      expect(warningError.message).toContain('85');
      expect(warningError.message).toContain('90');
    });

    it('should provide test case failed error', () => {
      const error = INTEGRATION_ERRORS.testCaseFailed('Test prompt', 'skill-a', 'skill-b');
      expect(error.message).toContain('Test prompt');
      expect(error.message).toContain('skill-a');
      expect(error.message).toContain('skill-b');
    });

    it('should handle null expected/actual values', () => {
      const error = INTEGRATION_ERRORS.testCaseFailed('Test prompt', null, 'skill-a');
      expect(error.message).toContain('none');
      expect(error.message).toContain('skill-a');
    });
  });

  describe('Validator Errors', () => {
    it('should provide validator crash error', () => {
      const error = VALIDATOR_ERRORS.validatorCrash('structure', 'Unexpected null pointer');
      expect(error.message).toContain('structure');
      expect(error.message).toContain('Unexpected null pointer');
      expect(error.suggestion).toBeDefined();
      expect(error.suggestion).toContain('bug');
    });
  });

  describe('Error Catalogs', () => {
    it('should export all catalogs', () => {
      expect(ERROR_CATALOGS.structure).toBe(STRUCTURE_ERRORS);
      expect(ERROR_CATALOGS.performance).toBe(PERFORMANCE_ERRORS);
      expect(ERROR_CATALOGS.triggering).toBe(TRIGGERING_ERRORS);
      expect(ERROR_CATALOGS.integration).toBe(INTEGRATION_ERRORS);
      expect(ERROR_CATALOGS.validator).toBe(VALIDATOR_ERRORS);
    });
  });

  describe('Consistent Formatting', () => {
    it('should have consistent message format', () => {
      // All messages should be strings
      expect(typeof STRUCTURE_ERRORS.pluginJsonExists().message).toBe('string');
      expect(typeof PERFORMANCE_ERRORS.skillEmpty().message).toBe('string');
      expect(typeof TRIGGERING_ERRORS.noTestCases().message).toBe('string');
    });

    it('should have optional suggestions', () => {
      // Some errors have suggestions
      const withSuggestion = STRUCTURE_ERRORS.pluginJsonExists();
      expect(withSuggestion.suggestion).toBeDefined();
      expect(typeof withSuggestion.suggestion).toBe('string');
      
      // Some don't
      const withoutSuggestion = STRUCTURE_ERRORS.pluginJsonParse();
      expect(withoutSuggestion.suggestion).toBeUndefined();
    });

    it('should return consistent error objects', () => {
      const error = PERFORMANCE_ERRORS.skillEmpty();
      expect(error).toHaveProperty('message');
      expect(typeof error.message).toBe('string');
      expect(error.message.length).toBeGreaterThan(0);
    });
  });
});
