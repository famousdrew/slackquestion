# Zendesk Side Conversations - Implementation Summary

## ✅ What Has Been Implemented

### 1. Database Schema Changes
**File:** `prisma/schema.prisma`

Added 3 new fields to the `Question` model:
- `isSideConversation` - Boolean flag to identify side conversations
- `zendeskTicketId` - Optional ticket ID extracted from message
- `sourceApp` - Tracks origin ('slack' or 'zendesk')

Added index for efficient queries: `@@index([isSideConversation, status, askedAt])`

### 2. Zendesk Detection Service
**File:** `src/services/zendeskDetector.ts` (NEW)

Three main functions:
- `isZendeskMessage()` - Detects if message is from Zendesk bot
- `extractZendeskTicketId()` - Parses ticket ID from message text
- `getZendeskBotUserId()` - Gets/caches Zendesk bot user ID

Detection strategy:
1. Check `ZENDESK_BOT_USER_ID` environment variable
2. Check `bot_profile.name` for "Zendesk"
3. Fallback to `bots.info` API call
4. Cache bot ID per workspace

### 3. Message Handler Updates
**File:** `src/events/messageHandler.ts`

**Changes:**
- Imports Zendesk detection functions
- Checks for Zendesk messages BEFORE rejecting bot messages
- New `handleZendeskSideConversation()` function (120 lines)
- Skips `isQuestion()` check for side conversations
- Stores with `isSideConversation: true` and `sourceApp: 'zendesk'`
- Adds ❓ reaction same as regular questions

### 4. Question Storage Updates
**File:** `src/services/questionStorage.ts`

**Changes:**
- Updated `StoreQuestionParams` interface with 3 optional fields
- Modified `storeQuestion()` to accept and store new fields
- Defaults: `isSideConversation: false`, `sourceApp: 'slack'`

### 5. Database Migration
**File:** `migration-add-side-conversations.sql` (NEW)

SQL script to add columns and index to existing database.
Safe to re-run (uses `IF NOT EXISTS`).

### 6. Documentation
**Files Created/Updated:**
- `ZENDESK-SIDE-CONVERSATIONS.md` - Complete feature documentation
- `MIGRATIONS.md` - Updated with migration #4
- `IMPLEMENTATION-SUMMARY.md` - This file

---

## 📋 What You Need to Do

### Step 1: Run Database Migration

**In Supabase SQL Editor:**

```sql
-- Add new columns
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS is_side_conversation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS zendesk_ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS source_app TEXT DEFAULT 'slack';

-- Add index
CREATE INDEX IF NOT EXISTS idx_questions_side_conversation
  ON questions(is_side_conversation, status, asked_at);
```

**Verify it worked:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name IN ('is_side_conversation', 'zendesk_ticket_id', 'source_app');
```

Should return 3 rows.

### Step 2: Update Prisma Client Locally

```bash
npx prisma generate
```

This regenerates the Prisma client with the new schema fields.

### Step 3: Test Build Locally

```bash
npm run build
```

Should complete without TypeScript errors.

### Step 4: Add Environment Variables to Railway

**Railway Dashboard → Your Project → Variables:**

Add one variable:
```
ZENDESK_INTEGRATION_ENABLED=true
```

**Optional** (only if auto-detection fails):
```
ZENDESK_BOT_USER_ID=U123456789
```

### Step 5: Commit and Deploy

```bash
git add .
git commit -m "feat: add Zendesk side conversation tracking

- Add database fields for side conversation tracking
- Create Zendesk bot detection service
- Update message handler to process side conversations
- Add migration script and documentation
- Treats all side conversations as questions (same escalation logic)"

git push origin main
```

Railway will auto-deploy in 2-3 minutes.

### Step 6: Verify Deployment

**Check Railway Logs:**
Look for:
```
✅ Connected to Slack workspace
📊 Question detection is active
🚨 Starting escalation engine...
```

No errors about missing columns.

### Step 7: Test with Real Side Conversation

1. **In Zendesk:** Create a side conversation to a monitored Slack channel
2. **In Slack:** Look for ❓ reaction on the message
3. **Railway Logs:** Should see "Zendesk side conversation detected"
4. **Database:** Check it was stored:
   ```sql
   SELECT * FROM questions
   WHERE is_side_conversation = true
   ORDER BY created_at DESC LIMIT 1;
   ```

---

## 🎯 How It Works

### Normal Flow
```
User posts → Check isQuestion() → If yes → Store → Escalate
```

### Side Conversation Flow
```
Zendesk posts → Detect Zendesk bot → Always store → Escalate (same timing)
```

### Key Behaviors

✅ **Same escalation timing** (120/240/1440 minutes by default)
✅ **Same answer detection** (workspace config: emoji_only/thread_auto/hybrid)
✅ **Same emoji** (❓)
✅ **Same escalation targets**
✅ **Thread replies detected** (answer detection based on workspace mode)

❌ **No question detection** (all side conversations = questions)
❌ **Different "asker"** (Zendesk bot, not human user)

---

## 🔍 Monitoring

### Check Side Conversation Activity

```sql
-- Count side conversations
SELECT COUNT(*) as total_side_conversations
FROM questions
WHERE is_side_conversation = true;

-- Recent side conversations
SELECT
  message_text,
  zendesk_ticket_id,
  status,
  asked_at,
  answered_at,
  EXTRACT(EPOCH FROM (answered_at - asked_at))/60 as response_time_minutes
FROM questions
WHERE is_side_conversation = true
ORDER BY asked_at DESC
LIMIT 10;

-- Side conversations vs regular questions
SELECT
  source_app,
  status,
  COUNT(*) as count
FROM questions
GROUP BY source_app, status
ORDER BY source_app, status;
```

### Railway Logs to Watch

**Success indicators:**
```
"Zendesk side conversation detected"
"Zendesk side conversation stored with ID: abc123"
"Added :question: reaction to side conversation"
```

**Warning indicators:**
```
"Could not determine Zendesk bot user ID"
"Channel not monitored, skipping"
```

---

## 🐛 Troubleshooting

### Side Conversations Not Being Detected

**Problem:** Zendesk messages appear but aren't tracked

**Solutions:**
1. Check `ZENDESK_INTEGRATION_ENABLED=true` in Railway
2. Verify bot name is "Zendesk" in Slack
3. Set `ZENDESK_BOT_USER_ID` explicitly
4. Check channel is monitored (`is_monitored = true`)

### Can't Find Zendesk Bot ID

**Problem:** Logs show "Could not determine Zendesk bot user ID"

**Solution:**
1. In Slack, click on a Zendesk message
2. Click on the "Zendesk" bot name
3. Copy the User ID (starts with U...)
4. Add to Railway: `ZENDESK_BOT_USER_ID=U123456789`

### Build Errors

**Problem:** TypeScript compilation fails

**Solution:**
```bash
# Regenerate Prisma client
npx prisma generate

# Try build again
npm run build
```

### Migration Errors

**Problem:** Column already exists or database error

**Solution:**
```sql
-- Check if migration already ran
SELECT column_name FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name = 'is_side_conversation';

-- If it returns a row, migration already applied (safe to skip)
```

---

## 📊 Statistics & Analytics

### Enhanced `/qr-stats` Command

The existing stats command will automatically include side conversations.

To separate them in future updates:
```typescript
// In statsCommand.ts, you could add:
const sideConversationStats = await prisma.question.count({
  where: {
    workspaceId,
    isSideConversation: true,
    status: 'answered'
  }
});
```

### Custom Queries

```sql
-- Average response time by source
SELECT
  source_app,
  AVG(EXTRACT(EPOCH FROM (answered_at - asked_at))/60) as avg_minutes,
  COUNT(*) as total_answered
FROM questions
WHERE answered_at IS NOT NULL
GROUP BY source_app;

-- Escalation rate comparison
SELECT
  source_app,
  COUNT(*) FILTER (WHERE escalation_level > 0) as escalated,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE escalation_level > 0) / COUNT(*), 2) as escalation_rate
FROM questions
GROUP BY source_app;
```

---

## 🚀 Future Enhancements

Potential improvements (not in scope for MVP):

1. **Separate timing for side conversations**
   - Add `sideConvoFirstEscalationMinutes` to workspace_config
   - Faster escalation for support team questions (e.g., 5/15/60)

2. **Post back to Zendesk**
   - Use Zendesk API to add internal note
   - When escalated, notify ticket with answer

3. **Enhanced ticket parsing**
   - More robust ticket ID extraction
   - Link to Zendesk ticket in escalation messages

4. **Separate stats**
   - Dedicated side conversation section in `/qr-stats`
   - Track "Zendesk → Slack" resolution rate

5. **Zendesk webhooks**
   - More reliable than Slack message detection
   - Get full ticket context immediately

---

## ✅ Testing Checklist

- [ ] Database migration applied successfully
- [ ] Prisma client regenerated locally
- [ ] Build completes without errors
- [ ] Environment variables added to Railway
- [ ] Code pushed to GitHub
- [ ] Railway deployment successful
- [ ] No errors in Railway logs
- [ ] Test side conversation posted in Slack
- [ ] Bot added ❓ reaction
- [ ] Question stored in database
- [ ] Escalation fires after configured time
- [ ] Thread reply detected as answer (if workspace mode allows)
- [ ] ✅ reaction marks as answered

---

## 📚 Documentation Reference

- **Feature Guide:** [ZENDESK-SIDE-CONVERSATIONS.md](./ZENDESK-SIDE-CONVERSATIONS.md)
- **Migration Guide:** [MIGRATIONS.md](./MIGRATIONS.md)
- **Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Main README:** [README.md](./README.md)

---

## 🎉 Summary

**What changed:**
- 3 database columns added
- 1 new service file (zendeskDetector.ts)
- 3 existing files modified
- 1 migration script
- 3 documentation files

**What stayed the same:**
- Escalation timing (uses workspace config)
- Answer detection (uses workspace mode)
- Escalation targets (same as regular questions)
- User interface (same commands and reactions)

**Result:**
Zendesk side conversations are now automatically tracked and escalated with zero additional configuration needed beyond enabling the feature.

---

Last Updated: 2025-01-07
