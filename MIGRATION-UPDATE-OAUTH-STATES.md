# Migration Update: OAuth States Table

## What Changed

The `oauth_states` table schema was updated to fix the OAuth state store implementation. The `verifyStateParam` method must return `InstallURLOptions` according to Slack's OAuth library requirements.

## If You Haven't Run the Migration Yet

Just run the updated migration file:

```bash
psql $DATABASE_URL -f migration-add-oauth-states.sql
```

This will create the table with the correct schema including the `install_options` column.

## If You Already Ran the Old Migration

You need to add the `install_options` column to the existing table:

### Quick Fix (Recommended)

```bash
psql $DATABASE_URL -c "ALTER TABLE oauth_states ADD COLUMN IF NOT EXISTS install_options JSONB NOT NULL DEFAULT '{}'::jsonb;"
```

### Or Drop and Recreate (If No Active OAuth Flows)

Since OAuth states are temporary (expire in 10 minutes), you can safely drop and recreate:

```bash
# Drop the old table
psql $DATABASE_URL -c "DROP TABLE IF EXISTS oauth_states;"

# Run the updated migration
psql $DATABASE_URL -f migration-add-oauth-states.sql
```

## Verify the Update

Check that the column was added:

```bash
psql $DATABASE_URL -c "\d oauth_states"
```

You should see:
```
 Column         |           Type           | Nullable
----------------+--------------------------+----------
 id             | uuid                     | not null
 state          | character varying(255)   | not null
 install_options| jsonb                    | not null  ← NEW!
 expires_at     | timestamp with time zone | not null
 created_at     | timestamp with time zone | not null
```

## Deploy the Updated Code

After updating the database schema:

```bash
# 1. Pull latest code (if not already done)
git pull origin claude/fix-sla-installation-01RVt3hqMmtDTiw339pnapAw

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Build
npm run build

# 5. Deploy (Railway example)
git push
# Or: railway up
```

## Test the Fix

1. Visit your installation URL:
   ```
   https://your-domain.com/slack/install
   ```

2. Complete the OAuth flow

3. Check logs for success:
   ```bash
   railway logs | grep -i "oauth state"
   ```

   Should see:
   ```
   [info] OAuth state stored successfully
   [info] OAuth state verified successfully
   [info] Successfully stored Slack installation
   ```

4. Verify no errors:
   ```bash
   railway logs | grep -i error | grep -i oauth
   ```

   Should be empty (no OAuth-related errors)

## What This Fixes

**Before:**
- `verifyStateParam` returned `void`
- Slack's OAuth handler couldn't get installation options
- Error: "Redirect url is missing the state query parameter"

**After:**
- `verifyStateParam` returns `InstallURLOptions`
- Installation options properly passed through OAuth flow
- OAuth completes successfully ✅

## Troubleshooting

### Error: "column install_options does not exist"

You need to add the column:
```bash
psql $DATABASE_URL -c "ALTER TABLE oauth_states ADD COLUMN install_options JSONB NOT NULL DEFAULT '{}'::jsonb;"
```

### Error: "null value in column install_options violates not-null constraint"

Clear any existing states and let them be recreated:
```bash
psql $DATABASE_URL -c "DELETE FROM oauth_states WHERE install_options IS NULL;"
```

### Still Getting "missing state" Error

1. Verify migration applied:
   ```bash
   psql $DATABASE_URL -c "\d oauth_states"
   ```

2. Check code is deployed:
   ```bash
   railway logs | grep "OAuth state stored successfully"
   ```

3. Clear browser cookies and try OAuth flow again

4. Check Railway environment variables are set:
   ```bash
   railway variables | grep SLACK
   ```

## Summary

The key fix was making `verifyStateParam` return the `InstallURLOptions` instead of `void`. This required:

1. Adding `install_options JSONB` column to database
2. Storing `installOptions` in `generateStateParam`
3. Returning `installOptions` from `verifyStateParam`

This matches the Slack Bolt OAuth documentation for custom state stores.
