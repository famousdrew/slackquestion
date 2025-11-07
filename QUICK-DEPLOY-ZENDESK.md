# Quick Deploy: Zendesk Side Conversations

## 5-Minute Deployment Guide

### Step 1: Database (30 seconds)

**Supabase SQL Editor:**
```sql
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS is_side_conversation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS zendesk_ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS source_app TEXT DEFAULT 'slack';

CREATE INDEX IF NOT EXISTS idx_questions_side_conversation
  ON questions(is_side_conversation, status, asked_at);
```

✅ Run verification:
```sql
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name IN ('is_side_conversation', 'zendesk_ticket_id', 'source_app');
-- Should return: 3
```

### Step 2: Local Build (1 minute)

```bash
npx prisma generate
npm run build
```

✅ Should complete without errors

### Step 3: Railway Variables (30 seconds)

Add in Railway Dashboard → Variables:
```
ZENDESK_INTEGRATION_ENABLED=true
```

### Step 4: Deploy (2 minutes)

```bash
git add .
git commit -m "feat: add Zendesk side conversation tracking"
git push origin main
```

✅ Railway auto-deploys

### Step 5: Verify (1 minute)

**Railway Logs should show:**
```
✅ Connected to Slack workspace
📊 Question detection is active
🚨 Starting escalation engine...
```

**No errors about missing columns**

---

## Test It

1. Create Zendesk side conversation to Slack channel
2. Check for ❓ reaction
3. Check Railway logs for "Zendesk side conversation detected"
4. Query database:
   ```sql
   SELECT * FROM questions WHERE is_side_conversation = true LIMIT 1;
   ```

---

## If Something Goes Wrong

### Bot Not Detecting Side Conversations

```bash
# Railway → Variables → Add:
ZENDESK_BOT_USER_ID=U123456789
```

Get the ID from Slack (click Zendesk bot name, copy User ID)

### Build Errors

```bash
npx prisma generate
npm run build
```

### Database Errors

Check migration applied:
```sql
\d questions
-- Should show: is_side_conversation, zendesk_ticket_id, source_app
```

---

## Done!

Side conversations will now:
- ✅ Auto-detect from Zendesk
- ✅ Get tracked as questions
- ✅ Escalate on same schedule
- ✅ Show in `/qr-stats`

**Full documentation:** [ZENDESK-SIDE-CONVERSATIONS.md](./ZENDESK-SIDE-CONVERSATIONS.md)
