-- Migration: Add slack_installations table for OAuth V2
-- This table stores OAuth installation tokens for multi-workspace support
-- Run this migration after switching from Socket Mode to OAuth V2

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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_slack_installations_team_id ON slack_installations(team_id);
CREATE INDEX IF NOT EXISTS idx_slack_installations_enterprise_id ON slack_installations(enterprise_id);

-- Add comment for documentation
COMMENT ON TABLE slack_installations IS 'Stores OAuth installation data for Slack workspaces using OAuth V2 flow';
