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
git clone <repository-url>
cd slack-question-router
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

- **Phase 0**: Infrastructure setup ✓
- **Phase 1**: Core question detection
- **Phase 2**: Answer detection
- **Phase 3**: Expertise system
- **Phase 4**: Escalation engine
- **Phase 5**: Configuration & commands
- **Phase 6**: Polish & deployment

See [slack-question-router-prd.md](./slack-question-router-prd.md) for detailed requirements.

## Available Commands

- `/qr-test` - Test that the bot is running (development)
- `/qr-config` - Configure bot settings
- `/qr-stats` - View question/answer statistics
- `/qr-expertise` - Manage your expertise areas
- `/qr-resolve` - Mark a question as resolved
- `/qr-dismiss` - Dismiss a false positive question
- `/qr-snooze` - Snooze escalation for a question

## License

MIT

## Author

Drew
