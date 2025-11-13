# OAuth V2 Migration Guide

This guide walks you through migrating from Socket Mode to OAuth V2 for Slack App Directory distribution.

## ✅ What's Been Done

The codebase has been updated to support OAuth V2:
- ✅ Dependencies installed (`@slack/oauth`, `express`)
- ✅ Database schema updated with `SlackInstallation` table
- ✅ OAuth installer created (`src/oauth/installer.ts`)
- ✅ Main app updated to use ExpressReceiver (`src/index.ts`)
- ✅ Environment validation updated (`src/utils/env.ts`)
- ✅ `.env.example` updated with OAuth credentials

## 🚀 Next Steps

### Step 1: Update Slack App Configuration

Go to https://api.slack.com/apps and select your app:

####Human: Let's commit what we have, run the build and see what errors we find