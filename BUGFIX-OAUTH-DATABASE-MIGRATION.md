# Bug Fix: Question Router Not Picking Up Questions After OAuth Migration

## Problem Summary

After migrating from Socket Mode to OAuth V2, the question router stopped detecting and storing questions in Slack channels.

## Root Cause

**Database Schema Mismatch:** The production database was missing the `slack_installations` table that was added during the OAuth V2 migration. This caused authorization failures for all incoming Slack events.

### Error Logs

```
[error] Failed to fetch installation {"error":"Invalid `prisma.slackInstallation.findUnique()` invocation: The column `slack_installations.user_token` does not exist in the current database."}
[WARN]  bolt-app Authorization of incoming event did not succeed. No listeners will be called.
```

### Impact Chain

1. **Database migration not run** → `slack_installations` table missing
2. **OAuth authorization fails** → Cannot fetch installation tokens
3. **Event authorization fails** → "No listeners will be called"
4. **Message handler never fires** → Questions not detected or stored
5. **Escalation engine has nothing to escalate** → Complete system failure

## The Fix

### 1. Database Migration

Created `migration-add-slack-installations.sql` to add the missing table:

```sql
CREATE TABLE IF NOT EXISTS slack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id VARCHAR(255) UNIQUE,
  enterprise_id VARCHAR(255) UNIQUE,
  bot_token TEXT NOT NULL,
  bot_user_id VARCHAR(255) NOT NULL,
  bot_scopes TEXT[] NOT NULL DEFAULT '{}',
  user_token TEXT,
  user_id VARCHAR(255),
  user_scopes TEXT[] NOT NULL DEFAULT '{}',
  incoming_webhook JSONB,
  app_id VARCHAR(255) NOT NULL,
  token_type VARCHAR(50) DEFAULT 'bot' NOT NULL,
  is_enterprise_install BOOLEAN DEFAULT false NOT NULL,
  metadata JSONB,
  installed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
```

### 2. Deployment Steps

**On Railway (or your hosting platform):**

1. **Run the migration:**
   ```bash
   railway run psql $DATABASE_URL -f migration-add-slack-installations.sql
   ```

2. **Verify table creation:**
   ```bash
   railway run psql $DATABASE_URL -c "\d slack_installations"
   ```

3. **Reinstall the Slack app** to populate the table:
   - Visit your app's install URL: `https://your-domain.railway.app/slack/install`
   - Authorize the app for your workspace
   - This will store the OAuth tokens in the new `slack_installations` table

4. **Redeploy the service:**
   ```bash
   git push origin claude/code-review-debug-01A6mnF3fPr8BQjEGUUKkGJ5
   ```

5. **Verify the fix:**
   - Post a question in a monitored channel
   - Check logs for: `[info] Question detected: "..."`
   - Verify the :question: emoji is added to your message

## Prevention

### For Future Migrations

1. **Always run database migrations before deploying code changes**
2. **Use Prisma's migration workflow:**
   ```bash
   npx prisma migrate dev --name add-slack-installations
   npx prisma migrate deploy  # for production
   ```
3. **Add migration checks to CI/CD pipeline**
4. **Document migration steps in deployment guides**

### Database Migration Checklist

- [ ] Create migration SQL file
- [ ] Test migration on local database
- [ ] Run migration on staging environment
- [ ] Verify schema matches Prisma schema
- [ ] Run migration on production
- [ ] Verify with `\d table_name` in psql
- [ ] Test app functionality
- [ ] Monitor error logs for authorization issues

## Related Files

- `src/oauth/installer.ts` - OAuth installation store (uses slack_installations table)
- `prisma/schema.prisma` - Schema definition (line 217-238: SlackInstallation model)
- `src/index.ts` - Bolt app initialization with OAuth receiver
- `migration-add-slack-installations.sql` - Database migration (NEW)

## Testing

After applying the fix:

1. **Test OAuth flow:**
   ```bash
   curl https://your-domain.railway.app/slack/install
   ```

2. **Test question detection:**
   - Post: "How do I test this bot?"
   - Expect: :question: reaction added
   - Check database: `SELECT * FROM questions ORDER BY created_at DESC LIMIT 5;`

3. **Check logs for errors:**
   ```bash
   railway logs
   ```
   - Should NOT see: "Authorization of incoming event did not succeed"
   - Should see: "Question detected: ..."

## References

- [Slack OAuth V2 Documentation](https://api.slack.com/authentication/oauth-v2)
- [Bolt for JavaScript - OAuth](https://slack.dev/bolt-js/concepts#authenticating-oauth)
- Original OAuth migration commit: `ce5da0c`
