/**
 * Tests for Input Sanitization Utilities
 */
import { describe, test, expect } from '@jest/globals';
import {
  sanitizeDisplayName,
  sanitizeChannelName,
  sanitizeMessageText,
  sanitizeSlackId,
  sanitizeEmail,
  sanitizeNumber,
} from '../src/utils/sanitize.js';

describe('sanitizeDisplayName', () => {
  describe('normal names', () => {
    test('allows standard names', () => {
      expect(sanitizeDisplayName('Drew Clark')).toBe('Drew Clark');
      expect(sanitizeDisplayName('John Smith')).toBe('John Smith');
      expect(sanitizeDisplayName('María García')).toBe('María García');
    });

    test('allows names with apostrophes', () => {
      expect(sanitizeDisplayName("John O'Brien")).toBe("John O'Brien");
      expect(sanitizeDisplayName("Mary O'Connor")).toBe("Mary O'Connor");
    });

    test('allows names with hyphens', () => {
      expect(sanitizeDisplayName('Jean-Claude')).toBe('Jean-Claude');
      expect(sanitizeDisplayName('Anne-Marie')).toBe('Anne-Marie');
    });

    test('allows names with dots', () => {
      expect(sanitizeDisplayName('Dr. Smith')).toBe('Dr. Smith');
      expect(sanitizeDisplayName('J.R.R. Tolkien')).toBe('J.R.R. Tolkien');
    });
  });

  describe('dangerous input', () => {
    test('removes SQL injection attempts', () => {
      const result = sanitizeDisplayName("Drew'; DROP TABLE users;--");

      expect(result).not.toContain(';');
      expect(result).not.toContain('--');
      expect(result).toContain('Drew');
    });

    test('removes script tags', () => {
      const result = sanitizeDisplayName('Drew<script>alert("xss")</script>');

      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('Drew');
    });

    test('removes special characters', () => {
      const result = sanitizeDisplayName('Drew@#$%^&*()');

      expect(result).toBe('Drew');
    });
  });

  describe('length limits', () => {
    test('limits length to 100 characters', () => {
      const longName = 'A'.repeat(200);
      const result = sanitizeDisplayName(longName);

      expect(result.length).toBeLessThanOrEqual(100);
    });

    test('preserves names under 100 characters', () => {
      const name = 'A'.repeat(50);
      const result = sanitizeDisplayName(name);

      expect(result).toBe(name);
    });
  });

  describe('edge cases', () => {
    test('handles empty input', () => {
      expect(sanitizeDisplayName('')).toBe('');
    });

    test('handles whitespace-only input', () => {
      expect(sanitizeDisplayName('   ')).toBe('');
    });

    test('handles null/undefined', () => {
      expect(sanitizeDisplayName(null as any)).toBe('');
      expect(sanitizeDisplayName(undefined as any)).toBe('');
    });

    test('trims whitespace', () => {
      expect(sanitizeDisplayName('  Drew Clark  ')).toBe('Drew Clark');
    });
  });
});

describe('sanitizeChannelName', () => {
  test('allows valid channel names', () => {
    expect(sanitizeChannelName('general')).toBe('general');
    expect(sanitizeChannelName('random')).toBe('random');
    expect(sanitizeChannelName('tech-support')).toBe('tech-support');
  });

  test('converts to lowercase', () => {
    expect(sanitizeChannelName('General')).toBe('general');
    expect(sanitizeChannelName('RANDOM')).toBe('random');
  });

  test('allows hyphens and underscores', () => {
    expect(sanitizeChannelName('tech-support')).toBe('tech-support');
    expect(sanitizeChannelName('tech_support')).toBe('tech_support');
  });

  test('removes invalid characters', () => {
    expect(sanitizeChannelName('tech support')).toBe('techsupport');
    expect(sanitizeChannelName('tech@support')).toBe('techsupport');
    expect(sanitizeChannelName('tech#support')).toBe('techsupport');
  });

  test('limits length to 80 characters', () => {
    const longName = 'a'.repeat(100);
    const result = sanitizeChannelName(longName);

    expect(result.length).toBeLessThanOrEqual(80);
  });

  test('handles empty input', () => {
    expect(sanitizeChannelName('')).toBe('');
  });
});

describe('sanitizeMessageText', () => {
  test('preserves normal text', () => {
    const text = 'How do I reset my password?';
    expect(sanitizeMessageText(text)).toBe(text);
  });

  test('limits length to 5000 characters by default', () => {
    const longText = 'A'.repeat(10000);
    const result = sanitizeMessageText(longText);

    expect(result.length).toBe(5000);
  });

  test('respects custom max length', () => {
    const text = 'A'.repeat(1000);
    const result = sanitizeMessageText(text, 100);

    expect(result.length).toBe(100);
  });

  test('trims whitespace', () => {
    expect(sanitizeMessageText('  Hello  ')).toBe('Hello');
  });

  test('handles empty input', () => {
    expect(sanitizeMessageText('')).toBe('');
  });
});

describe('sanitizeSlackId', () => {
  describe('user IDs', () => {
    test('validates correct user IDs', () => {
      expect(sanitizeSlackId('U123ABC456', 'user')).toBe('U123ABC456');
      expect(sanitizeSlackId('W987XYZ123', 'user')).toBe('W987XYZ123');
    });

    test('rejects invalid user IDs', () => {
      expect(sanitizeSlackId('invalid', 'user')).toBeNull();
      expect(sanitizeSlackId('123', 'user')).toBeNull();
      expect(sanitizeSlackId('C123ABC', 'user')).toBeNull(); // Wrong prefix
    });
  });

  describe('channel IDs', () => {
    test('validates correct channel IDs', () => {
      expect(sanitizeSlackId('C123ABC456', 'channel')).toBe('C123ABC456');
      expect(sanitizeSlackId('G987XYZ123', 'channel')).toBe('G987XYZ123');
    });

    test('rejects invalid channel IDs', () => {
      expect(sanitizeSlackId('invalid', 'channel')).toBeNull();
      expect(sanitizeSlackId('U123ABC', 'channel')).toBeNull(); // Wrong prefix
    });
  });

  describe('team IDs', () => {
    test('validates correct team IDs', () => {
      expect(sanitizeSlackId('T123ABC456', 'team')).toBe('T123ABC456');
    });

    test('rejects invalid team IDs', () => {
      expect(sanitizeSlackId('invalid', 'team')).toBeNull();
      expect(sanitizeSlackId('U123ABC', 'team')).toBeNull();
    });
  });

  describe('message IDs', () => {
    test('validates correct message timestamps', () => {
      expect(sanitizeSlackId('1234567890.123456', 'message')).toBe('1234567890.123456');
    });

    test('rejects invalid message IDs', () => {
      expect(sanitizeSlackId('invalid', 'message')).toBeNull();
      expect(sanitizeSlackId('123', 'message')).toBeNull();
    });
  });

  test('trims whitespace', () => {
    expect(sanitizeSlackId('  U123ABC456  ', 'user')).toBe('U123ABC456');
  });

  test('handles empty input', () => {
    expect(sanitizeSlackId('', 'user')).toBeNull();
  });
});

describe('sanitizeEmail', () => {
  test('validates correct emails', () => {
    expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
    expect(sanitizeEmail('test.user@company.co.uk')).toBe('test.user@company.co.uk');
    expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
  });

  test('converts to lowercase', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  test('rejects invalid emails', () => {
    expect(sanitizeEmail('invalid')).toBeNull();
    expect(sanitizeEmail('invalid@')).toBeNull();
    expect(sanitizeEmail('@example.com')).toBeNull();
    expect(sanitizeEmail('user@')).toBeNull();
  });

  test('rejects emails that are too long', () => {
    const longEmail = 'a'.repeat(300) + '@example.com';
    expect(sanitizeEmail(longEmail)).toBeNull();
  });

  test('trims whitespace', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  test('handles empty input', () => {
    expect(sanitizeEmail('')).toBeNull();
  });
});

describe('sanitizeNumber', () => {
  test('parses valid numbers', () => {
    expect(sanitizeNumber('42', 0, 100, 50)).toBe(42);
    expect(sanitizeNumber(42, 0, 100, 50)).toBe(42);
  });

  test('enforces minimum value', () => {
    expect(sanitizeNumber('-10', 0, 100, 50)).toBe(0);
    expect(sanitizeNumber(-10, 0, 100, 50)).toBe(0);
  });

  test('enforces maximum value', () => {
    expect(sanitizeNumber('150', 0, 100, 50)).toBe(100);
    expect(sanitizeNumber(150, 0, 100, 50)).toBe(100);
  });

  test('returns default for invalid input', () => {
    expect(sanitizeNumber('invalid', 0, 100, 50)).toBe(50);
    expect(sanitizeNumber('', 0, 100, 50)).toBe(50);
    expect(sanitizeNumber(NaN, 0, 100, 50)).toBe(50);
  });

  test('accepts values within range', () => {
    expect(sanitizeNumber('75', 0, 100, 50)).toBe(75);
    expect(sanitizeNumber('0', 0, 100, 50)).toBe(0);
    expect(sanitizeNumber('100', 0, 100, 50)).toBe(100);
  });
});
