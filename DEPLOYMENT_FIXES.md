# OAuth Deployment Fixes - Session Summary

## Overview
Successfully debugged and fixed the Slack OAuth deployment on Railway. The app is now live and accepting events at `https://slackquestion-production.up.railway.app/`

## Issues Fixed

### 1. OAuth Configuration Conflict
**Problem:** Two separate OAuth configurations were conflicting:
- Separate `InstallProvider` in `src/oauth/installer.ts`
- `ExpressReceiver` with OAuth params in `src/index.ts`

**Solution:** (Commit `c7d3d0d`)
- Refactored to export only `installationStore` from `installer.ts`
- Removed separate `InstallProvider` instance
- `ExpressReceiver` now uses the installationStore directly
- This allows ExpressReceiver's built-in OAuth to properly register routes

**Files Changed:**
- `src/oauth/installer.ts` - Simplified to export only installationStore
- `src/index.ts` - Updated to import installationStore instead of installer

### 2. Multiple HTTP Servers on Different Ports
**Problem:** Running two HTTP servers:
- Main Bolt app on port 8080 (from PORT env var)
- Health check server on port 3001 (from HEALTH_CHECK_PORT)
- Railway only exposes one port per service

**Solution:** (Commit `9bdb691`)
- Consolidated to single HTTP server on main port
- Added `/health` endpoint to main Express receiver
- Removed separate health check server entirely

**Files Changed:**
- `src/index.ts` - Added `/health` route to receiver.router, removed health check server startup

### 3. Railway Port Mismatch (Critical Issue!)
**Problem:** Railway had custom port setting of 3001, but app was listening on 8080
- Railway's load balancer was routing to port 3001
- App was listening on port 8080
- Result: 502 Bad Gateway errors

**Solution:**
- Discovered Railway's custom port setting in Settings → Networking
- Changed Railway port from 3001 to 8080 (or removed custom port setting)
- Added `PORT=8080` to Railway environment variables

**Note:** This was the critical issue causing all 502 errors!

### 4. Server Host Binding
**Problem:** App might have been binding to `localhost` only, preventing Railway's proxy from connecting

**Solution:** (Commits `fa87c20`, `daea778`, `af8025b`)
- Explicitly bind server to `0.0.0.0` (all interfaces) instead of localhost
- Changed from `app.start(port)` to `receiver.app.listen(port, '0.0.0.0')`
- This ensures Railway's load balancer can connect to the app

**Files Changed:**
- `src/index.ts` - Modified server startup to use explicit host binding

### 5. Debug Logging
**Problem:** Needed visibility into startup process to identify where crashes occurred

**Solution:** (Commit `2fffb98`)
- Added comprehensive debug logging at each initialization step:
  - ExpressReceiver creation
  - Custom route registration
  - Bolt App initialization
  - Event handler registration
  - Server startup

**Files Changed:**
- `src/index.ts` - Added logger.info() calls throughout initialization

## Environment Variables Required

### Railway Environment Variables
```bash
# Slack OAuth Credentials
SLACK_CLIENT_ID=<your-client-id>
SLACK_CLIENT_SECRET=<your-client-secret>
SLACK_SIGNING_SECRET=<your-signing-secret>
SLACK_STATE_SECRET=<random-32-char-string>

# Database
DATABASE_URL=<supabase-postgresql-connection-string>

# Server Configuration
PORT=8080
NODE_ENV=production

# Optional
LOG_LEVEL=info
```

### Railway Port Configuration
- **CRITICAL:** Railway's custom port setting must match PORT env var (8080)
- Check: Settings → Networking → Port should be 8080 or removed to auto-detect

## Verified Endpoints

All endpoints are now working correctly:

- **Home Page:** https://slackquestion-production.up.railway.app/
  - Returns HTML landing page with "Add to Slack" button

- **Health Check:** https://slackquestion-production.up.railway.app/health
  - Returns `{"status":"ok","timestamp":"...","uptime":...}`

- **Slack Events API:** https://slackquestion-production.up.railway.app/slack/events
  - Returns 401 for unsigned requests (correct behavior)
  - Successfully responds to Slack's url_verification challenge

- **OAuth Install:** https://slackquestion-production.up.railway.app/slack/install
  - Initiates Slack OAuth flow

- **OAuth Redirect:** https://slackquestion-production.up.railway.app/slack/oauth_redirect
  - Handles OAuth callback from Slack

## Slack App Configuration

### Event Subscriptions
- **Enable Events:** ON
- **Request URL:** `https://slackquestion-production.up.railway.app/slack/events`
- **Status:** ✅ Verified

### Subscribe to Bot Events
- `message.channels`
- `message.groups`
- `reaction_added`
- `app_home_opened`

### OAuth & Permissions
- **Redirect URLs:** `https://slackquestion-production.up.railway.app/slack/oauth_redirect`
- **Bot Token Scopes:** All required scopes configured

## Key Learnings

1. **Always check Railway's custom port settings first** - This was the root cause of 502 errors
2. **Railway only exposes one port** - Don't run multiple HTTP servers
3. **Bind to 0.0.0.0 for cloud deployments** - Not localhost
4. **ExpressReceiver creates its own OAuth routes** - Don't create separate InstallProvider
5. **Debug logging is invaluable** - Helped identify exactly where issues occurred

## Next Steps

The app is now fully functional and ready for production use:
- ✅ OAuth V2 flow working
- ✅ Events API verified
- ✅ Database connected (Supabase)
- ✅ Deployment stable on Railway
- ✅ All endpoints responding correctly

Users can now install the app via the "Add to Slack" button and it will start monitoring for questions automatically.

## Commits in This Session

```
af8025b - fix: start Express server directly with explicit host binding
daea778 - fix: use Bolt's start method with host parameter
fa87c20 - fix: bind server to 0.0.0.0 for Railway deployment
2fffb98 - debug: add logging to pinpoint where startup crashes
9bdb691 - fix: consolidate HTTP servers to single port for Railway
c8f6ebe - fix: move route registration before app initialization
c7d3d0d - fix: consolidate OAuth configuration to resolve /slack/events 404
```

## Status: ✅ RESOLVED AND DEPLOYED
