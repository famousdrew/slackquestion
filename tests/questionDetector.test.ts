/**
 * Tests for Question Detector Service
 */
import { describe, test, expect } from '@jest/globals';
import { isQuestion, extractKeywords } from '../src/services/questionDetector.js';

describe('isQuestion', () => {
  describe('questions with question marks', () => {
    test('detects simple questions', () => {
      expect(isQuestion('How do I reset my password?')).toBe(true);
      expect(isQuestion('Where is the documentation?')).toBe(true);
      expect(isQuestion('What is the API key?')).toBe(true);
    });

    test('detects questions with multiple sentences', () => {
      expect(isQuestion('I need help. How do I reset my password?')).toBe(true);
      expect(isQuestion('This is broken. Can someone help?')).toBe(true);
    });
  });

  describe('questions without question marks', () => {
    test('detects questions starting with question words', () => {
      expect(isQuestion('Does anyone know how to fix this')).toBe(true);
      expect(isQuestion('Can someone help me')).toBe(true);
      expect(isQuestion('Could you explain this')).toBe(true);
      expect(isQuestion('Would it be possible to')).toBe(true);
    });

    test('detects questions with "anyone know"', () => {
      expect(isQuestion('Does anyone know the answer')).toBe(true);
      expect(isQuestion('anyone know where the docs are')).toBe(true);
    });

    test('detects help requests', () => {
      expect(isQuestion('Need help with deployment')).toBe(true);
      expect(isQuestion('I need help understanding this')).toBe(true);
    });
  });

  describe('statements (not questions)', () => {
    test('rejects simple statements', () => {
      expect(isQuestion('I reset my password')).toBe(false);
      expect(isQuestion('Here is the answer')).toBe(false);
      expect(isQuestion('The documentation is updated')).toBe(false);
    });

    test('rejects commands', () => {
      expect(isQuestion('Please update the docs')).toBe(false);
      expect(isQuestion('Deploy to production')).toBe(false);
    });

    test('rejects greetings', () => {
      expect(isQuestion('Hello everyone')).toBe(false);
      expect(isQuestion('Good morning')).toBe(false);
      expect(isQuestion('Thanks')).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('handles empty or invalid input', () => {
      expect(isQuestion('')).toBe(false);
      expect(isQuestion('   ')).toBe(false);
      expect(isQuestion('?')).toBe(false);
      expect(isQuestion('???')).toBe(false);
    });

    test('handles very short input', () => {
      expect(isQuestion('a')).toBe(false);
      expect(isQuestion('ok')).toBe(false);
    });

    test('case insensitive detection', () => {
      expect(isQuestion('HOW DO I RESET MY PASSWORD?')).toBe(true);
      expect(isQuestion('how do i reset my password?')).toBe(true);
    });
  });
});

describe('extractKeywords', () => {
  describe('keyword extraction', () => {
    test('extracts meaningful words', () => {
      const keywords = extractKeywords('How do I reset my password?');

      expect(keywords).toContain('reset');
      expect(keywords).toContain('password');
    });

    test('removes stop words', () => {
      const keywords = extractKeywords('How do I reset my password?');

      // Common stop words should be removed
      expect(keywords).not.toContain('how');
      expect(keywords).not.toContain('do');
      expect(keywords).not.toContain('i');
      expect(keywords).not.toContain('my');
    });

    test('converts to lowercase', () => {
      const keywords = extractKeywords('How do I RESET my PASSWORD?');

      expect(keywords).toContain('reset');
      expect(keywords).toContain('password');
      expect(keywords).not.toContain('RESET');
      expect(keywords).not.toContain('PASSWORD');
    });

    test('limits to top keywords', () => {
      const text = 'authentication authorization deployment configuration database server client network';
      const keywords = extractKeywords(text);

      // Should limit to reasonable number (typically 5-10)
      expect(keywords.length).toBeLessThanOrEqual(10);
    });
  });

  describe('edge cases', () => {
    test('handles empty input', () => {
      const keywords = extractKeywords('');

      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBe(0);
    });

    test('handles very short input', () => {
      const keywords = extractKeywords('ok');

      expect(Array.isArray(keywords)).toBe(true);
    });

    test('handles punctuation', () => {
      const keywords = extractKeywords('password, authentication, and deployment!');

      expect(keywords).toContain('password');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('deployment');
    });

    test('handles repeated words', () => {
      const keywords = extractKeywords('password password password reset');

      expect(keywords).toContain('password');
      expect(keywords).toContain('reset');
    });
  });

  describe('real-world examples', () => {
    test('technical support question', () => {
      const keywords = extractKeywords(
        'How do I configure authentication for the production deployment?'
      );

      expect(keywords).toContain('configure');
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('production');
      expect(keywords).toContain('deployment');
    });

    test('troubleshooting question', () => {
      const keywords = extractKeywords(
        'The database connection keeps timing out on the staging server'
      );

      expect(keywords).toContain('database');
      expect(keywords).toContain('connection');
      expect(keywords).toContain('timing');
      expect(keywords).toContain('staging');
      expect(keywords).toContain('server');
    });
  });
});
