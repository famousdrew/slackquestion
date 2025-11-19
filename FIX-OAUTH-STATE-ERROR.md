# Fix: OAuth State Missing Error

## Problem

When attempting to install the Slack Question Router to a second workspace (or even the first installation), users encountered this error:

```
Please try again or contact the app owner (reason: slack_oauth_missing_state)
```

## Root Cause

The OAuth flow has two steps:
1. User visits `/slack/install` → Slack generates a random "state" value → stored in memory
2. User authorizes → Slack redirects to `/slack/oauth_redirect?state=xyz` → app verifies state

**The issue:** OAuth state was stored **in memory** by default in Slack Bolt's `ExpressReceiver`.

On platforms like Railway that can restart between requests (or during deployments), the state stored in step 1 is lost by the time step 2 happens, causing the `slack_oauth_missing_state` error.

## Solution

Implemented a **database-backed state store** that persists OAuth state between requests.

### Changes Made

#### 1. Database Schema (`prisma/schema.prisma`)

Added new `OAuthState` model to store OAuth state values:

```prisma
model OAuthState {
  id        String   @id @default(uuid())
  state     String   @unique
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @default(now()) @map("created_at")

  @@index([expiresAt])
  @@map("oauth_states")
}
```

#### 2. State Store Implementation (`src/oauth/stateStore.ts`)

Created a custom state store that:
- Generates random OAuth state values
- Stores them in database with 10-minute expiry
- Verifies state on OAuth callback
- Automatically cleans up expired states
- One-time use (deleted after verification)

```typescript
export const stateStore = {
  generateStateParam: async (installOptions, now) => {
    const state = generateRandomState();
    await prisma.oAuthState.create({ data: { state, expiresAt } });
    return state;
  },

  verifyStateParam: async (now, state) => {
    const stored = await prisma.oAuthState.findUnique({ where: { state } });
    if (!stored || stored.expiresAt < now) {
      throw new Error('OAuth state not found or expired');
    }
    await prisma.oAuthState.delete({ where: { state } });
  }
};
```

#### 3. Updated App Initialization (`src/index.ts`)

Added `stateStore` to `ExpressReceiver` configuration:

```typescript
import { stateStore } from './oauth/stateStore.js';

const receiver = new ExpressReceiver({
  // ... other config ...
  installationStore,
  stateStore, // NEW: Database-backed state store
  installerOptions: { directInstall: true },
});
```

#### 4. Integrated Cleanup (`src/services/dataCleanup.ts`)

Added OAuth state cleanup to the daily data cleanup job:

```typescript
import { cleanupExpiredStates } from '../oauth/stateStore.js';

export async function runDataCleanup() {
  // ... other cleanup tasks ...
  const oauthStatesDeleted = await cleanupExpiredStates();
  // ...
}
```

This ensures expired states are cleaned up automatically and the `oauth_states` table doesn't grow indefinitely.

#### 5. Database Migration (`migration-add-oauth-states.sql`)

Created SQL migration to add the `oauth_states` table:

```sql
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx ON oauth_states(expires_at);
```

### Additional Improvements

#### 6. Diagnostic Tools

Created helper scripts to troubleshoot installation issues:

- **`check-installation-readiness.js`**: Verifies environment and database are ready for installations
- **`get-installations.js`**: Lists all installed workspaces
- **`INSTALLATION-TROUBLESHOOTING.md`**: Comprehensive troubleshooting guide
- **`MULTI-WORKSPACE-GUIDE.md`**: Detailed architecture and setup guide

## Deployment Steps

### For Existing Deployments

1. **Pull the latest code:**
   ```bash
   git pull origin claude/fix-sla-installation-01RVt3hqMmtDTiw339pnapAw
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run database migration:**
   ```bash
   psql $DATABASE_URL -f migration-add-oauth-states.sql
   ```

4. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

5. **Build the project:**
   ```bash
   npm run build
   ```

6. **Deploy to Railway/Render:**
   ```bash
   git push
   # Or use Railway CLI:
   railway up
   ```

7. **Verify deployment:**
   ```bash
   # Check oauth_states table exists
   psql $DATABASE_URL -c "\d oauth_states"

   # Run diagnostic
   node check-installation-readiness.js
   ```

8. **Test installation:**
   - Visit: `https://your-domain.com/slack/install`
   - Authorize the app
   - Should complete successfully without `slack_oauth_missing_state` error

### For Railway

If you're using Railway, the deployment is even simpler:

```bash
# Commit changes
git add .
git commit -m "Fix OAuth state missing error with database-backed state store"
git push origin claude/fix-sla-installation-01RVt3hqMmtDTiw339pnapAw

# Railway will auto-deploy, then run migration
railway run psql $DATABASE_URL -f migration-add-oauth-states.sql
```

## Testing

### 1. Test Installation Flow

```bash
# Open installation URL
open https://your-domain.com/slack/install

# Complete authorization
# Should redirect successfully without errors
```

### 2. Test with Server Restart

```bash
# Visit /slack/install
# DON'T complete authorization yet
# Restart Railway deployment
railway restart

# Now complete authorization
# Should still work! (previously would fail)
```

### 3. Verify State Storage

```bash
# During OAuth flow, check database
psql $DATABASE_URL -c "SELECT state, expires_at, created_at FROM oauth_states ORDER BY created_at DESC LIMIT 5;"

# After successful installation, states should be cleaned up
# (deleted after verification)
```

### 4. Test Multiple Workspaces

```bash
# Install to first workspace
# Verify: node get-installations.js

# Install to second workspace
# Verify: node get-installations.js
# Should show both installations
```

## Benefits

✅ **Survives server restarts**: OAuth flow completes even if Railway restarts
✅ **Multi-workspace ready**: No issues installing to 2nd, 3rd, Nth workspace
✅ **Production-ready**: Proper state persistence for SaaS deployments
✅ **Automatic cleanup**: Expired states deleted daily, no database bloat
✅ **Secure**: One-time use, 10-minute expiry, random state generation
✅ **Observable**: Detailed logging for debugging

## Related Files

- `prisma/schema.prisma` - Added `OAuthState` model
- `src/oauth/stateStore.ts` - State store implementation
- `src/index.ts` - Updated to use state store
- `src/services/dataCleanup.ts` - Added state cleanup
- `migration-add-oauth-states.sql` - Database migration
- `check-installation-readiness.js` - Diagnostic tool
- `get-installations.js` - List installations
- `INSTALLATION-TROUBLESHOOTING.md` - Troubleshooting guide
- `MULTI-WORKSPACE-GUIDE.md` - Architecture guide
- `README.md` - Updated with migration instructions

## Verification

After deploying, verify the fix:

```bash
# 1. Check table exists
psql $DATABASE_URL -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'oauth_states';"
# Should return: 1

# 2. Run diagnostics
node check-installation-readiness.js
# Should show all checks passing

# 3. Test installation
# Visit https://your-domain.com/slack/install
# Should complete without errors

# 4. Check logs for state storage
railway logs | grep -i "oauth state"
# Should see: "OAuth state stored successfully"
# Should see: "OAuth state verified successfully"
```

## Rollback Plan

If you need to rollback:

```bash
# 1. Revert code changes
git revert HEAD

# 2. Remove oauth_states table (optional)
psql $DATABASE_URL -c "DROP TABLE IF EXISTS oauth_states;"

# 3. Redeploy
git push
```

Note: Rolling back will bring back the original issue. Only rollback if there are critical bugs introduced by this change.

## FAQ

**Q: Do I need to reinstall to existing workspaces?**
A: No, existing installations continue to work. This fix only affects new installations.

**Q: What if I already have some workspaces installed?**
A: They'll continue working. Just run the migration and restart your deployment. Future installations will use the new state store.

**Q: Will this affect performance?**
A: Minimal impact. State storage adds ~10ms to the OAuth flow (once per installation). Cleanup runs once daily with minimal overhead.

**Q: What if the migration fails?**
A: Check the migration logs for errors. The most common issue is insufficient database permissions. Ensure your database user can CREATE TABLE and CREATE INDEX.

**Q: How do I know the fix is working?**
A: Check logs during installation for "OAuth state stored successfully" and "OAuth state verified successfully" messages. You can also verify the oauth_states table is being used:
```bash
# During OAuth flow (before redirect)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM oauth_states;"
# Should show 1 or more active states
```

## Credits

This fix addresses the root cause of the `slack_oauth_missing_state` error that prevented multi-workspace installations. The database-backed state store is a production-ready solution suitable for SaaS deployments.
