# Slack Question Router

A Slack bot that monitors channels for unanswered questions, intelligently suggests who should respond, and escalates appropriately to ensure nothing falls through the cracks.

## Overview

In busy Slack workspaces, questions often get buried in channel noise. The Question Router helps ensure every question gets answered by:

- Automatically detecting questions in monitored channels
- Suggesting the best people to answer based on learned expertise
- Escalating unanswered questions through progressive notifications
- Tracking response metrics and team expertise

## Features

- **Automatic Question Detection**: Pattern-based detection of questions (no AI required)
- **Smart Expertise Matching**: Learns who answers what topics over time
- **Progressive Escalation**: Grace period → DM suggestions → Thread posts → Team lead notification
- **Analytics & Insights**: Track response times, answer rates, and team expertise
- **Configurable**: Customize escalation timing, monitored channels, and more

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Slack SDK**: @slack/bolt
- **Database**: PostgreSQL with Prisma ORM
- **Job Queue**: BullMQ with Redis
- **Hosting**: Railway.app (or Render.com)

## Project Structure

```
slack-question-router/
├── src/
│   ├── commands/          # Slash command handlers
│   ├── events/            # Slack event listeners
│   ├── services/          # Business logic
│   │   ├── questionDetector.ts
│   │   └── expertiseMatcher.ts
│   ├── utils/             # Helper functions
│   ├── types/             # TypeScript types
│   └── index.ts           # App entry point
├── prisma/
│   └── schema.prisma      # Database schema
├── .env.example           # Environment variables template
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Redis instance
- Slack workspace with admin access

### Installation

1. Clone the repository:
```bash
git clone https://github.com/famousdrew/slackquestion
cd slackquestion
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with Slack credentials and database URL

5. Set up the database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

6. Run in development mode:
```bash
npm run dev
```

## Slack App Setup

1. Create a new Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Enable Socket Mode and create an App Token
3. Add Bot Token Scopes:
   - `channels:history`
   - `channels:read`
   - `chat:write`
   - `commands`
   - `reactions:read`
   - `users:read`
4. Subscribe to Events:
   - `message.channels`
   - `reaction_added`
5. Add Slash Commands (as needed)
6. Install the app to your workspace

## Development Phases

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

See [slack-question-router-prd.md](./slack-question-router-prd.md) for detailed requirements.

## Available Commands

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

## License

MIT

## Author

Drew
