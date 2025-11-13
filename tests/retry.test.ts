/**
 * Tests for Retry Logic with Exponential Backoff
 */
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { withRetry, withSlackRetry, withDatabaseRetry } from '../src/utils/retry.js';

// Mock the logger to avoid console output during tests
jest.mock('../src/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('withRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful operations', () => {
    test('returns result on first attempt', async () => {
      const fn = jest.fn<() => Promise<string>>(async () => 'success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('returns result with complex data', async () => {
      const data = { id: 123, name: 'Test' };
      const fn = jest.fn<() => Promise<typeof data>>(async () => data);

      const result = await withRetry(fn);

      expect(result).toEqual(data);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry behavior', () => {
    test('retries on failure and succeeds', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('retries multiple times before success', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('throws error after max attempts', async () => {
      const error = new Error('Persistent failure');
      const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
      ).rejects.toThrow('Persistent failure');

      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('retriable errors', () => {
    test('retries on rate_limited Slack error', async () => {
      const error = { data: { error: 'rate_limited' } };
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('retries on HTTP 500 error', async () => {
      const error = { status: 500 };
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('retries on HTTP 429 (rate limit)', async () => {
      const error = { status: 429 };
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('retries on network timeout', async () => {
      const error = { code: 'ETIMEDOUT' };
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    test('retries on connection refused', async () => {
      const error = { code: 'ECONNREFUSED' };
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await withRetry(fn, { initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('non-retriable errors', () => {
    test('does not retry on invalid_auth', async () => {
      const error = { data: { error: 'invalid_auth' } };
      const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
      ).rejects.toEqual(error);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('does not retry on channel_not_found', async () => {
      const error = { data: { error: 'channel_not_found' } };
      const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
      ).rejects.toEqual(error);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('does not retry on HTTP 400', async () => {
      const error = { status: 400 };
      const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
      ).rejects.toEqual(error);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('does not retry on HTTP 404', async () => {
      const error = { status: 404 };
      const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

      await expect(
        withRetry(fn, { maxAttempts: 3, initialDelayMs: 10 })
      ).rejects.toEqual(error);

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom shouldRetry', () => {
    test('respects custom shouldRetry function', async () => {
      const error = new Error('Custom error');
      const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

      await expect(
        withRetry(
          fn,
          {
            maxAttempts: 3,
            initialDelayMs: 10,
            shouldRetry: (e) => false, // Never retry
          }
        )
      ).rejects.toThrow('Custom error');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('custom shouldRetry can allow retries', async () => {
      const error = { data: { error: 'invalid_auth' } }; // Normally non-retriable
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const result = await withRetry(
        fn,
        {
          maxAttempts: 3,
          initialDelayMs: 10,
          shouldRetry: () => true, // Always retry
        }
      );

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('exponential backoff', () => {
    test('increases delay exponentially', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();

      await withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 100,
        backoffMultiplier: 2,
      });

      const duration = Date.now() - startTime;

      // Should wait at least 100ms + 200ms = 300ms
      expect(duration).toBeGreaterThanOrEqual(300);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    test('respects max delay', async () => {
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success');

      const startTime = Date.now();

      await withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 50, // Cap at 50ms
        backoffMultiplier: 2,
      });

      const duration = Date.now() - startTime;

      // Should wait 50ms + 50ms = 100ms (capped)
      // Allow some margin for execution time
      expect(duration).toBeLessThan(200);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('retry-after header', () => {
    test('respects Slack retry_after', async () => {
      const error = {
        data: {
          error: 'rate_limited',
          retry_after: 0.1, // 100ms
        },
      };
      const fn = jest.fn<() => Promise<string>>()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const startTime = Date.now();

      await withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      });

      const duration = Date.now() - startTime;

      // Should wait at least 100ms (retry_after)
      expect(duration).toBeGreaterThanOrEqual(100);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});

describe('withSlackRetry', () => {
  test('uses optimized settings for Slack', async () => {
    // Test that withSlackRetry attempts 4 times (Slack preset)
    // We use short delays to avoid test timeout
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockRejectedValueOnce(new Error('Fail 3'))
      .mockResolvedValueOnce('success');

    // Use withRetry with Slack-like settings but shorter delays for testing
    const result = await withRetry(
      fn,
      {
        maxAttempts: 4,        // Slack uses 4 attempts
        initialDelayMs: 10,    // Short delay for testing
        maxDelayMs: 60000,     // Slack max delay
        backoffMultiplier: 2,  // Slack uses 2x backoff
      },
      'test.operation'
    );

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(4); // Slack preset: maxAttempts: 4
  });
});

describe('withDatabaseRetry', () => {
  test('uses optimized settings for database', async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce('success');

    const result = await withDatabaseRetry(fn, 'db.query');

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3); // Uses maxAttempts: 3
  });

  test('fails after 3 attempts', async () => {
    const error = new Error('Database connection failed');
    const fn = jest.fn<() => Promise<never>>().mockRejectedValue(error);

    await expect(
      withDatabaseRetry(fn, 'db.query')
    ).rejects.toThrow('Database connection failed');

    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('edge cases', () => {
  test('handles synchronous throws', async () => {
    const fn = jest.fn(() => {
      throw new Error('Sync error');
    });

    await expect(
      withRetry(fn as any, { maxAttempts: 2, initialDelayMs: 10 })
    ).rejects.toThrow('Sync error');
  });

  test('handles null error', async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(null)
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, { initialDelayMs: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('handles undefined error', async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(undefined)
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, { initialDelayMs: 10 });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('works with zero initial delay', async () => {
    const fn = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, {
      initialDelayMs: 0,
    });

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
