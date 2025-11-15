# OAuth Migration Debug Status Report

**Date:** November 15, 2025
**Branch:** `claude/code-review-debug-01A6mnF3fPr8BQjEGUUKkGJ5`
**Railway URL:** `https://slackquestion-production.up.railway.app`

---

## Executive Summary

The question router stopped detecting questions after migrating from Socket Mode to OAuth V2. Root cause was missing database migrations and OAuth token management for background tasks. Core functionality (question detection) is now working. Escalation engine fixes are committed but not yet deployed.

---

## What Was Broken

1. **Database table missing** - `slack_installations` table didn't exist
2. **OAuth tokens not accessible** - Escalation engine used `app.client` which has no token in OAuth mode
3. **Missing OAuth scopes** - `team:read` and `reactions:write` not requested during install

---

## Fixes Applied

### ✅ Completed & Deployed

| Issue | Fix | Status |
|-------|-----|--------|
| Missing `slack_installations` table | Created SQL migration and ran it manually | **DEPLOYED** |
| Table schema incomplete | Dropped and recreated with all columns | **DEPLOYED** |

### ✅ Committed (Awaiting Merge & Deploy)

| Issue | Fix | Commit |
|-------|-----|--------|
| Escalation engine `not_authed` errors | Created `src/utils/authorizedClient.ts` helper | `a4e3cce` |
| Missing OAuth scopes | Added `team:read`, `reactions:write` to scopes | `c3b28a1` |

---

## Current State

### ✅ Working
- OAuth installation flow
- Question detection (`:question:` emoji added)
- Questions stored in database
- Slash commands respond (with scope limitations)

### ⚠️ Partially Working
- Escalation engine runs but fails with `not_authed` (fix committed, not deployed)

### ❌ Not Working Yet
- Escalation notifications to user groups
- Escalation notifications to channels
- Thread link generation (needs `team:read` scope)

---

## Next Steps (In Order)

### 1. Merge Branch to Main
```bash
git checkout main
git merge claude/code-review-debug-01A6mnF3fPr8BQjEGUUKkGJ5
git push origin main
```

Or via GitHub PR: https://github.com/famousdrew/slackquestion/pull/new/claude/code-review-debug-01A6mnF3fPr8BQjEGUUKkGJ5

### 2. Wait for Railway Deployment
- Watch for build completion (~2-3 minutes)
- Verify logs show new code running

### 3. Reinstall App in Each Workspace
After deploy, users MUST reinstall to get new scopes:
```
https://slackquestion-production.up.railway.app/slack/install
```

Workspaces to reinstall:
- [ ] Primary workspace (T0881AL1Z)
- [ ] Test workspace (T4GDDMCDC)

### 4. Test Full Flow
1. Post question in monitored channel
2. Verify `:question:` emoji added
3. Wait for escalation timer (default: 2 min for testing?)
4. Verify escalation notifications sent
5. Check logs for success messages

---

## Key Files Modified

```
src/index.ts                           # Added team:read, reactions:write scopes
src/services/escalationEngine.ts       # Use authorized client per workspace
src/utils/authorizedClient.ts          # NEW: Fetch tokens from installation store
migration-add-slack-installations.sql  # Database migration
BUGFIX-OAUTH-DATABASE-MIGRATION.md     # Detailed fix documentation
```

---

## Database State

**Table:** `slack_installations`

Required columns (verify with `\d slack_installations`):
- id (uuid)
- team_id (varchar)
- enterprise_id (varchar)
- bot_token (text)
- bot_user_id (varchar)
- bot_scopes (text[])
- user_token (text) **← This was missing!**
- user_id (varchar)
- user_scopes (text[])
- incoming_webhook (jsonb)
- app_id (varchar)
- token_type (varchar)
- is_enterprise_install (boolean)
- metadata (jsonb)
- installed_at (timestamp)
- updated_at (timestamp)

---

## Environment Variables (Railway)

Verify these are set:
- [ ] `SLACK_CLIENT_ID`
- [ ] `SLACK_CLIENT_SECRET`
- [ ] `SLACK_SIGNING_SECRET`
- [ ] `SLACK_STATE_SECRET`
- [ ] `DATABASE_URL`
- [ ] `PORT` (default: 3000)

---

## OAuth Scopes

**Currently requested:**
```
channels:history
channels:read
chat:write
groups:history
groups:read
reactions:read
reactions:write    ← NEW (after merge)
users:read
usergroups:read
commands
team:read          ← NEW (after merge)
```

---

## Common Errors & Solutions

### `not_authed`
**Cause:** Background task trying to use `app.client` without token
**Fix:** Use `getAuthorizedClient(teamId)` from installation store
**Status:** Fixed in commit `a4e3cce`

### `missing_scope: team:read`
**Cause:** Bot token doesn't have `team:read` permission
**Fix:** Added to OAuth scopes in commit `c3b28a1`
**Action:** Reinstall app to get new scope

### `slack_oauth_invalid_state`
**Cause:** In-memory state store lost during Railway restart
**Fix:** Use fresh browser session for OAuth flow

### `P2002 / P2022` (Prisma errors)
**Cause:** Database schema mismatch
**Fix:** Ensure migrations are run on Railway DB

---

## Logs to Watch For

**Good signs:**
```
[info] Question detected: "..."
[info] Added :question: reaction to message
[info] Successfully stored Slack installation
[info] Created authorized client for workspace
⚠️ Level 1 escalation: ... - 1 success, 0 failed
```

**Bad signs:**
```
[WARN] bolt-app Authorization of incoming event did not succeed
[error] Failed to fetch installation
[error] not_authed
[error] missing_scope
prisma:error The column ... does not exist
```

---

## Code Review Summary

### Slash Commands Assessment

**Keep (Essential):**
- `/qr-setup` - Initial wizard
- `/qr-config` - Workspace settings
- `/qr-targets` - Escalation targets
- `/qr-stats` - Analytics
- `/qr-delete-my-data` - GDPR compliance
- `/qr-export-my-data` - GDPR compliance
- `/qr-test` - Health check

**Consider Removing:**
- `/qr-test-escalation` - Debug tool
- `/qr-channel-config` - Advanced feature
- `/qr-channels` - Advanced feature
- `/qr-list-groups` - **Already missing from code** (remove from Slack app config)

---

## Questions for Next Session

1. What are the escalation timing defaults in test mode?
2. Should we add better error messages when scopes are missing?
3. Do we need retry logic for the authorized client helper?
4. Should escalation engine skip workspaces where OAuth token is expired/revoked?

---

## Quick Commands

**Check Railway logs:**
```bash
railway logs
```

**Test database connection:**
```sql
SELECT * FROM slack_installations;
SELECT COUNT(*) FROM questions WHERE status = 'unanswered';
```

**View recent questions:**
```sql
SELECT q.id, q.message_text, q.status, q.escalation_level, q.asked_at
FROM questions q
ORDER BY q.asked_at DESC
LIMIT 10;
```

**Check escalation targets:**
```sql
SELECT * FROM escalation_targets ORDER BY escalation_level, priority;
```

---

## Session Notes

- OAuth migration is more complex than Socket Mode (token management per workspace)
- Background tasks need special handling for OAuth tokens
- Database migrations must be run BEFORE deploying code changes
- Users must reinstall app when new scopes are added
- In-memory OAuth state can cause issues with Railway restarts

---

**Last Updated:** 2025-11-15 18:00 UTC
**Next Action:** Merge branch to main, deploy, reinstall apps
