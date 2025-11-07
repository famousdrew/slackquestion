-- Migration: Add Zendesk Side Conversation Tracking
-- Date: 2025-01-07
-- Purpose: Add fields to track questions originating from Zendesk side conversations

-- Add new columns to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS is_side_conversation BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS zendesk_ticket_id TEXT,
  ADD COLUMN IF NOT EXISTS source_app TEXT DEFAULT 'slack';

-- Add index for efficient querying of side conversations
CREATE INDEX IF NOT EXISTS idx_questions_side_conversation
  ON questions(is_side_conversation, status, asked_at);

-- Add comment for documentation
COMMENT ON COLUMN questions.is_side_conversation IS 'True if question originated from a Zendesk side conversation';
COMMENT ON COLUMN questions.zendesk_ticket_id IS 'Zendesk ticket ID if available (extracted from message)';
COMMENT ON COLUMN questions.source_app IS 'Source of the question: slack (direct) or zendesk (side conversation)';

-- Verification query
-- Run this to verify the migration succeeded:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'questions'
-- AND column_name IN ('is_side_conversation', 'zendesk_ticket_id', 'source_app');
