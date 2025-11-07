# Zendesk Side Conversations Integration

This document describes the Zendesk side conversations feature integration with the Question Router bot.

## Overview

The bot now automatically detects and tracks **Zendesk side conversations** that appear in monitored Slack channels. When Zendesk agents create a side conversation to a Slack channel, the bot treats it as a question and applies the same escalation logic as regular questions.

## How It Works

### Detection
1. Zendesk posts a side conversation message to a Slack channel
2. Bot identifies it as coming from the Zendesk app (bot name: "Zendesk")
3. Bot tracks it as a question (no `?` required)
4. Adds ❓ reaction to acknowledge tracking

### Escalation
- Uses the **same timing** as regular questions (workspace defaults: 120/240/1440 minutes)
- Uses the **same answer detection mode** (emoji_only, thread_auto, or hybrid)
- Replies in the thread count as potential answers (based on workspace config)
- ✅ reaction marks as answered (same as regular questions)

### Key Differences from Regular Questions
| Aspect | Regular Questions | Side Conversations |
|--------|-------------------|-------------------|
| Source | Human users | Zendesk bot |
| Detection | `isQuestion()` check | All messages tracked |
| Asker | Slack user | Zendesk bot user |
| Timing | Workspace config | Same as workspace config |
| Escalation | Standard flow | Same as standard flow |

## Database Schema Changes

### New Columns in `questions` Table

```sql
is_side_conversation BOOLEAN DEFAULT false
zendesk_ticket_id    TEXT
source_app           TEXT DEFAULT 'slack'
```

### Migration

Run this SQL on your Supabase database:

```bash
# In Supabase SQL Editor, run:
migration-add-side-conversations.sql
```

**Verification:**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name IN ('is_side_conversation', 'zendesk_ticket_id', 'source_app');
```

## Environment Variables

### Railway Configuration

Add these environment variables in your Railway dashboard:

```env
# Enable Zendesk side conversation tracking
ZENDESK_INTEGRATION_ENABLED=true

# Optional: Specific Zendesk bot user ID (auto-detects if not set)
ZENDESK_BOT_USER_ID=U123456789
```

### Auto-Detection

If `ZENDESK_BOT_USER_ID` is not set, the bot will:
1. Check `bot_profile.name` for "Zendesk"
2. Query `bots.info` API to find bot by name
3. Cache the bot ID for future messages

## Code Structure

### New Files

**`src/services/zendeskDetector.ts`**
- `isZendeskMessage()` - Identifies Zendesk bot messages
- `extractZendeskTicketId()` - Extracts ticket ID from message text
- `getZendeskBotUserId()` - Gets/caches Zendesk bot user ID

### Modified Files

**`prisma/schema.prisma`**
- Added 3 columns to `Question` model
- Added index for efficient querying

**`src/services/questionStorage.ts`**
- Updated `StoreQuestionParams` interface
- Added new fields to `storeQuestion()` function

**`src/events/messageHandler.ts`**
- Added Zendesk message detection before regular message check
- New `handleZendeskSideConversation()` function
- Skips `isQuestion()` check for side conversations

## Usage

### For End Users (Slack)

Nothing changes! When a Zendesk side conversation appears:
1. Bot adds ❓ reaction
2. Reply in thread to help answer
3. Add ✅ when resolved (or relies on workspace answer detection mode)

### For Admins

**View side conversation questions:**
```sql
SELECT
  message_text,
  zendesk_ticket_id,
  status,
  asked_at,
  answered_at
FROM questions
WHERE is_side_conversation = true
ORDER BY asked_at DESC;
```

**Statistics:**
```sql
-- Side conversations vs regular questions
SELECT
  source_app,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'answered') as answered,
  COUNT(*) FILTER (WHERE status = 'unanswered') as unanswered
FROM questions
GROUP BY source_app;
```

## Deployment Steps

### 1. Local Development

```bash
# Update Prisma client
npx prisma generate

# Build to verify no TypeScript errors
npm run build
```

### 2. Database Migration (Supabase)

```bash
# Open Supabase SQL Editor
# Copy/paste contents of migration-add-side-conversations.sql
# Run the migration
```

### 3. Environment Variables (Railway)

```bash
# Railway Dashboard → Your Project → Variables
# Add:
ZENDESK_INTEGRATION_ENABLED=true
```

### 4. Deploy to Railway

```bash
git add .
git commit -m "feat: add Zendesk side conversation tracking"
git push origin main

# Railway auto-deploys in 2-3 minutes
```

### 5. Verify in Railway Logs

Look for:
```
✅ Connected to Slack workspace
📊 Question detection is active
🚨 Starting escalation engine...
```

## Testing

### Manual Test

1. **Create a test side conversation in Zendesk**
   - Open a Zendesk ticket
   - Create a side conversation to a monitored Slack channel
   - Post: "Customer needs help with data export"

2. **Verify detection**
   - Check Slack - bot should add ❓ reaction
   - Check Railway logs for "Zendesk side conversation detected"
   - Check database:
     ```sql
     SELECT * FROM questions
     WHERE is_side_conversation = true
     ORDER BY created_at DESC LIMIT 1;
     ```

3. **Test escalation**
   - Wait for configured escalation time
   - Should see escalation message in thread
   - Reply in thread
   - Verify answer detection works

4. **Test answer marking**
   - Add ✅ reaction
   - Check status changes to 'answered'

## Troubleshooting

### Side Conversations Not Detected

**Check 1: Integration Enabled**
```bash
# Railway Variables
ZENDESK_INTEGRATION_ENABLED=true  # Must be exactly "true"
```

**Check 2: Bot Identification**
```
# Railway logs should show:
"Zendesk side conversation detected"
```

If not, the bot isn't recognizing Zendesk messages. Check:
- Bot name in Slack (should be "Zendesk")
- Set `ZENDESK_BOT_USER_ID` explicitly

**Check 3: Channel Monitored**
```sql
SELECT channel_name, is_monitored
FROM channels
WHERE slack_channel_id = 'C123456789';
```

### Escalations Not Working

Side conversations use the **same escalation config** as regular questions:
- Check workspace config: `SELECT * FROM workspace_config;`
- Verify escalation targets: `SELECT * FROM escalation_targets;`
- Check Railway logs for escalation engine activity

### Bot Can't Find Zendesk Bot ID

**Solution**: Set explicitly in Railway:
```bash
# Get Zendesk bot user ID from Slack:
# 1. Go to Slack workspace
# 2. Find a Zendesk message
# 3. Click on Zendesk bot name
# 4. Copy user ID (starts with U...)

# Add to Railway Variables:
ZENDESK_BOT_USER_ID=U123456789
```

## Future Enhancements

Potential improvements for the future:

- [ ] Different escalation timing for side conversations
- [ ] Post escalations back to Zendesk as internal notes
- [ ] Parse ticket ID from all Zendesk message formats
- [ ] Separate statistics for side conversations vs regular questions
- [ ] Webhooks from Zendesk to confirm side conversation creation
- [ ] Link directly to Zendesk ticket in escalation messages

## Related Documentation

- [README.md](./README.md) - Main project documentation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Railway deployment guide
- [MIGRATIONS.md](./MIGRATIONS.md) - Database migrations

## Support

If side conversations aren't working:
1. Check Railway logs for errors
2. Verify migration ran successfully
3. Test with a simple side conversation
4. Check Slack bot permissions (needs `channels:history`)

---

Last Updated: 2025-01-07
