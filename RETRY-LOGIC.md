# Retry Logic Guide

## Overview

The Slack Question Router includes sophisticated retry logic with exponential backoff to handle transient failures and rate limiting gracefully.

---

## Features

✅ **Exponential Backoff** - Increases delay between retries (1s, 2s, 4s, 8s...)
✅ **Slack-Specific** - Handles Slack API errors intelligently
✅ **Rate Limit Aware** - Respects `Retry-After` headers
✅ **Configurable** - Customize attempts, delays, and backoff
✅ **Smart Detection** - Distinguishes retriable vs. non-retriable errors
✅ **Comprehensive Logging** - Tracks all retry attempts

---

## Configuration

### Environment Variables

```bash
# .env
MAX_RETRY_ATTEMPTS=4           # Default: 4
RETRY_INITIAL_DELAY_MS=1000    # Default: 1000ms (1 second)
RETRY_MAX_DELAY_MS=60000       # Default: 60000ms (60 seconds)
```

---

## Usage

### Basic Retry

```typescript
import { withRetry } from './utils/retry.js';

// Wrap any async function
const result = await withRetry(
  async () => {
    return await someApiCall();
  },
  {
    maxAttempts: 3,
    initialDelayMs: 1000,
  },
  'myOperation' // Context for logging
);
```

### Slack API Retry

```typescript
import { withSlackRetry } from './utils/retry.js';

// Optimized for Slack API calls
const result = await withSlackRetry(
  () => client.chat.postMessage({
    channel: 'C123',
    text: 'Hello!',
  }),
  'slack.chat.postMessage'
);
```

### Database Retry

```typescript
import { withDatabaseRetry } from './utils/retry.js';

// Optimized for database calls
const user = await withDatabaseRetry(
  () => prisma.user.findUnique({ where: { id: 'user-123' } }),
  'database.findUser'
);
```

### Custom Retry Logic

```typescript
import { withRetry } from './utils/retry.js';

const result = await withRetry(
  async () => {
    return await fetchData();
  },
  {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    shouldRetry: (error) => {
      // Custom logic to determine if error is retriable
      return error.code !== 'FATAL_ERROR';
    },
  },
  'fetchData'
);
```

---

## How It Works

### Exponential Backoff

Retry delays increase exponentially to avoid overwhelming services:

```
Attempt 1: 1000ms
Attempt 2: 2000ms
Attempt 3: 4000ms
Attempt 4: 8000ms
```

### Retriable vs. Non-Retriable Errors

**Automatically Retries:**
- ✅ `rate_limited` - Slack rate limits
- ✅ `timeout` - Network timeouts
- ✅ `service_unavailable` - Temporary service issues
- ✅ `internal_error` - Slack internal errors
- ✅ HTTP 5xx errors - Server errors
- ✅ HTTP 429 - Too many requests
- ✅ Network errors (ECONNRESET, ETIMEDOUT, etc.)

**Never Retries:**
- ❌ `invalid_auth` - Bad credentials
- ❌ `token_revoked` - Expired tokens
- ❌ `channel_not_found` - Missing resources
- ❌ `user_not_found` - Missing users
- ❌ HTTP 4xx errors (except 429) - Client errors

### Rate Limit Handling

When Slack returns `rate_limited`, the retry logic:
1. Extracts the `retry_after` value from the response
2. Waits the specified time before retrying
3. Logs the rate limit event

```typescript
// Slack says wait 30 seconds
{
  "ok": false,
  "error": "rate_limited",
  "retry_after": 30
}

// Our retry logic automatically waits 30 seconds
```

---

## Preset Wrappers

### withSlackRetry

Optimized for Slack API calls:
- **Max Attempts:** 4
- **Initial Delay:** 1000ms
- **Max Delay:** 60000ms (60s)
- **Backoff:** Exponential (2x)

```typescript
import { withSlackRetry } from './utils/retry.js';

await withSlackRetry(
  () => client.reactions.add({
    channel: 'C123',
    timestamp: '1234.5678',
    name: 'thumbsup',
  }),
  'slack.reactions.add'
);
```

### withDatabaseRetry

Optimized for database calls:
- **Max Attempts:** 3
- **Initial Delay:** 500ms
- **Max Delay:** 5000ms (5s)
- **Backoff:** Exponential (2x)

```typescript
import { withDatabaseRetry } from './utils/retry.js';

await withDatabaseRetry(
  () => prisma.question.create({ data: { ... } }),
  'database.createQuestion'
);
```

---

## Logging

### Successful Retry

```
2025-11-13 14:23:45 [warn] Retrying after error {
  "context": "slack.chat.postMessage",
  "attempt": 1,
  "maxAttempts": 4,
  "delayMs": 1000,
  "error": "rate_limited",
  "errorCode": "rate_limited"
}

2025-11-13 14:23:46 [info] Retry succeeded {
  "context": "slack.chat.postMessage",
  "attempt": 2,
  "totalAttempts": 2
}
```

### Failed After Retries

```
2025-11-13 14:23:50 [error] Retry exhausted or non-retriable error {
  "context": "slack.chat.postMessage",
  "attempt": 4,
  "maxAttempts": 4,
  "retriable": true,
  "error": "service_unavailable"
}
```

---

## Examples from the Codebase

### Wrapping Slack Client

You can wrap the entire Slack client to add retry logic to all API calls:

```typescript
import { createResilientSlackClient } from './utils/slackClient.js';

// Wrap the Slack client
const resilientClient = createResilientSlackClient(app.client);

// Now all API calls automatically retry
await resilientClient.chat.postMessage({ ... });
await resilientClient.reactions.add({ ... });
await resilientClient.users.info({ ... });
```

### Manual Wrapping (More Control)

For specific calls where you need custom retry logic:

```typescript
import { withSlackRetry } from './utils/retry.js';

// Escalation message with retry
await withSlackRetry(
  () => app.client.chat.postMessage({
    channel: channelId,
    thread_ts: messageTs,
    text: `⚠️ This question needs attention! @${userGroup}`,
  }),
  'escalation.postToThread'
);
```

---

## Best Practices

### 1. Always Provide Context

```typescript
// ✅ Good - Clear context for debugging
await withSlackRetry(
  () => client.chat.postMessage({ ... }),
  'escalation.level1.postThread'
);

// ❌ Bad - No context
await withSlackRetry(() => client.chat.postMessage({ ... }));
```

### 2. Use Appropriate Wrapper

```typescript
// ✅ Good - Use Slack wrapper for Slack calls
await withSlackRetry(() => client.chat.postMessage({ ... }));

// ✅ Good - Use DB wrapper for database calls
await withDatabaseRetry(() => prisma.question.create({ ... }));

// ❌ Bad - Using wrong wrapper
await withDatabaseRetry(() => client.chat.postMessage({ ... }));
```

### 3. Don't Retry User Errors

```typescript
// ✅ Good - Let user errors fail immediately
await withRetry(
  () => processInput(userInput),
  {
    shouldRetry: (error) => {
      // Don't retry validation errors
      if (error.code === 'VALIDATION_ERROR') return false;
      return true;
    },
  }
);
```

### 4. Consider Total Timeout

```typescript
// Be aware of total time spent retrying
// 4 attempts with exponential backoff:
// 1s + 2s + 4s + 8s = 15 seconds total

// For time-sensitive operations, reduce attempts:
await withRetry(
  () => quickOperation(),
  { maxAttempts: 2 }, // Max 3 seconds total
  'quickOp'
);
```

### 5. Don't Retry Idempotent Operations Multiple Times

```typescript
// ⚠️ Be careful with non-idempotent operations
// This could create duplicate questions:
await withSlackRetry(
  () => storeQuestion({ ... }),
  'storeQuestion'
);

// ✅ Better - Handle at application level
try {
  await storeQuestion({ ... });
} catch (error) {
  if (error.code === 'P2002') { // Unique constraint
    // Already exists, that's ok
  } else {
    throw error;
  }
}
```

---

## Performance Impact

### Overhead

- **No Retry:** ~0.1ms overhead for wrapper
- **With Retry:** Only adds time on failures
- **Logging:** ~0.5ms per log entry

### Total Time Examples

**Successful Call (No Retry Needed):**
```
Total: ~0.1ms overhead + API call time
```

**Failed Call (3 Retries):**
```
Attempt 1: Fails + 1000ms wait
Attempt 2: Fails + 2000ms wait
Attempt 3: Succeeds
Total: ~3000ms + (3 × API call time)
```

**Rate Limited (Respects Retry-After):**
```
Attempt 1: rate_limited (retry_after: 30s)
Wait: 30000ms
Attempt 2: Succeeds
Total: ~30000ms + (2 × API call time)
```

---

## Troubleshooting

### Too Many Retries

If you're seeing excessive retries:

1. **Check Slack API status:** https://status.slack.com
2. **Verify token permissions:** Invalid scopes cause non-retriable errors
3. **Review rate limits:** You might be hitting Slack's rate limits
4. **Reduce retry attempts:** Lower `MAX_RETRY_ATTEMPTS`

### Not Retrying When Expected

If retries aren't happening:

1. **Check error type:** Non-retriable errors won't retry
2. **Review logs:** Look for "non-retriable error" messages
3. **Custom `shouldRetry`:** Make sure your custom logic is correct

### Retrying Too Slowly

If retries are too slow:

1. **Reduce initial delay:** Lower `RETRY_INITIAL_DELAY_MS`
2. **Reduce max delay:** Lower `RETRY_MAX_DELAY_MS`
3. **Reduce backoff:** Use lower `backoffMultiplier`

```typescript
// Faster retries (use cautiously)
await withRetry(
  () => operation(),
  {
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 1.5, // Less aggressive
  }
);
```

---

## Monitoring

### Key Metrics to Track

1. **Retry Rate:** Percentage of calls that need retries
2. **Retry Success Rate:** Percentage of retries that succeed
3. **Average Attempts:** Average number of attempts per call
4. **Rate Limit Events:** Frequency of rate_limited errors

### Example Monitoring Query

```typescript
// Add metrics to your logging
logger.info('API call completed', {
  context: 'slack.chat.postMessage',
  attempts: 2,
  totalTime: 3000,
  retried: true,
  success: true,
});
```

---

## Advanced Usage

### Create Custom Wrapper

```typescript
import { createRetryWrapper } from './utils/retry.js';

// Create a custom wrapper for external API
export const withExternalApiRetry = createRetryWrapper({
  maxAttempts: 5,
  initialDelayMs: 2000,
  maxDelayMs: 120000, // 2 minutes
  backoffMultiplier: 3, // More aggressive backoff
  shouldRetry: (error) => {
    // Custom logic for this API
    return error.status >= 500 || error.code === 'TIMEOUT';
  },
});
```

### Nested Retries

```typescript
// Outer retry for network issues
await withRetry(
  async () => {
    // Inner retry for API-specific issues
    return await withSlackRetry(
      () => client.chat.postMessage({ ... }),
      'slack.post'
    );
  },
  { maxAttempts: 2 }, // Only retry network issues twice
  'network'
);
```

---

## Summary

**Retry logic provides:**

✅ **Resilience** - Handles transient failures automatically
✅ **Rate Limit Handling** - Respects Slack's rate limits
✅ **Better UX** - Users don't see temporary failures
✅ **Reduced Errors** - Fewer alerts for transient issues
✅ **Visibility** - Comprehensive logging of all retries

**When to use:**
- ✅ Slack API calls (always)
- ✅ Database operations (transactional)
- ✅ External API calls
- ❌ Health checks (need fast response)
- ❌ User-facing synchronous operations (timeout concerns)

**Configuration:**
- Start with defaults
- Adjust based on your error rates
- Monitor retry metrics
- Fine-tune for your environment
