-- Migration: Add Answer Message Tracking
-- Date: 2025-01-07
-- Purpose: Track which specific thread reply was marked as the answer (Stack Overflow style)

-- Add column to track which message in thread was marked as the answer
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS answer_slack_message_id TEXT;

-- Add index for performance when querying answered questions
CREATE INDEX IF NOT EXISTS idx_questions_answer_message
  ON questions(answer_slack_message_id)
  WHERE answer_slack_message_id IS NOT NULL;

-- Verification query
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'questions'
AND column_name = 'answer_slack_message_id';
