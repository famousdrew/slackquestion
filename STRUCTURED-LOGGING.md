# Structured Logging Guide

## Overview

The Slack Question Router uses **Winston** for production-grade structured logging with JSON output, file rotation, and contextual metadata.

---

## Benefits

✅ **Searchable** - Filter logs by questionId, channelId, userId, etc.
✅ **Log Levels** - debug, info, warn, error
✅ **Structured Data** - JSON format for log aggregation tools
✅ **Production-Ready** - Works with CloudWatch, Datadog, Splunk, etc.
✅ **File Rotation** - Automatic log file management (10MB max, 5 files)
✅ **Color-Coded** - Easy-to-read console output in development

---

## Configuration

### Environment Variables

```bash
# .env
LOG_LEVEL=debug              # debug, info, warn, error
ENABLE_FILE_LOGGING=false    # Enable file logging in development
NODE_ENV=development         # development or production
```

### Defaults

- **Development:** `LOG_LEVEL=debug`, console only (no files)
- **Production:** `LOG_LEVEL=info`, console + files

---

## Usage

### Basic Logging

```typescript
import { logger } from './utils/logger.js';

// Info level (general information)
logger.info('User logged in');

// With metadata
logger.info('Question detected', {
  questionId: 'q-123',
  channelId: 'C123',
  userId: 'U456',
});

// Warning level
logger.warn('Rate limit approaching', {
  current: 95,
  limit: 100,
});

// Error level
logger.error('Failed to post message', new Error('Network timeout'));

// Debug level (development only by default)
logger.debug('Processing message', {
  messageText: 'How do I...?',
  tokens: ['how', 'do', 'i'],
});
```

### Output Examples

**Console (Development):**
```
2025-11-13 14:23:45 [info] Question detected {"questionId":"q-123","channelId":"C123","userId":"U456"}
2025-11-13 14:23:46 [warn] Rate limit approaching {"current":95,"limit":100}
2025-11-13 14:23:47 [error] Failed to post message {"error":{"message":"Network timeout","stack":"Error: Network timeout\n    at..."}}
```

**File (Production - JSON):**
```json
{
  "level": "info",
  "message": "Question detected",
  "questionId": "q-123",
  "channelId": "C123",
  "userId": "U456",
  "timestamp": "2025-11-13T14:23:45.123Z"
}
```

---

## Advanced Usage

### Child Loggers (Contextual Logging)

Create a child logger with default metadata that's included in every log:

```typescript
// In a service file
import { logger } from '../utils/logger.js';

const serviceLogger = logger.child({
  service: 'escalation-engine',
  workspaceId: 'ws-123',
});

// All logs from this logger include service and workspaceId
serviceLogger.info('Checking for escalations'); // Includes service & workspaceId
serviceLogger.error('Escalation failed', { questionId: 'q-456' }); // Includes all metadata
```

**Output:**
```json
{
  "level": "info",
  "message": "Checking for escalations",
  "service": "escalation-engine",
  "workspaceId": "ws-123",
  "timestamp": "2025-11-13T14:23:45.123Z"
}
```

### Nested Child Loggers

```typescript
const serviceLogger = logger.child({ service: 'message-handler' });
const requestLogger = serviceLogger.child({ requestId: 'req-789' });

requestLogger.info('Processing request');
// Includes both service and requestId
```

---

## Log Levels

### When to Use Each Level

**debug** - Development/troubleshooting only
- Detailed execution flow
- Variable values
- Internal state changes
- NOT logged in production by default

```typescript
logger.debug('Parsing message tokens', {
  rawMessage: 'How do I reset my password?',
  tokens: ['how', 'do', 'i', 'reset', 'password'],
});
```

**info** - Normal operations
- Successful operations
- State transitions
- Startup/shutdown messages
- User actions

```typescript
logger.info('Question stored successfully', {
  questionId: 'q-123',
  workspaceId: 'ws-456',
});
```

**warn** - Unexpected but recoverable
- Degraded performance
- Rate limits approaching
- Retries
- Deprecated features

```typescript
logger.warn('Slack API rate limit warning', {
  remaining: 5,
  limit: 100,
  resetAt: new Date(),
});
```

**error** - Failures requiring attention
- Exceptions
- Failed operations
- Data consistency issues
- External service failures

```typescript
logger.error('Failed to escalate question', error);
```

---

## File Logging

### Locations

Log files are stored in `/logs` directory (gitignored):

```
logs/
├── combined.log    # All logs (info, warn, error)
└── error.log       # Errors only
```

### Rotation

- **Max Size:** 10MB per file
- **Max Files:** 5 files kept
- **Old logs:** Automatically deleted when limit reached

### Enable in Development

```bash
# .env
ENABLE_FILE_LOGGING=true
```

### Production Behavior

File logging is **always enabled** in production (`NODE_ENV=production`).

---

## Integration with Log Aggregation

### CloudWatch Logs

Winston JSON format works perfectly with CloudWatch:

```bash
# Ship logs to CloudWatch
tail -f logs/combined.log | aws logs put-log-events \
  --log-group-name /slack-question-router \
  --log-stream-name production
```

### Datadog

```javascript
// Add Datadog transport (optional)
import { datadog } from 'winston-datadog';

transports.push(new datadog({
  apiKey: process.env.DATADOG_API_KEY,
  service: 'slack-question-router',
  ddsource: 'nodejs',
  ddtags: 'env:production',
}));
```

### Splunk

```bash
# Forward logs to Splunk
tail -f logs/combined.log | splunk add forward-server \
  splunk.yourcompany.com:9997
```

### Elasticsearch + Kibana

```bash
# Use Filebeat to ship logs
filebeat -c filebeat.yml
```

filebeat.yml:
```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /path/to/logs/combined.log
    json.keys_under_root: true
```

---

## Searching Logs

### Using jq (JSON Query)

```bash
# Find all errors
cat logs/combined.log | jq 'select(.level=="error")'

# Find logs for specific question
cat logs/combined.log | jq 'select(.questionId=="q-123")'

# Find logs in time range
cat logs/combined.log | jq 'select(.timestamp > "2025-11-13T14:00:00")'

# Count logs by level
cat logs/combined.log | jq -r '.level' | sort | uniq -c
```

### Using grep

```bash
# Find all escalation-related logs
grep "escalation" logs/combined.log

# Find errors from specific workspace
grep "ws-123" logs/error.log

# Find logs from last hour
grep "2025-11-13 14:" logs/combined.log
```

---

## Migration from console.log

### Before (Old Way)

```typescript
console.log('Question detected:', messageText);
console.error('Error processing:', error);
```

### After (New Way)

```typescript
import { logger } from './utils/logger.js';

logger.info('Question detected', { messageText });
logger.error('Error processing message', error);
```

### Why Migrate?

**Old console.log:**
- ❌ No structure - hard to search
- ❌ No levels - everything looks the same
- ❌ No metadata - loses context
- ❌ No timestamps in production
- ❌ Can't filter or aggregate

**New logger:**
- ✅ Structured JSON - easy to search
- ✅ Log levels - filter by severity
- ✅ Rich metadata - full context
- ✅ Timestamps always included
- ✅ Works with monitoring tools

---

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.info('Question stored', { questionId });
logger.warn('Escalation delayed', { questionId, delayMs });
logger.error('Database connection failed', error);

// ❌ Bad
logger.error('Question stored', { questionId }); // Not an error!
logger.info('Database connection failed', error); // This IS an error!
```

### 2. Include Contextual Metadata

```typescript
// ✅ Good - Rich context for debugging
logger.info('Question escalated', {
  questionId: 'q-123',
  workspaceId: 'ws-456',
  channelId: 'C789',
  escalationLevel: 2,
  attemptNumber: 1,
});

// ❌ Bad - No context
logger.info('Question escalated');
```

### 3. Use Child Loggers for Services

```typescript
// ✅ Good - All logs tagged with service
const logger = baseLogger.child({ service: 'escalation-engine' });

// ❌ Bad - Repeating service name manually
logger.info('Starting', { service: 'escalation-engine' });
logger.info('Checking', { service: 'escalation-engine' });
```

### 4. Log Errors Properly

```typescript
// ✅ Good - Error object with stack trace
logger.error('Failed to process question', error);

// ❌ Bad - Loses stack trace
logger.error('Failed to process question', { message: error.message });
```

### 5. Don't Log Sensitive Data

```typescript
// ✅ Good - Safe data only
logger.info('User authenticated', {
  userId: 'U123',
  workspace: 'acme-corp',
});

// ❌ Bad - Sensitive data exposed
logger.info('User authenticated', {
  userId: 'U123',
  password: 'secret123',    // ⚠️ NEVER LOG PASSWORDS!
  apiToken: 'xoxb-...',     // ⚠️ NEVER LOG TOKENS!
});
```

### 6. Keep Messages Concise

```typescript
// ✅ Good - Clear and concise
logger.info('Question detected', { questionId, channelId });

// ❌ Bad - Too verbose
logger.info('A question was detected in the channel and we are now processing it to store in the database', { questionId, channelId });
```

---

## Performance

### Overhead

- **Console logging:** ~0.5ms per log
- **File logging:** ~2-3ms per log
- **JSON formatting:** Negligible (<0.1ms)

### Production Optimization

```bash
# Set LOG_LEVEL=info in production to skip debug logs
LOG_LEVEL=info

# This completely skips debug log processing
logger.debug('Detailed trace'); // Not processed at all
```

### Asynchronous Logging (Optional)

For high-throughput scenarios, enable async logging:

```typescript
// In logger.ts (optional optimization)
const transports = [
  new winston.transports.File({
    filename: 'combined.log',
    // Add async option
    options: { flags: 'a', highWaterMark: 256 * 1024 },
  }),
];
```

---

## Troubleshooting

### Logs Not Appearing

1. **Check LOG_LEVEL:**
   ```bash
   echo $LOG_LEVEL
   # Should be 'debug' or 'info'
   ```

2. **Check NODE_ENV:**
   ```bash
   echo $NODE_ENV
   # 'development' = console only
   # 'production' = console + files
   ```

3. **Enable file logging in dev:**
   ```bash
   ENABLE_FILE_LOGGING=true npm start
   ```

### Log Files Not Created

1. **Check permissions:**
   ```bash
   mkdir -p logs
   chmod 755 logs
   ```

2. **Check disk space:**
   ```bash
   df -h
   ```

### Too Many Log Files

Winston automatically rotates files (max 5 files). To manually clean:

```bash
# Keep only last 2 files
ls -t logs/combined.log.* | tail -n +3 | xargs rm
```

---

## Examples from the Codebase

### Startup Logging

```typescript
// src/index.ts
logger.info('Slack Question Router started in Socket Mode');
logger.info('Connected to Slack workspace', {
  workspace: auth.team,
  botUser: auth.user,
});
```

### Escalation Engine

```typescript
// src/services/escalationEngine.ts
logger.info('Escalation engine started', {
  checkInterval: '30s',
  configSource: 'database',
});
```

### Health Check

```typescript
// src/services/healthCheck.ts
logger.info('Health check endpoint started', {
  port: 3000,
  endpoint: '/health',
});
```

### Error Handling

```typescript
// src/index.ts
logger.error('Unhandled Promise Rejection', {
  reason: error.message,
  stack: error.stack,
});
```

---

## Summary

**Structured logging with Winston provides:**

✅ **Better debugging** - Rich context and searchable metadata
✅ **Production monitoring** - JSON logs work with all monitoring tools
✅ **Performance insights** - Track response times and bottlenecks
✅ **Error tracking** - Full stack traces and error context
✅ **Audit trails** - Who did what when

**Next steps:**
1. Replace remaining `console.log` calls with `logger` calls
2. Add metadata to existing logs for better context
3. Set up log aggregation (CloudWatch, Datadog, etc.)
4. Create alerts based on error logs
