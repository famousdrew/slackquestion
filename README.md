# Slack Question Router

A Slack bot that automatically detects questions in channels, tracks them, and escalates unanswered questions to support teams. Built to ensure no question goes unanswered.

## ⚠️ **IMPORTANT: Database Migration Required**

**If you're seeing this error:**
```
The column `workspace_config.migrated_to_targets` does not exist in the current database.
```

**You need to run a database migration immediately!**

📝 **Quick Fix:**
1. Open [MIGRATIONS.md](./MIGRATIONS.md) for detailed instructions
2. Run the SQL in `migration-add-migrated-to-targets.sql` on your database
3. Restart your application

This migration adds a single boolean column and takes < 1 second to apply.

---

## Features

### Core Functionality
- **Automatic Question Detection**: Detects questions using natural language patterns (question marks, question words, help requests)
- **Visual Feedback**: Adds ❓ emoji to detected questions for immediate acknowledgment
- **Smart Tracking**: Stores all questions with metadata (asker, channel, timestamp, thread)
- **Configurable Answer Detection**: Three modes for marking questions as answered
- **Flexible Multi-Tier Escalation System**:
  - Configure multiple escalation levels with custom timing
  - Assign different targets at each level: users, user groups, or channels
  - Mix and match target types (e.g., user group at level 1, specific user at level 2, channel at level 3)
  - Support for both public and private channels
- **Modal Configuration UI**: Configure all settings through interactive Slack modal
- **Escalation Targets Management**: Dedicated `/qr-targets` command for managing escalation targets
- **App Home Onboarding**: Guided setup for new users with configuration status dashboard
- **Statistics Dashboard**: View question metrics via `/qr-stats` command
- **Thread Filtering**: Only tracks top-level questions, ignores replies in threads
- **Per-Workspace Settings**: Each workspace can configure its own escalation channels and user groups

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
   - `/qr-config` - Open configuration modal (escalation settings, answer detection mode)
   - `/qr-targets` - Manage escalation targets (users, groups, channels)

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
   # Slack Tokens (Required)
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-app-token

   # Database (Required)
   DATABASE_URL=postgresql://user:password@host:5432/database

   # Default Escalation Settings (Optional - can be configured via /qr-config modal)
   FIRST_ESCALATION_MINUTES=2                 # Default: 2 minutes
   SECOND_ESCALATION_MINUTES=4                # Default: 4 minutes
   ESCALATION_USER_GROUP=t2                   # Fallback if not set in modal
   ESCALATION_CHANNEL=GN9LYD9T4               # Fallback if not set in modal
   ```

   **Note**: Escalation settings are now configured per-workspace using the `/qr-config` modal.
   Environment variables serve as fallback defaults.

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

**Getting Started**
Click on "Question Router" in your Slack apps to see the App Home with:
- Configuration status (setup complete or needs attention)
- Current settings summary
- Quick access to configuration modal
- How-to guide and available commands

**Configure Settings**
```
/qr-config
```
Opens an interactive modal where you can configure:
- **Escalation Timing**: First and second escalation minutes (1-1440)
- **User Group**: Which user group to mention in first escalation
- **Escalation Channel**: Public or private channel for second escalation alerts
- **Answer Detection Mode**: Choose emoji_only, thread_auto, or hybrid

All settings are saved per-workspace in the database.

**View Statistics**
```
/qr-stats
```
Shows:
- Total questions
- Answered/unanswered counts
- Average response time
- Per-channel breakdown

**Managing Escalation Targets**
```
/qr-targets
```
Opens an interactive interface to manage escalation targets. You can:
- Add users, user groups, or channels as escalation targets
- Assign targets to different escalation levels (1, 2, 3)
- Remove targets when they're no longer needed
- View all configured targets organized by level

**Finding IDs for Configuration**
```bash
node get-users.js       # Lists all users with IDs
node get-usergroups.js  # Lists all user groups with IDs
node get-channels.js    # Lists all channels with IDs
```

## How It Works

### Question Detection Flow

1. **Message arrives** in monitored channel
2. **Pattern matching** checks for:
   - Question marks
   - Question words (how, what, where, when, why, who, which)
   - Help patterns ("can someone", "does anyone know")
3. **Stores question** in database with metadata
4. **Visual feedback** - Adds ❓ emoji reaction to acknowledge detection

### Escalation Flow

The escalation engine runs every 30 seconds checking for unanswered questions:

**Flexible Multi-Level Escalation**
The bot supports up to 3 escalation levels, each with customizable timing and targets:

**Level 1 Escalation** (default: 2 minutes)
- Activates when question remains unanswered for configured time
- Notifies all assigned targets (user groups, users, or channels)
- User groups and users: Mentioned in the question thread
- Channels: Alert posted with link to original question
- Updates escalation level to 1

**Level 2 Escalation** (default: 4 minutes)
- Activates when question still unanswered after level 1
- Notifies next set of configured targets
- Typically used for escalation to dedicated channels or senior staff
- Updates escalation level to 2

**Level 3 Escalation** (default: 24 hours)
- Final escalation for critical unanswered questions
- Notifies final targets (e.g., specific manager or executive)
- Can include direct messages to assigned users
- Updates escalation level to 3

**Target Types:**
- **User Groups**: Mentioned in thread, all members notified
- **Users**: Mentioned in thread AND receive a DM with question details
- **Channels**: Alert posted with original question context and link

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

## Escalation Targets System

### Overview
The flexible escalation targets system allows you to assign different notification recipients at each escalation level. This enables sophisticated routing strategies tailored to your team's needs.

### Configuration Examples

**Example 1: Standard Support Team Escalation**
- Level 1: User group `@support-team` (first responders)
- Level 2: Channel `#escalated-questions` (team visibility)
- Level 3: User `@support-manager` (final escalation)

**Example 2: Multi-Team Routing**
- Level 1: User group `@tier1-support`
- Level 2: User group `@tier2-support` + Channel `#support-escalations`
- Level 3: User `@head-of-support`

**Example 3: Topic-Specific Routing**
- Level 1: User group `@engineering`
- Level 2: Channel `#engineering-help`
- Level 3: User `@tech-lead`

### Managing Targets

**Adding Targets**
1. Run `/qr-targets`
2. Click "➕ Add Target"
3. Select escalation level (1, 2, or 3)
4. Choose target type (User, User Group, or Channel)
5. Select the specific user/group/channel
6. Click "Add"

**Removing Targets**
1. Run `/qr-targets`
2. Click "🗑️ Remove Target"
3. Select the target to remove
4. Confirm removal

**Viewing Current Configuration**
- Run `/qr-targets` to see all configured targets organized by level
- Each target shows its type and name for easy identification

### Target Behavior

**User Groups**
- Posted as mention in the original question thread
- All group members receive notification
- Best for: Teams, on-call rotations

**Individual Users**
- Mentioned in the original question thread
- Receives a direct message with question details and link
- Best for: Specific experts, managers, escalation points

**Channels**
- Alert posted to the channel with question context
- Includes link back to original thread
- Best for: Visibility, team awareness, public escalation

### Migration from Legacy Config

The system automatically migrates your existing configuration:
- Existing user group → Level 1 target
- Existing escalation channel → Level 2 target
- Any configured final user → Level 3 target

You can then add additional targets or reconfigure as needed using `/qr-targets`.

## Project Structure

```
slackfquestion/
├── src/
│   ├── commands/
│   │   ├── configCommand.ts       # /qr-config modal UI
│   │   ├── statsCommand.ts        # /qr-stats command
│   │   └── targetsCommand.ts      # /qr-targets escalation management
│   ├── events/
│   │   ├── appHome.ts             # App Home tab & onboarding
│   │   ├── messageHandler.ts      # Question detection
│   │   └── reactionHandler.ts     # Answer marking
│   ├── services/
│   │   ├── configService.ts       # Workspace configuration
│   │   ├── escalationEngine.ts    # Flexible escalation logic
│   │   ├── escalationTargetService.ts  # Escalation target management
│   │   ├── questionDetector.ts    # Pattern matching
│   │   └── questionStorage.ts     # Database operations
│   ├── utils/
│   │   └── db.ts                  # Prisma client & helpers
│   └── index.ts                   # Main entry point
├── prisma/
│   └── schema.prisma              # Database schema (with EscalationTarget model)
├── get-users.js                   # Helper: list users
├── get-channels.js                # Helper: list channels
├── get-usergroups.js              # Helper: list user groups
├── check-question.js              # Helper: debug questions
└── portfolio-page.html            # Public info page
```

## Database Schema

### Tables
- **workspaces**: Slack workspaces using the bot
- **channels**: Monitored channels in each workspace
- **users**: Users who have asked questions
- **questions**: All detected questions with status
- **escalations**: Log of escalation actions
- **workspace_config**: Per-workspace settings (timing, answer detection mode)
- **escalation_targets**: Flexible escalation targets (users, groups, channels) for each level

### New: EscalationTarget Model
Stores flexible escalation targets for sophisticated routing:
- **targetType**: 'user', 'user_group', or 'channel'
- **targetId**: Slack ID of the user, group, or channel
- **escalationLevel**: Which level (1, 2, 3) this target is for
- **priority**: Order of notification within a level
- **isActive**: Whether this target is currently active

See `prisma/schema.prisma` for full schema.

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SLACK_BOT_TOKEN` | Yes | - | Bot token (xoxb-...) |
| `SLACK_SIGNING_SECRET` | Yes | - | Signing secret from Slack app |
| `SLACK_APP_TOKEN` | Yes | - | App-level token (xapp-...) |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `FIRST_ESCALATION_MINUTES` | No | 2 | Default minutes before first escalation |
| `SECOND_ESCALATION_MINUTES` | No | 4 | Default minutes before second escalation |
| `ESCALATION_USER_GROUP` | No | - | Fallback user group handle |
| `ESCALATION_CHANNEL` | No | - | Fallback channel ID |

**Note**: Escalation targets (user group and channel) are now configured per-workspace via `/qr-config` modal. Environment variables serve as fallback defaults only.

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
git clone https://github.com/famousdrew/slackquestion
cd slackquestion
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
- [x] Per-workspace settings
- [x] Modal-based configuration UI
- [x] App Home onboarding experience
- [x] Private channel support
- [x] Visual question detection feedback
- [x] Flexible multi-tier escalation system
- [x] Support for user, user group, and channel targets
- [x] Per-level target assignment with `/qr-targets` command

**Phase 2: Enhanced Analytics** (Next)
- [ ] Web dashboard
- [ ] Response time trends
- [ ] User leaderboards
- [ ] Export to CSV

- **Phase 0**: Infrastructure setup ✅
- **Phase 1**: Core question detection 🚧 (In Progress - 80% complete)
- **Phase 2**: Answer detection ⏳
- **Phase 3**: Expertise system ⏳
- **Phase 4**: Escalation engine ⏳
- **Phase 5**: Configuration & commands ⏳
- **Phase 6**: Polish & deployment ⏳

### Current Implementation Status

**Completed:**
- ✅ Slack bot with Socket Mode
- ✅ Database schema (Prisma)
- ✅ Question detection algorithm
- ✅ Message event listener
- ✅ Question storage in database
- ✅ Workspace/Channel/User management
- ✅ Logging utility
- ✅ Error handling and graceful shutdown

**In Progress:**
- 🚧 Database migrations
- 🚧 Testing with real Slack workspace

**Not Started:**
- ⏳ Answer detection
- ⏳ Expertise matching system
- ⏳ Escalation engine (BullMQ)
- ⏳ Slash commands (except /qr-test)
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

**Implemented:**
- `/qr-test` ✅ - Test that the bot is running

**Planned:**
- `/qr-config` ⏳ - Configure bot settings
- `/qr-stats` ⏳ - View question/answer statistics
- `/qr-expertise` ⏳ - Manage your expertise areas
- `/qr-resolve` ⏳ - Mark a question as resolved
- `/qr-dismiss` ⏳ - Dismiss a false positive question
- `/qr-snooze` ⏳ - Snooze escalation for a question

## Project Structure

```
src/
├── index.ts                    # App entry point
├── events/
│   └── message.ts             # Message event handler
├── services/
│   ├── questionDetector.ts    # Pattern-based question detection
│   ├── questionManager.ts     # Question database operations
│   ├── workspaceManager.ts    # Workspace/channel/user management
│   └── expertiseMatcher.ts    # Expertise matching (stub)
└── utils/
    ├── prisma.ts              # Prisma client singleton
    └── logger.ts              # Logging utility
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in your `.env` file
- Run `npm run prisma:generate` after schema changes

### Bot Not Responding
- Verify Socket Mode is enabled in Slack app settings
- Check `SLACK_APP_TOKEN` is set correctly
- Ensure bot has proper permissions (see Slack App Setup)

### Questions Not Being Detected
- Check bot is invited to the channel
- Verify channel is being monitored (default: all channels are monitored)
- Check logs with `npm run dev` for detection details
This is currently a private project. For bugs or feature requests, contact the maintainer.

## License

Proprietary - All rights reserved

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review logs for error messages
3. Contact the development team

## Recent Updates

### November 7, 2024 - Build Fixes & Database Migration ✅

**TypeScript Build Errors Fixed:**
- Removed duplicate shutdown handlers in `src/index.ts`
- Fixed Block Kit type inference in App Home (`src/events/appHome.ts`)
- Added proper type casting for Prisma enum types in escalation engine
- **Build Status**: All TypeScript errors resolved, project compiles successfully

**Database Migration Added:**
- Created migration SQL for missing `migrated_to_targets` column
- Added comprehensive [MIGRATIONS.md](./MIGRATIONS.md) guide
- Updated [DEPLOYMENT.md](./DEPLOYMENT.md) with migration step
- Updated [SETUP.md](./SETUP.md) with troubleshooting
- **Action Required**: Run migration on your database (see warning at top of README)

### Current Implementation Status
- ✅ Question detection and tracking
- ✅ Multi-tier escalation system with flexible targets (users, groups, channels)
- ✅ Three answer detection modes (emoji_only, thread_auto, hybrid)
- ✅ App Home dashboard with configuration status
- ✅ Per-channel configuration overrides
- ✅ Statistics and monitoring via `/qr-stats`
- ✅ Comprehensive setup wizard (`/qr-setup`)
- ✅ Production-ready with PostgreSQL + Prisma

---

Built with ❤️ using Slack Bolt, TypeScript, and Prisma
