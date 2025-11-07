# Quick Setup Guide

## Phase 1: Core Detection - Ready to Test!

The bot can now detect questions and store them in a database. Here's how to get it running:

### 1. Set Up Your Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Choose "From scratch"
3. Name it "Question Router" and select your workspace

#### Enable Socket Mode
1. Go to **Settings → Socket Mode**
2. Enable Socket Mode
3. Generate an App-Level Token with `connections:write` scope
4. Save this token as `SLACK_APP_TOKEN`

#### Add Bot Token Scopes
Go to **OAuth & Permissions** and add these scopes:
- `channels:history` - Read messages in public channels
- `channels:read` - View basic channel info
- `chat:write` - Send messages
- `commands` - Create slash commands
- `reactions:read` - View emoji reactions
- `reactions:write` - Add emoji reactions
- `team:read` - Get workspace info
- `users:read` - Get user information

#### Subscribe to Events
Go to **Event Subscriptions** and enable events:
- `message.channels` - Listen to channel messages
- `reaction_added` - Listen to reactions

#### Create Slash Commands
Go to **Slash Commands** and create:
- `/qr-test` - Test the bot
- `/qr-stats` - View statistics

#### Install to Workspace
1. Go to **Install App**
2. Click "Install to Workspace"
3. Save the **Bot User OAuth Token** as `SLACK_BOT_TOKEN`

### 2. Set Up Database

You can use a free PostgreSQL database from:
- [Supabase](https://supabase.com) - Free tier, easy setup
- [Railway](https://railway.app) - Free tier with Redis included
- [Neon](https://neon.tech) - Serverless Postgres

Get your database connection string (format: `postgresql://user:password@host:5432/database`)

### 3. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_APP_TOKEN=xapp-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret
DATABASE_URL=postgresql://user:password@host:5432/database
PORT=3000
NODE_ENV=development

# Optional: React with 👀 when detecting questions (for testing)
ACKNOWLEDGE_QUESTIONS=true
```

### 4. Set Up Database Schema

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates all tables)
npm run prisma:migrate
```

When prompted for a migration name, use: `init`

**⚠️ Important for existing databases:**
If you're connecting to an existing Supabase database (not a fresh setup), you may need to run an additional migration. See [MIGRATIONS.md](./MIGRATIONS.md) for details.

### 5. Run the Bot

```bash
# Development mode (auto-reload on changes)
npm run dev
```

You should see:
```
⚡️ Slack Question Router is running on port 3000!
📊 Question detection is active
💾 Database connected
```

### 6. Test It Out!

1. **Test the bot is running:**
   - In any channel, type: `/qr-test`
   - You should get a response

2. **Test question detection:**
   - Post a question in a channel: "How do I export data from Zendesk?"
   - If `ACKNOWLEDGE_QUESTIONS=true`, the bot will react with 👀
   - Check the database or use `/qr-stats` to see it was tracked

3. **Test answer detection:**
   - Someone replies to the question in a thread
   - The original asker reacts with ✅ to mark it answered
   - Use `/qr-stats` to see updated statistics

4. **View stats:**
   - Type: `/qr-stats` to see overall statistics
   - Try: `/qr-stats today`, `/qr-stats week`, `/qr-stats month`

### 7. Check the Database (Optional)

```bash
# Open Prisma Studio to view data
npm run prisma:studio
```

## What Works Now (Phase 1)

✅ Automatic question detection using pattern matching
✅ Keyword extraction from questions
✅ Store questions in database
✅ Track workspace, channels, and users
✅ Answer detection via ✅ reactions
✅ Question dismissal via ⛔ reactions
✅ Basic statistics with `/qr-stats` command
✅ Thread message support

## What's Next (Phase 2+)

- Expertise system (learn who answers what)
- Escalation engine (notify people about unanswered questions)
- Configuration commands
- Advanced analytics

## Troubleshooting

### Bot not detecting questions
- Check that the channel is listed in the database as monitored
- Verify Socket Mode is enabled
- Check bot has `channels:history` scope
- Make sure the bot is invited to the channel (`/invite @Question Router`)

### Database errors

**Error: "The column `workspace_config.migrated_to_targets` does not exist"**
- This means you need to run a database migration
- See [MIGRATIONS.md](./MIGRATIONS.md) for the fix (takes < 1 second)
- Quick fix: Run the SQL in `migration-add-migrated-to-targets.sql` on your database

**Other database issues:**
- Verify `DATABASE_URL` is correct
- Make sure migrations ran successfully: `npm run prisma:migrate`
- Check database is accessible
- Try `npx prisma db push` to sync schema

### Socket mode errors
- Verify `SLACK_APP_TOKEN` is an app-level token
- Check Socket Mode is enabled in Slack app settings
- Token must have `connections:write` scope

## Development Tips

1. **Watch the logs** - The bot logs when it detects questions
2. **Use Prisma Studio** - Great way to inspect database contents
3. **Test incrementally** - Post questions, check they're stored, verify stats
4. **Use reactions** - Quick way to mark questions answered/dismissed

## Next Steps

Once Phase 1 is working, we'll add:
- Phase 2: Better answer detection (thread analysis)
- Phase 3: Expertise matching system
- Phase 4: Escalation engine
- Phase 5: Configuration commands
