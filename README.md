# Slack Question Router

A Slack bot that automatically detects questions in channels, tracks them, and escalates unanswered questions to support teams. Built to ensure no question goes unanswered.

## Features

### Core Functionality
- **Automatic Question Detection**: Detects questions using natural language patterns (question marks, question words, help requests)
- **Smart Tracking**: Stores all questions with metadata (asker, channel, timestamp, thread)
- **Configurable Answer Detection**: Three modes for marking questions as answered
- **Two-Tier Escalation System**:
  - First escalation: Posts in thread and mentions support group
  - Second escalation: Posts to dedicated escalation channel
- **Statistics Dashboard**: View question metrics via `/qr-stats` command
- **Thread Filtering**: Only tracks top-level questions, ignores replies in threads

### Answer Detection Modes

Choose how questions are marked as answered:

1. **emoji_only** (Default)
   - Requires ✅ emoji reaction to mark as answered
   - Strict tracking for metrics
   - Best for teams that want explicit confirmation

2. **thread_auto**
   - Any reply automatically marks as answered
   - Assumes all replies solve the question
   - Best for casual/social channels

3. **hybrid**
   - Replies stop escalation (prevents noise)
   - But ✅ emoji still required for statistics
   - Best balance for most teams

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Slack SDK**: @slack/bolt (Socket Mode)
- **Database**: PostgreSQL with Prisma ORM
- **Hosting**: Self-hosted or Railway/Render

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database (we recommend Supabase)
- Slack workspace with admin access

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd slackfquestion
   npm install
   ```

2. **Set up your Slack App**
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name it "Question Router" and select your workspace

3. **Configure OAuth & Permissions**

   Add these Bot Token Scopes:
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

4. **Enable Socket Mode**
   - Go to "Socket Mode" in your app settings
   - Enable Socket Mode
   - Generate an App-Level Token with `connections:write` scope
   - Save the token (starts with `xapp-`)

5. **Enable Event Subscriptions**

   Subscribe to these bot events:
   - `message.channels`
   - `message.groups`
   - `reaction_added`
   - `reaction_removed`

6. **Add Slash Commands**

   Create these commands:
   - `/qr-test` - Test that the bot is running
   - `/qr-stats` - View question statistics
   - `/qr-config` - Configure answer detection mode

7. **Install App to Workspace**
   - Go to "Install App" and click "Install to Workspace"
   - Authorize the app
   - Save your Bot Token (starts with `xoxb-`)

8. **Set up Database**

   Create a Supabase project (or use any PostgreSQL):
   ```bash
   # Run database initialization
   psql -h <your-db-host> -U postgres -d postgres -f init-database.sql

   # Or use Supabase SQL Editor to run init-database.sql
   ```

9. **Configure Environment Variables**

   Create `.env` file:
   ```env
   # Slack Tokens
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-app-token

   # Database
   DATABASE_URL=postgresql://user:password@host:5432/database

   # Escalation Settings
   ESCALATION_USER_GROUP=t2                    # User group handle (without @)
   ESCALATION_CHANNEL=GN9LYD9T4               # Channel ID for second escalation
   FIRST_ESCALATION_MINUTES=2                 # Minutes before first escalation
   SECOND_ESCALATION_MINUTES=4                # Minutes before second escalation

   # Optional
   ACKNOWLEDGE_QUESTIONS=false                # Add reaction to detected questions
   ```

10. **Run Prisma Setup**
    ```bash
    npx prisma generate
    npx prisma db push
    ```

11. **Start the Bot**
    ```bash
    npm run dev
    ```

You should see:
```
⚡️ Slack Question Router is running in Socket Mode!
📊 Question detection is active
💾 Database connected
✅ Connected to Slack workspace: Your Workspace
🤖 Bot user: @questionrouter
🎉 Ready to receive events!
🚨 Starting escalation engine...
```

## Usage

### For End Users

**Asking Questions**
Just post a question in any monitored channel:
- "How do I reset my password?"
- "Does anyone know where the API docs are"
- "Can someone help with deployment"

The bot detects questions automatically - no special commands needed.

**Marking Questions as Answered**
React with ✅ (or ✔️ or ☑️) to mark a question as answered.

**Dismissing False Positives**
React with 🚫 or ⛔ if something was detected as a question but isn't.

### For Admins

**View Statistics**
```
/qr-stats
```
Shows:
- Total questions
- Answered/unanswered counts
- Average response time
- Per-channel breakdown

**Configure Answer Detection**
```
/qr-config show                      # Show current settings
/qr-config answer-mode emoji_only   # Require emoji to mark answered
/qr-config answer-mode thread_auto  # Any reply marks as answered
/qr-config answer-mode hybrid       # Replies stop escalation, emoji for stats
```

**Finding Channel IDs**
```bash
node get-channels.js    # Lists all channels with IDs
```

**Finding User Group IDs**
```bash
node get-usergroups.js  # Lists all user groups with IDs
```

## How It Works

### Question Detection Flow

1. **Message arrives** in monitored channel
2. **Pattern matching** checks for:
   - Question marks
   - Question words (how, what, where, when, why, who, which)
   - Help patterns ("can someone", "does anyone know")
3. **Stores question** in database with metadata
4. **Acknowledges** (optional: adds ❓ reaction)

### Escalation Flow

The escalation engine runs every 30 seconds checking for unanswered questions:

**First Escalation** (default: 2 minutes)
- Posts reply in the question's thread
- Mentions configured user group (e.g., @t2)
- Updates escalation level to 1

**Second Escalation** (default: 4 minutes)
- Posts to dedicated escalation channel
- Includes question text, asker, channel, and thread link
- Updates escalation level to 2

**Escalation Stops When:**
- Question marked with ✅ emoji (all modes)
- Question receives reply (thread_auto and hybrid modes)
- Question dismissed with 🚫 emoji

### Answer Detection Modes

**emoji_only**
```
Question posted → Escalation starts
Someone replies → Escalation continues
✅ added → Marked answered, escalation stops
```

**thread_auto**
```
Question posted → Escalation starts
Someone replies → Auto-marked answered, escalation stops
✅ added → Also marks as answered
```

**hybrid**
```
Question posted → Escalation starts
Someone replies → Escalation stops (but not marked answered for stats)
✅ added → Marked answered for statistics
```

## Project Structure

```
slackfquestion/
├── src/
│   ├── commands/
│   │   ├── configCommand.ts       # /qr-config command
│   │   └── statsCommand.ts        # /qr-stats command
│   ├── events/
│   │   ├── messageHandler.ts      # Question detection
│   │   └── reactionHandler.ts     # Answer marking
│   ├── services/
│   │   ├── configService.ts       # Workspace configuration
│   │   ├── escalationEngine.ts    # Escalation logic
│   │   ├── questionDetector.ts    # Pattern matching
│   │   └── questionStorage.ts     # Database operations
│   ├── utils/
│   │   └── db.ts                  # Prisma client & helpers
│   └── index.ts                   # Main entry point
├── prisma/
│   └── schema.prisma              # Database schema
├── get-channels.js                # Helper: list channels
├── get-usergroups.js              # Helper: list user groups
├── init-database.sql              # Database setup
├── enable-rls.sql                 # Supabase RLS setup
└── add-answer-detection-mode.sql  # Migration for config feature
```

## Database Schema

### Tables
- **workspaces**: Slack workspaces using the bot
- **channels**: Monitored channels in each workspace
- **users**: Users who have asked questions
- **questions**: All detected questions with status
- **escalations**: Log of escalation actions
- **workspace_config**: Per-workspace settings

See `prisma/schema.prisma` for full schema.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_BOT_TOKEN` | Yes | - | Bot token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | - | Signing secret from Slack app |
| `SLACK_APP_TOKEN` | Yes | - | App-level token (xapp-...) |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `ESCALATION_USER_GROUP` | Yes | - | User group handle for first escalation |
| `ESCALATION_CHANNEL` | Yes | - | Channel ID for second escalation |
| `FIRST_ESCALATION_MINUTES` | No | 2 | Minutes before first escalation |
| `SECOND_ESCALATION_MINUTES` | No | 4 | Minutes before second escalation |
| `ACKNOWLEDGE_QUESTIONS` | No | false | Add ❓ reaction to detected questions |

### Channel Monitoring

By default, channels are monitored when the bot is added to them. To manually configure:

```sql
-- Disable monitoring for a channel
UPDATE channels SET is_monitored = false WHERE channel_name = 'random';

-- Enable monitoring
UPDATE channels SET is_monitored = true WHERE channel_name = 'support';
```

## Troubleshooting

### Bot not detecting questions
- Check bot is invited to the channel (`/invite @questionrouter`)
- Verify channel is monitored: `SELECT * FROM channels WHERE is_monitored = true`
- Check logs for "Message received" entries
- Ensure question has question mark or question words

### Escalations not firing
- Check `FIRST_ESCALATION_MINUTES` and `SECOND_ESCALATION_MINUTES` in `.env`
- Verify escalation engine started (look for "Starting escalation engine" log)
- Check question status: `SELECT * FROM questions WHERE status = 'unanswered'`
- Check answer detection mode: `/qr-config show`

### User group mention not working
- Get correct user group ID: `node get-usergroups.js`
- Update `ESCALATION_USER_GROUP` in `.env` with the handle (not ID)
- Restart bot

### Second escalation channel not found
- Private channels need channel ID, not name
- Get channel ID: `node get-channels.js` or from channel URL
- Update `ESCALATION_CHANNEL` in `.env` with channel ID
- Ensure bot is member of the channel

### Prisma errors
```bash
# Regenerate Prisma client
npx prisma generate

# Push schema changes
npx prisma db push

# View database
npx prisma studio
```

## Development

### Running in Development
```bash
npm run dev
```

Uses `tsx watch` for hot reloading.

### Database Migrations

We use Prisma for schema management:

```bash
# Make schema changes in prisma/schema.prisma
npx prisma format          # Format schema
npx prisma db push         # Push to database
npx prisma generate        # Regenerate client
```

For production, use proper migrations:
```bash
npx prisma migrate dev --name description
```

### Testing

Manual testing checklist:
1. Post a question → verify detection
2. Wait 2 min → verify first escalation
3. Wait 2 more min → verify second escalation
4. Add ✅ reaction → verify marked as answered
5. Test `/qr-stats` command
6. Test `/qr-config` command
7. Test each answer detection mode

## Deployment

### Recommended: Railway/Render

1. Push code to GitHub
2. Connect repository to Railway/Render
3. Add environment variables
4. Deploy

### Self-Hosted

```bash
# Build
npm run build

# Run
node dist/index.js
```

Use a process manager like PM2:
```bash
pm2 start dist/index.js --name question-router
pm2 save
pm2 startup
```

## Roadmap

See `SCALING.md` for comprehensive SaaS strategy.

**Phase 1: Configuration System** ✅
- [x] Three answer detection modes
- [x] `/qr-config` command
- [x] Per-workspace settings

**Phase 2: Enhanced Analytics** (Next)
- [ ] Web dashboard
- [ ] Response time trends
- [ ] User leaderboards
- [ ] Export to CSV

**Phase 3: Advanced Routing**
- [ ] Per-channel escalation times
- [ ] Business hours awareness
- [ ] Keyword-based routing
- [ ] AI-powered similar question suggestions

**Phase 4: Integrations**
- [ ] Jira/Linear ticket creation
- [ ] PagerDuty alerts
- [ ] Email notifications
- [ ] Webhook support

## Contributing

This is currently a private project. For bugs or feature requests, contact the maintainer.

## License

Proprietary - All rights reserved

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review logs for error messages
3. Contact the development team

---

Built with ❤️ using Slack Bolt, TypeScript, and Prisma
