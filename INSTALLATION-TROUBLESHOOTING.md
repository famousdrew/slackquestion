# Installation Troubleshooting Guide

## Installing to a 2nd Slack Workspace

This guide helps troubleshoot issues when installing Question Router to multiple Slack workspaces.

## Quick Diagnosis

Run this command to check if your deployment is ready for multiple installations:

```bash
node check-installation-readiness.js
```

---

## Common Issues and Solutions

### Issue 1: "Installation not found" errors

**Symptoms:**
- Bot doesn't respond to commands
- Events not being processed
- Logs show "Installation not found" errors

**Causes:**
- Missing `slack_installations` table
- OAuth flow didn't complete successfully
- Database migration not run

**Solutions:**

1. **Check if table exists:**
```bash
psql $DATABASE_URL -c "\d slack_installations"
```

2. **If table is missing, run migration:**
```bash
psql $DATABASE_URL -f migration-add-slack-installations.sql
```

3. **Verify Prisma client is updated:**
```bash
npx prisma generate
```

4. **Check existing installations:**
```bash
psql $DATABASE_URL -c "SELECT team_id, bot_user_id, installed_at FROM slack_installations;"
```

---

### Issue 2: OAuth Flow Fails

**Symptoms:**
- `/slack/install` redirects but shows error
- "invalid_client_id" or "invalid_redirect_uri" errors
- Installation completes but bot doesn't work

**Causes:**
- Wrong Slack app credentials
- Redirect URL not configured in Slack app settings
- SLACK_STATE_SECRET not set or changed between requests

**Solutions:**

1. **Verify environment variables:**
```bash
# Check these are set:
echo $SLACK_CLIENT_ID
echo $SLACK_CLIENT_SECRET
echo $SLACK_SIGNING_SECRET
echo $SLACK_STATE_SECRET  # Should be a random 32-char string
```

2. **Generate SLACK_STATE_SECRET if missing:**
```bash
openssl rand -hex 16
```

3. **Verify Slack app configuration:**
   - Go to https://api.slack.com/apps
   - Select your app
   - Go to "OAuth & Permissions"
   - Verify "Redirect URLs" includes: `https://your-domain.com/slack/oauth_redirect`

4. **Check scopes are correctly configured:**
   Required Bot Token Scopes:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `groups:history`
   - `groups:read`
   - `reactions:read`
   - `reactions:write`
   - `team:read`
   - `users:read`
   - `usergroups:read`
   - `commands`

---

### Issue 3: Multiple Apps vs. Same App in Multiple Workspaces

**Important:** You need to understand which scenario applies:

#### Scenario A: Same Slack App, Multiple Workspaces ✅ (Recommended)
- **Use case:** You want to install the same app to multiple Slack workspaces
- **Configuration:** Use ONE set of Slack app credentials (Client ID, Secret, etc.)
- **How it works:** Each workspace gets its own entry in `slack_installations` table
- **OAuth URL:** Same URL for all workspaces: `https://your-domain.com/slack/install`

#### Scenario B: Different Slack Apps, Same Deployment ⚠️ (Advanced)
- **Use case:** You have separate Slack apps for testing/production
- **Configuration:** Need separate deployments OR environment-based configuration
- **Complexity:** Higher - not recommended unless necessary

**For most users, Scenario A is what you want!**

---

### Issue 4: Database Constraint Violations

**Symptoms:**
- Error: "Unique constraint failed on the fields: (`team_id`)"
- Installation fails during OAuth callback

**Causes:**
- Trying to reinstall to the same workspace
- Database has stale/corrupted data

**Solutions:**

1. **Check existing installations:**
```bash
psql $DATABASE_URL -c "SELECT id, team_id, bot_user_id, installed_at FROM slack_installations;"
```

2. **If reinstalling to same workspace (updates existing installation):**
   - This is normal! The upsert should handle it
   - If you see this error, there might be a bug in the installation store

3. **To force a fresh installation (deletes existing):**
```bash
# DANGER: This will remove the installation and all associated data
psql $DATABASE_URL -c "DELETE FROM slack_installations WHERE team_id = 'T01234567';"
```

---

### Issue 5: Bot Works in First Workspace, Not Second

**Symptoms:**
- Bot responds to commands in first workspace
- Bot silent in second workspace
- No errors in logs for second workspace

**Causes:**
- Installation succeeded but workspace not set up
- Bot not invited to channels in second workspace
- Slack app event subscriptions not configured

**Solutions:**

1. **Verify installation exists:**
```bash
node get-installations.js  # Lists all installed workspaces
```

2. **Check workspaces table:**
```bash
psql $DATABASE_URL -c "SELECT slack_team_id, team_name, created_at FROM workspaces;"
```

3. **Invite bot to channels in 2nd workspace:**
   - In Slack: `/invite @Question Router` in each channel

4. **Verify Event Subscriptions:**
   - Go to https://api.slack.com/apps → Your App → "Event Subscriptions"
   - Request URL should be: `https://your-domain.com/slack/events`
   - Should show ✅ Verified
   - Subscribe to bot events:
     - `message.channels`
     - `message.groups`
     - `reaction_added`
     - `reaction_removed`
     - `app_home_opened`

5. **Check logs for events:**
```bash
# Look for "Message received" or "Installation not found"
grep -i "team_id" your-app.log
```

---

### Issue 6: Deployment Platform Issues (Railway, Render, etc.)

**Symptoms:**
- OAuth flow starts but times out
- Intermittent "Installation not found" errors
- Works locally but not in production

**Causes:**
- Environment variables not set in production
- Database not accessible from deployment
- Multiple instances/containers causing state issues
- PORT not configured correctly

**Solutions:**

1. **Railway-specific:**
```bash
# Check deployment status
railway logs

# Verify environment variables are set
railway variables

# Check service is running
railway status
```

2. **Verify DATABASE_URL is accessible:**
```bash
# Test database connection from deployment
railway run psql $DATABASE_URL -c "SELECT 1;"
```

3. **Check service is bound to correct port:**
   - Railway provides a PORT environment variable
   - Ensure your app uses: `process.env.PORT || 3000`
   - Check `src/index.ts` line 189

4. **For multiple instances:**
   - OAuth state is stored in memory (potential issue!)
   - If deployment has multiple containers, state may be lost
   - Solution: Use sticky sessions OR database-backed state storage

---

## Step-by-Step: Installing to a 2nd Workspace

1. **Verify first installation is working:**
```bash
node check-installation-readiness.js
```

2. **Get installation URL:**
```bash
echo "https://$(railway domain)/slack/install"
# Or your custom domain
```

3. **Open URL in browser and select 2nd workspace:**
   - You'll be prompted to select a workspace
   - Choose the NEW workspace (not already installed)
   - Click "Allow"

4. **Verify installation succeeded:**
```bash
psql $DATABASE_URL -c "SELECT team_id, bot_user_id, installed_at FROM slack_installations ORDER BY installed_at DESC LIMIT 5;"
```

5. **Test in 2nd workspace:**
   - Run `/qr-test` command
   - Should see: "Question Router is running!"

6. **Complete setup in 2nd workspace:**
   - Run `/qr-setup`
   - Configure escalation settings
   - Invite bot to channels: `/invite @Question Router`

---

## Debugging Tips

### Enable Debug Logging

Add to your `.env` or Railway variables:
```
LOG_LEVEL=debug
```

### Check OAuth Flow

Monitor logs during installation:
```bash
# Railway
railway logs --follow

# Local
npm run dev
```

Look for:
- "Storing Slack installation" (success)
- "Successfully stored Slack installation" (success)
- "Failed to store installation" (error)

### Verify Token Storage

After installation, check the installation was stored:
```bash
psql $DATABASE_URL -c "SELECT team_id, bot_user_id, bot_scopes, installed_at FROM slack_installations WHERE team_id = 'T01234567';"
```

### Test Token Retrieval

The app should fetch tokens from database when receiving events:
```bash
# In logs, look for:
# "Fetching Slack installation for team: T01234567"
# "Successfully fetched installation"
```

---

## Still Having Issues?

### Create a Support Issue

Include this diagnostic information:

1. **Run diagnostics:**
```bash
node check-installation-readiness.js > diagnostics.txt 2>&1
```

2. **Check recent installations:**
```bash
psql $DATABASE_URL -c "SELECT id, team_id, bot_user_id, installed_at, updated_at FROM slack_installations ORDER BY installed_at DESC;" >> diagnostics.txt
```

3. **Check workspaces:**
```bash
psql $DATABASE_URL -c "SELECT id, slack_team_id, team_name, created_at FROM workspaces;" >> diagnostics.txt
```

4. **Recent logs:**
```bash
railway logs --tail 100 >> diagnostics.txt
```

5. **Share `diagnostics.txt` with error details**

---

## Prevention Checklist

Before installing to additional workspaces:

- [ ] Database has `slack_installations` table
- [ ] All environment variables set (especially `SLACK_STATE_SECRET`)
- [ ] OAuth redirect URL configured in Slack app settings
- [ ] Event subscriptions enabled and verified
- [ ] Bot has all required scopes
- [ ] Deployment is healthy and accessible
- [ ] First installation is working correctly

---

## Advanced: Installing Different Apps

If you need to run multiple Slack apps (e.g., testing vs. production):

### Option 1: Separate Deployments (Recommended)
- Deploy to two different environments
- Each has its own DATABASE_URL and Slack app credentials
- Clean separation of data

### Option 2: Single Deployment (Complex)
- Requires code changes to support multiple app configurations
- Not currently supported by default
- Would need to modify `src/index.ts` to accept multiple client IDs

**Recommendation:** Use Option 1 (separate deployments) for simplicity and security.
