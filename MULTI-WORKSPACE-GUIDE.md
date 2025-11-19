# Multi-Workspace Installation Guide

## Architecture Overview

The Slack Question Router is designed to support **multiple Slack workspaces** from a single deployment. This guide explains how it works and how to properly configure it.

## How Multi-Workspace Support Works

### 1. OAuth V2 Installation Flow

```
User visits: https://your-domain.com/slack/install
    ↓
Slack OAuth authorization page
    ↓
User selects workspace and clicks "Allow"
    ↓
Callback: https://your-domain.com/slack/oauth_redirect
    ↓
Installation stored in database (slack_installations table)
    ↓
Bot is active in that workspace
```

### 2. Token Storage (Per Workspace)

Each workspace installation stores:
- **Bot Token** (`xoxb-...`) - Used for all API calls
- **Team ID** (`T01234567`) - Unique identifier for the workspace
- **Bot User ID** (`U01234567`) - The bot's user ID in that workspace
- **Scopes** - Permissions granted by the workspace
- **Installation Metadata** - Full installation object as backup

**Database Table:** `slack_installations`

```sql
CREATE TABLE slack_installations (
  id UUID PRIMARY KEY,
  team_id VARCHAR UNIQUE,           -- One entry per workspace
  bot_token TEXT,                   -- Workspace-specific token
  bot_user_id VARCHAR,
  bot_scopes VARCHAR[],
  installed_at TIMESTAMP,
  ...
);
```

### 3. Event Routing (Per Workspace)

When an event arrives from Slack:

```typescript
// 1. Extract team ID from event
const teamInfo = await client.team.info();
const teamId = teamInfo.team?.id;  // e.g., "T01234567"

// 2. Get or create workspace record
const workspace = await ensureWorkspace(teamId);

// 3. Fetch correct bot token from database
const installation = await prisma.slackInstallation.findUnique({
  where: { teamId: teamId }
});

// 4. Create authorized client with workspace-specific token
const authorizedClient = new WebClient(installation.botToken);

// 5. Process event with correct token
await authorizedClient.chat.postMessage({...});
```

**Key Files:**
- `src/utils/authorizedClient.ts` - Fetches workspace-specific tokens
- `src/oauth/installer.ts` - Stores/retrieves installations
- `src/events/messageHandler.ts` - Extracts team ID from events

### 4. Background Jobs (All Workspaces)

The escalation engine runs on a timer and processes **all workspaces**:

```typescript
// Every 30 seconds
async function checkForEscalations() {
  // Get all workspaces
  const workspaces = await prisma.workspace.findMany();

  // Process each workspace with its own config and token
  for (const workspace of workspaces) {
    const config = await getWorkspaceConfig(workspace.id);
    const client = await getAuthorizedClient(workspace.slackTeamId);

    // Check unanswered questions for this workspace
    const questions = await prisma.question.findMany({
      where: { workspaceId: workspace.id, status: 'unanswered' }
    });

    // Escalate using workspace-specific settings
    for (const question of questions) {
      await escalateQuestion(question, config, client);
    }
  }
}
```

**Key File:** `src/services/escalationEngine.ts`

## Configuration Requirements

### One Slack App, Multiple Workspaces ✅ (Recommended)

This is the standard SaaS model and what the app is designed for.

**Setup:**
1. Create ONE Slack app at https://api.slack.com/apps
2. Configure OAuth redirect URL: `https://your-domain.com/slack/oauth_redirect`
3. Set environment variables ONCE in your deployment
4. Share the same installation URL with all workspaces
5. Each workspace authorizes the same app

**Environment Variables:**
```bash
# Same credentials for all workspaces
SLACK_CLIENT_ID=1234567890.1234567890
SLACK_CLIENT_SECRET=xxxxx
SLACK_SIGNING_SECRET=xxxxx
SLACK_STATE_SECRET=xxxxx  # Random 32-char string
DATABASE_URL=postgresql://...
```

**Installation URL:** Same for all workspaces
```
https://your-domain.com/slack/install
```

**Benefits:**
- ✅ Simple configuration
- ✅ Single deployment
- ✅ Centralized management
- ✅ Easy updates
- ✅ Shared database with workspace isolation

### Different Slack Apps (Testing vs. Production) 🔶

If you need separate apps (e.g., dev/staging/prod), use **separate deployments**.

**Setup:**
1. Create separate Slack apps for each environment
2. Deploy to separate environments (e.g., staging.example.com, app.example.com)
3. Each deployment has its own database and credentials

**NOT recommended:** Using multiple Slack apps in a single deployment
- ❌ App currently doesn't support this
- ❌ Would require code changes to switch credentials
- ❌ Complex to maintain

## Verifying Multi-Workspace Support

### Step 1: Check Database Schema

```bash
# Verify slack_installations table exists
psql $DATABASE_URL -c "\d slack_installations"

# Should show:
# - team_id (UNIQUE constraint)
# - bot_token
# - bot_user_id
# ... etc
```

### Step 2: Run Diagnostic Script

```bash
node check-installation-readiness.js
```

This checks:
- ✅ Environment variables set
- ✅ Database connection
- ✅ slack_installations table exists
- ✅ Current installations
- ✅ Unique constraints properly configured

### Step 3: List Current Installations

```bash
node get-installations.js
```

Shows all workspaces currently installed.

## Installing to Additional Workspaces

### Pre-Installation Checklist

- [ ] First workspace is working correctly
- [ ] `slack_installations` table exists in database
- [ ] Environment variables are set (especially `SLACK_STATE_SECRET`)
- [ ] OAuth redirect URL configured in Slack app
- [ ] Deployment is accessible via HTTPS

### Installation Steps

1. **Get your installation URL:**
   ```bash
   echo "https://your-domain.com/slack/install"
   ```

2. **Share URL with workspace admin**
   - Can be different person from first workspace
   - They must be admin in their workspace
   - They click "Add to Slack" and authorize

3. **Verify installation succeeded:**
   ```bash
   node get-installations.js
   ```

   Should show new installation with different `team_id`

4. **Test in new workspace:**
   - Go to new Slack workspace
   - Run `/qr-test` command
   - Should respond: "Question Router is running!"

5. **Complete setup in new workspace:**
   - Run `/qr-setup` to configure escalation settings
   - Invite bot to channels: `/invite @Question Router`
   - Post a test question

### Each Workspace Has Independent:

✅ **Configuration:**
- Escalation timing (first/second/final escalation minutes)
- Answer detection mode (emoji_only, thread_auto, hybrid)
- Escalation targets (user groups, channels, users)

✅ **Data:**
- Questions
- Users
- Channels
- Statistics

✅ **Bot Identity:**
- Bot user ID (different in each workspace)
- Bot name/avatar (controlled by each workspace)

❌ **Not Independent:**
- Slack app credentials (shared across all workspaces)
- Database (same database, but data is isolated by workspace_id)
- Deployment URL (same URL serves all workspaces)

## Data Isolation

All database tables have `workspace_id` foreign key to ensure isolation:

```typescript
// Questions are always scoped to a workspace
const questions = await prisma.question.findMany({
  where: {
    workspaceId: workspace.id,  // Always filtered by workspace
    status: 'unanswered'
  }
});

// Config is per-workspace
const config = await prisma.workspaceConfig.findUnique({
  where: { workspaceId: workspace.id }
});

// Escalation targets are per-workspace
const targets = await prisma.escalationTarget.findMany({
  where: {
    workspaceId: workspace.id,
    escalationLevel: 1
  }
});
```

**Security:** Workspaces cannot see each other's data due to:
1. Database-level isolation via `workspace_id` filtering
2. Slack API authentication (each request uses workspace-specific token)
3. Event context (Slack includes team ID in all events)

## Troubleshooting Multi-Workspace Issues

See: `INSTALLATION-TROUBLESHOOTING.md`

### Quick Checks

```bash
# 1. How many workspaces are installed?
node get-installations.js

# 2. Are installations valid?
psql $DATABASE_URL -c "SELECT team_id, bot_user_id, bot_scopes, installed_at FROM slack_installations;"

# 3. Do workspaces have configs?
psql $DATABASE_URL -c "SELECT w.slack_team_id, w.team_name, c.answer_detection_mode, c.first_escalation_minutes FROM workspaces w LEFT JOIN workspace_config c ON w.id = c.workspace_id;"

# 4. Check recent questions across all workspaces
psql $DATABASE_URL -c "SELECT w.team_name, c.channel_name, q.message_text, q.status FROM questions q JOIN workspaces w ON q.workspace_id = w.id JOIN channels c ON q.channel_id = c.id ORDER BY q.asked_at DESC LIMIT 10;"
```

### Common Issues

**Issue:** Bot works in Workspace A, not Workspace B
- **Check:** Did installation complete for Workspace B?
- **Run:** `node get-installations.js` - Should see both workspaces
- **Fix:** If Workspace B missing, reinstall via `/slack/install`

**Issue:** Events not reaching bot in second workspace
- **Check:** Event subscriptions URL verified in Slack app settings?
- **URL:** Must be `https://your-domain.com/slack/events` (not workspace-specific)
- **Fix:** Verify URL shows ✅ in Slack app settings

**Issue:** Database errors about duplicate team_id
- **Check:** This is actually OK! Upsert will update existing installation
- **Meaning:** User reinstalled to same workspace (token refreshed)

## Scaling Considerations

### Current Limits

The app can handle:
- ✅ **Unlimited workspaces** (limited by database/server resources)
- ✅ **Concurrent events** (async processing per workspace)
- ✅ **Large workspaces** (1000+ users, 100+ channels)

### Performance

The escalation engine processes all workspaces every 30 seconds:
- Efficient: Only fetches unanswered questions
- Isolated: Each workspace uses its own database transaction
- Scalable: No shared state between workspaces

### Database Growth

Each workspace adds:
- 1 row to `slack_installations`
- 1 row to `workspaces`
- N rows to `channels` (one per monitored channel)
- M rows to `questions` (one per detected question)

**Estimated Storage:**
- 100 workspaces × 10 channels × 100 questions/day × 90 days = 9M rows
- Questions table: ~1KB per row = ~9GB
- Postgres handles this easily with proper indexing ✅

### When to Shard/Scale

Consider multiple deployments when:
- 🔴 100+ workspaces per deployment
- 🔴 High-volume workspaces (>1000 questions/day)
- 🔴 Escalation engine taking >5 seconds per cycle
- 🔴 Database queries slowing down

**Scaling Strategy:**
1. Start with single deployment (handles 99% of use cases)
2. Add read replicas for database if needed
3. Scale vertically (more CPU/RAM) before horizontally
4. Consider regional deployments for global customers

## Best Practices

### For Deployment

1. **Use environment-based secrets:**
   ```bash
   # Railway, Render, Heroku, etc.
   railway variables set SLACK_STATE_SECRET=$(openssl rand -hex 16)
   ```

2. **Enable logging:**
   ```bash
   LOG_LEVEL=info  # or 'debug' for troubleshooting
   ```

3. **Monitor installations:**
   ```bash
   # Add to cron or Railway scheduled job
   node get-installations.js | mail -s "Current Installations" admin@example.com
   ```

4. **Backup database regularly:**
   - Slack tokens are stored in database
   - Losing `slack_installations` table = need to reinstall all workspaces

### For Support

1. **Identify workspace by team_id:**
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM workspaces WHERE slack_team_id = 'T01234567';"
   ```

2. **Check workspace health:**
   ```bash
   # Questions asked today
   psql $DATABASE_URL -c "SELECT COUNT(*) FROM questions WHERE workspace_id = 'xxx' AND asked_at > NOW() - INTERVAL '1 day';"

   # Escalation targets configured
   psql $DATABASE_URL -c "SELECT * FROM escalation_targets WHERE workspace_id = 'xxx';"
   ```

3. **Assist with reinstallation:**
   - Send them: `https://your-domain.com/slack/install`
   - Reinstalling updates token (doesn't delete data)

### For Users

1. **Each workspace is independent:**
   - Configure settings per workspace with `/qr-config`
   - Setup is not shared between workspaces

2. **Data privacy:**
   - Workspaces cannot see each other's questions/data
   - GDPR tools (`/qr-delete-my-data`) only affect current workspace

3. **Questions:**
   - Contact deployment admin if bot not responding
   - Provide workspace name and team ID for support

## Summary

✅ **The app is fully multi-workspace ready!**

The architecture properly:
- Stores per-workspace tokens in database
- Isolates data by workspace_id
- Fetches correct tokens for each event
- Processes all workspaces in background jobs
- Maintains separate configs per workspace

**To install to a 2nd workspace:**
1. Verify first workspace works: `node check-installation-readiness.js`
2. Visit: `https://your-domain.com/slack/install`
3. Select new workspace and authorize
4. Verify: `node get-installations.js`
5. Test: `/qr-test` in new workspace

**If issues occur:** See `INSTALLATION-TROUBLESHOOTING.md`
