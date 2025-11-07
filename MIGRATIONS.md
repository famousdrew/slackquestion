# Database Migrations Guide

This document explains how to set up and migrate your Slack Question Router database.

## For New Installations

If you're setting up the bot for the first time:

### Option 1: Use Prisma (Recommended)

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates all tables)
npx prisma db push
```

This will create all tables based on `prisma/schema.prisma`.

### Option 2: Use SQL Script

Alternatively, run the initialization script:

```bash
psql -h <host> -U <user> -d <database> -f init-database.sql
```

Then generate the Prisma client:

```bash
npx prisma generate
```

---

## For Existing Installations

If you're upgrading from an earlier version, run migrations in this order:

### Migration 1: Answer Detection Mode
**When:** Upgrading from v1.0 to v1.1+
**File:** `add-answer-detection-mode.sql`
**What it does:** Adds `answer_detection_mode` column to workspace_config table

```sql
ALTER TABLE public.workspace_config
ADD COLUMN IF NOT EXISTS answer_detection_mode TEXT DEFAULT 'emoji_only';
```

### Migration 2: Migrated to Targets Flag
**When:** Upgrading to flexible escalation targets system (Nov 2024)
**File:** `migration-add-migrated-to-targets.sql`
**What it does:** Adds tracking flag for legacy config migration

```sql
ALTER TABLE workspace_config
ADD COLUMN IF NOT EXISTS migrated_to_targets BOOLEAN NOT NULL DEFAULT false;
```

### Migration 3: Remove Email Column ⚠️
**When:** Upgrading to privacy-focused version (Jan 2025+)
**File:** `migration-remove-email-column.sql`
**What it does:** Removes email addresses from users table (privacy improvement)

### Migration 4: Zendesk Side Conversations
**When:** Adding Zendesk side conversation tracking (Jan 2025+)
**File:** `migration-add-side-conversations.sql`
**What it does:** Adds fields to track questions from Zendesk side conversations

```sql
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS is_side_conversation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS zendesk_ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS source_app TEXT DEFAULT 'slack';

CREATE INDEX IF NOT EXISTS idx_questions_side_conversation
  ON questions(is_side_conversation, status, asked_at);
```

### Migration 3 (Continued): Remove Email Column ⚠️

```sql
ALTER TABLE users DROP COLUMN IF EXISTS email;
```

**⚠️ Warning:** This permanently deletes email data. If you need to keep emails, create a backup first:

```sql
-- Backup before migration
CREATE TABLE users_email_backup AS
SELECT slack_user_id, email FROM users WHERE email IS NOT NULL;
```

### Migration 5: Enable Row-Level Security (RLS)
**When:** Adding security hardening (Jan 2025+)
**File:** `migration-enable-rls.sql`
**What it does:** Enables RLS on all tables to prevent unauthorized access

```sql
-- Enable RLS on tables
ALTER TABLE channel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_config ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role access
CREATE POLICY "Enable all access for service role" ON channel_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role" ON daily_stats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role" ON escalation_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role" ON escalation_targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role" ON user_expertise FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for service role" ON workspace_config FOR ALL USING (true) WITH CHECK (true);
```

**Note:** This adds protection against unauthorized access while maintaining full access for your application via the service role.

---

## How to Apply Migrations

### Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and run the SQL
5. Verify with the check queries below

### Using psql Command Line

```bash
# Connect to your database
psql $DATABASE_URL

# Run a migration
\i migration-filename.sql

# Exit
\q
```

---

## Verification Queries

Check if migrations have been applied:

```sql
-- Check for answer_detection_mode column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'workspace_config' AND column_name = 'answer_detection_mode';

-- Check for migrated_to_targets column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'workspace_config' AND column_name = 'migrated_to_targets';

-- Check if email column exists (should NOT exist after migration 3)
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'email';

-- Check for side conversation columns (migration 4)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name IN ('is_side_conversation', 'zendesk_ticket_id', 'source_app');

-- Check RLS is enabled (migration 5)
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'channel_config',
  'daily_stats',
  'escalation_events',
  'escalation_targets',
  'user_expertise',
  'workspace_config'
)
ORDER BY tablename;
```

---

## Migration Order Summary

For existing installations upgrading to latest version, run in this order:

1. ✅ `add-answer-detection-mode.sql` (if not already applied)
2. ✅ `migration-add-migrated-to-targets.sql` (if not already applied)
3. ⚠️ `migration-remove-email-column.sql` (January 2025)
4. ✅ `migration-add-side-conversations.sql` (January 2025 - Zendesk integration)
5. ✅ `migration-enable-rls.sql` (January 2025 - Security hardening)

**All migrations are safe to re-run** - they use `IF NOT EXISTS` or `IF EXISTS` clauses.

---

## Other Files

- **`enable-rls.sql`** - Row Level Security policies (optional, for multi-tenant Supabase setups)
- **`init-database.sql`** - Full schema creation (new installations only)

---

## Troubleshooting

**"Column already exists" error:**
All migrations use `IF NOT EXISTS` or `IF EXISTS` - safe to re-run.

**Need to rollback email migration:**
You can't restore deleted data. Use the backup table if you created one.

**Prisma schema out of sync:**
After running SQL migrations, regenerate Prisma client:
```bash
npx prisma generate
```

**Application won't start:**
Make sure you've applied all required migrations and restarted the app.

---

## Questions?

See the main [README.md](README.md) for setup instructions or open an issue on GitHub.
