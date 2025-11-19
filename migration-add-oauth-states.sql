-- Migration: Add oauth_states table
-- Purpose: Fix "slack_oauth_missing_state" error by persisting OAuth state to database
-- This allows the OAuth flow to survive server restarts (e.g., Railway deployments)
--
-- Created: 2025-11-19
-- Related Issue: Second Slack workspace installation fails with missing state error

-- Create oauth_states table
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS oauth_states_expires_at_idx ON oauth_states(expires_at);

-- Verify table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'oauth_states'
  ) THEN
    RAISE NOTICE 'oauth_states table created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create oauth_states table';
  END IF;
END $$;
