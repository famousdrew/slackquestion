/**
 * Retry Utility with Exponential Backoff
 * Handles transient failures and rate limiting for external API calls
 */
import { logger } from './logger.js';

export interface RetryOptions {
  maxAttempts?: number;           // Default: 3
  initialDelayMs?: number;        // Default: 1000ms
  maxDelayMs?: number;            // Default: 30000ms (30s)
  backoffMultiplier?: number;     // Default: 2 (exponential)
  shouldRetry?: (error: any) => boolean; // Custom retry logic
}

interface RetryMetadata {
  attempt: number;
  maxAttempts: number;
  delayMs: number;
  error: string;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  shouldRetry: () => true,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Check if error is retriable
 */
function isRetriableError(error: any): boolean {
  // Slack-specific errors
  if (error?.data?.error) {
    const slackError = error.data.error;

    // Always retry these Slack errors
    const retriableSlackErrors = [
      'rate_limited',
      'timeout',
      'service_unavailable',
      'internal_error',
      'fatal_error',
    ];

    if (retriableSlackErrors.includes(slackError)) {
      return true;
    }

    // Don't retry these Slack errors
    const nonRetriableSlackErrors = [
      'invalid_auth',
      'account_inactive',
      'token_revoked',
      'not_authed',
      'invalid_arg_name',
      'invalid_array_arg',
      'invalid_charset',
      'invalid_form_data',
      'invalid_post_type',
      'missing_post_type',
      'channel_not_found',
      'user_not_found',
    ];

    if (nonRetriableSlackErrors.includes(slackError)) {
      return false;
    }
  }

  // HTTP status codes
  if (error?.status || error?.statusCode) {
    const status = error.status || error.statusCode;

    // Retry on server errors (5xx)
    if (status >= 500 && status < 600) {
      return true;
    }

    // Retry on 429 (rate limit)
    if (status === 429) {
      return true;
    }

    // Don't retry client errors (4xx except 429)
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Network errors are retriable
  if (error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.code === 'ECONNREFUSED' ||
      error?.code === 'ENOTFOUND') {
    return true;
  }

  // Default to retriable for unknown errors
  return true;
}

/**
 * Extract Retry-After header from Slack rate limit response
 */
function getRetryAfter(error: any): number | null {
  // Slack includes retry_after in seconds
  if (error?.data?.retry_after) {
    return error.data.retry_after * 1000; // Convert to ms
  }

  // HTTP Retry-After header
  if (error?.response?.headers?.['retry-after']) {
    const retryAfter = error.response.headers['retry-after'];
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to ms
    }
  }

  return null;
}

/**
 * Retry an async function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @param context - Optional context for logging (e.g., 'slack.chat.postMessage')
 * @returns Promise with the result of fn
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  context?: string
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  // Check if user provided custom shouldRetry function
  const hasCustomShouldRetry = options.shouldRetry !== undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Try the function
      const result = await fn();

      // Log success if we had to retry
      if (attempt > 1) {
        logger.info('Retry succeeded', {
          context,
          attempt,
          totalAttempts: attempt,
        });
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      // If custom shouldRetry is provided, it has final say
      // Otherwise, use both custom (if any) AND built-in isRetriableError
      const shouldRetry = hasCustomShouldRetry
        ? opts.shouldRetry(error)
        : opts.shouldRetry(error) && isRetriableError(error);

      // If this is the last attempt or error is not retriable, throw
      if (attempt >= opts.maxAttempts || !shouldRetry) {
        logger.error('Retry exhausted or non-retriable error', {
          context,
          attempt,
          maxAttempts: opts.maxAttempts,
          retriable: shouldRetry,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      // Calculate delay (respect Retry-After if present)
      const retryAfter = getRetryAfter(error);
      const calculatedDelay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      );
      const delayMs = retryAfter || calculatedDelay;

      // Log retry attempt
      const errorCode = (error as any)?.code || (error as any)?.data?.error;
      logger.warn('Retrying after error', {
        context,
        attempt,
        maxAttempts: opts.maxAttempts,
        delayMs,
        error: error instanceof Error ? error.message : String(error),
        errorCode,
      });

      // Wait before retrying
      await sleep(delayMs);
    }
  }

  // This should never be reached due to throw in loop, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retry wrapper with custom options
 * Useful for creating service-specific retry functions
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(fn: () => Promise<T>, context?: string): Promise<T> => {
    return withRetry(fn, defaultOptions, context);
  };
}

/**
 * Slack-specific retry wrapper with optimized settings
 */
export const withSlackRetry = createRetryWrapper({
  maxAttempts: 4,          // Slack can have temporary issues
  initialDelayMs: 1000,    // Start with 1 second
  maxDelayMs: 60000,       // Max 60 seconds
  backoffMultiplier: 2,    // Exponential backoff
});

/**
 * Database-specific retry wrapper with optimized settings
 */
export const withDatabaseRetry = createRetryWrapper({
  maxAttempts: 3,          // Fewer retries for DB
  initialDelayMs: 500,     // Faster initial retry
  maxDelayMs: 5000,        // Max 5 seconds
  backoffMultiplier: 2,
});
