# Slack Question Router - Project Configuration

**Last Updated:** 2025-01-07

---

## 🏗️ Infrastructure & Hosting

### Hosting Architecture
- **Application:** Railway (https://railway.app)
- **Database:** Supabase (PostgreSQL with Row-Level Security)
- **Code Repository:** GitHub (https://github.com/famousdrew/slackquestion)
- **Git Workflow:** Claude is in charge of ALL commits to GitHub

### Deployment Flow
```
Local Changes → Git Commit (Claude) → Git Push (Claude) → GitHub → Railway Auto-Deploy
```

**Important:** Always push commits to GitHub immediately after committing. Railway will not deploy until code is pushed.

---

## ⚙️ Production Configuration

### Workspace: Drew's Team

**Escalation Settings (CUSTOM - NOT DEFAULTS):**

**Level 1 (First Escalation):**
- **Timing:** 2 minutes after question posted
- **Action:** Tag `@t2` user group in the question thread
- **Target:** User group handle `t2`

**Level 2 (Second Escalation):**
- **Timing:** 4 minutes after question posted (2 minutes after first escalation)
- **Action:** Post alert message to private channel `tier_1`
- **Target:** Private channel `tier_1`

**Level 3 (Final Escalation):**
- **Timing:** Default 1440 minutes (24 hours)
- **Action:** (Not configured yet)

### Answer Detection Mode
- **Mode:** (Check workspace config - likely `emoji_only` or `hybrid`)
- **Behavior:**
  - `emoji_only`: Requires ✅ reaction to mark answered
  - `hybrid`: Replies pause escalation, ✅ marks complete
  - `thread_auto`: Any reply marks answered

### Database Configuration
```env
DATABASE_URL=<Supabase PostgreSQL connection string>
```

### Slack Integration
- **Bot Token:** `SLACK_BOT_TOKEN` (xoxb-...)
- **App Token:** `SLACK_APP_TOKEN` (xapp-...)
- **Signing Secret:** `SLACK_SIGNING_SECRET`

### Zendesk Integration
- **Enabled:** Yes (`ZENDESK_INTEGRATION_ENABLED=true`)
- **Bot ID:** `B02BDG3GNF5`
- **Bot Name:** "Zendesk"
- **Purpose:** Track Zendesk side conversations as questions

---

## 📊 Database Schema

### Key Tables
- `workspaces` - Slack workspaces
- `channels` - Monitored channels
- `users` - Slack users (NO EMAIL - privacy focused)
- `questions` - All tracked questions
- `workspace_config` - Per-workspace escalation settings
- `escalation_targets` - Flexible escalation routing
- `escalation_events` - Detailed escalation logs

### Recent Schema Changes
- ✅ Email column removed (privacy update - Jan 2025)
- ✅ Side conversation tracking added (Jan 2025)
  - `is_side_conversation` BOOLEAN
  - `zendesk_ticket_id` TEXT
  - `source_app` TEXT

---

## 🚀 Common Operations

### Making Code Changes
1. Edit files locally
2. Test with `npm run build` if TypeScript changes
3. **Commit:** `git add . && git commit -m "..."`
4. **Push:** `git push origin main` ← **CRITICAL - Don't forget!**
5. Wait 2-3 minutes for Railway to deploy
6. Check Railway logs for deployment success

### Database Migrations
1. Update `prisma/schema.prisma`
2. Create migration SQL file in project root
3. Update `MIGRATIONS.md` with new migration
4. Run SQL in Supabase SQL Editor
5. Run `npx prisma generate` locally
6. Commit and push

### Environment Variables (Railway)
Current variables set:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_APP_TOKEN`
- `DATABASE_URL`
- `ZENDESK_INTEGRATION_ENABLED=true`
- `ZENDESK_BOT_USER_ID=B02BDG3GNF5`

### Checking Logs
- **Railway Logs:** Railway Dashboard → Service → Deployments → Latest
- **Database Queries:** Supabase Dashboard → SQL Editor
- **Look for:** "Zendesk side conversation detected", escalation messages

---

## 🎯 Project Structure

```
slackquestion/
├── .claude/
│   ├── settings.local.json
│   └── project-config.md          ← This file
├── src/
│   ├── commands/                  ← Slash command handlers
│   │   ├── configCommand.ts
│   │   ├── statsCommand.ts
│   │   └── targetsCommand.ts
│   ├── events/                    ← Slack event handlers
│   │   ├── messageHandler.ts      ← Question detection (+ Zendesk)
│   │   ├── reactionHandler.ts     ← Answer marking
│   │   └── appHome.ts
│   ├── services/                  ← Business logic
│   │   ├── escalationEngine.ts    ← Escalation loop (30s interval)
│   │   ├── questionDetector.ts    ← Pattern matching
│   │   ├── questionStorage.ts     ← Database operations
│   │   ├── configService.ts       ← Workspace config
│   │   ├── escalationTargetService.ts
│   │   └── zendeskDetector.ts     ← Zendesk bot detection (NEW)
│   ├── utils/
│   │   ├── db.ts                  ← Prisma client
│   │   ├── constants.ts           ← App constants
│   │   └── slackHelpers.ts
│   └── index.ts                   ← Main entry point
├── prisma/
│   └── schema.prisma              ← Database schema
├── migration-*.sql                ← Database migrations
├── *.md                           ← Documentation
└── package.json
```

---

## 🔐 Security & Privacy

### Data Collection Policy
- ✅ **NO EMAIL COLLECTION** (removed January 2025)
- ✅ **NO PII STORAGE** (no phone, address, payment info)
- ✅ Only stores: Slack IDs, display names, message text
- ✅ Public profile data only (visible to all workspace members)
- ✅ Row-Level Security (RLS) enabled on Supabase
- ✅ No third-party data sharing

### Recent Privacy Updates
- Email column dropped from users table
- Updated portfolio page with privacy highlights
- Added security section to documentation

---

## 📝 Important Notes

### For Claude Sessions
1. **Always push after committing** - Railway won't deploy without it
2. **Check Railway logs** - Verify deployments succeeded
3. **Test incrementally** - Small changes, frequent commits
4. **Update this file** - When configuration changes
5. **User's escalation timing is CUSTOM** - Not the defaults shown in code!

### Current Defaults in Code
- First escalation: 120 minutes (2 hours)
- Second escalation: 240 minutes (4 hours)
- Final escalation: 1440 minutes (24 hours)

**But Drew's workspace uses:**
- First escalation: **2 minutes**
- Second escalation: **4 minutes**

These are configured in the database via `/qr-config` command or directly in `workspace_config` table.

---

## 🐛 Known Issues & Fixes

### Side Conversations Stuck at Level 99
**Problem:** Zendesk's "Reply to be a part of this thread" auto-message was counting as a human reply
**Fix:** Filter out ALL bot messages (bot_id present) when checking for replies
**Status:** Fixed in commit 53439ca

### Zendesk Detection Not Working
**Problem:** Code committed but not pushed to GitHub
**Solution:** Always `git push origin main` after committing
**Status:** Fixed, documented here

---

## 📞 Support Channels

- **Issues:** Slack workspace or direct message
- **Code:** GitHub repository
- **Database:** Supabase dashboard
- **Hosting:** Railway dashboard

---

## 🎉 Recent Features

- ✅ Zendesk side conversation tracking
- ✅ Flexible multi-tier escalation system
- ✅ Per-workspace configuration
- ✅ Three answer detection modes
- ✅ Privacy-focused (no email collection)
- ✅ App Home dashboard
- ✅ Statistics tracking

---

**Remember:** This is Drew's production environment. Test carefully, commit frequently, and always push to GitHub!
