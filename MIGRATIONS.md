# Database Migrations

This document explains how to apply database migrations for the Slack Question Router.

## Current Migration Status

### ⚠️ URGENT: Missing Column (November 7, 2024)

**Problem:** The `workspace_config.migrated_to_targets` column is missing from your production database, causing this error:
```
The column `workspace_config.migrated_to_targets` does not exist in the current database.
```

**Solution:** Apply the migration immediately to fix the runtime error.

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migration-add-migrated-to-targets.sql`
4. Paste and run the SQL
5. Verify the column was added (output should show the new column)

### Option 2: Using psql Command Line

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration
\i migration-add-migrated-to-targets.sql

# Exit
\q
```

### Option 3: Using Prisma Migrate (For Development)

```bash
# Generate migration from schema
npx prisma migrate dev --name add_migrated_to_targets

# Apply to production (use with caution!)
npx prisma migrate deploy
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'workspace_config'
AND column_name = 'migrated_to_targets';
```

Expected output:
```
column_name          | data_type | column_default
---------------------|-----------|---------------
migrated_to_targets  | boolean   | false
```

## Restarting Your Application

After applying the migration:

1. **Railway**: The app will auto-restart, or trigger a manual redeploy
2. **Manual deployment**: Restart your Node.js process

The error should disappear and escalations will work correctly.

## Migration Files

- `migration-add-migrated-to-targets.sql` - Adds the missing boolean column

## Future Migrations

When the Prisma schema changes:

1. Check if new migrations are needed
2. Look for `*.sql` files in the root directory
3. Apply them in order (by date/filename)
4. Always test in development first

## Rollback

If you need to rollback this specific migration:

```sql
ALTER TABLE workspace_config DROP COLUMN IF EXISTS migrated_to_targets;
```

**Warning:** Only rollback if you're also reverting the code that uses this column!

## Questions?

- Check the logs for error messages
- Verify your DATABASE_URL is correct
- Ensure you have database write permissions
