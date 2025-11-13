-- Migration: Add unique constraint to prevent duplicate questions
-- Description: Adds a unique constraint on (workspace_id, slack_message_id) to prevent race conditions
-- Date: 2025-11-13

-- Add unique constraint to questions table
-- This prevents duplicate questions from being stored due to race conditions
CREATE UNIQUE INDEX IF NOT EXISTS questions_workspace_id_slack_message_id_key
ON questions(workspace_id, slack_message_id);

-- Note: If you have existing duplicate data, you'll need to clean it up first:
--
-- To find duplicates:
-- SELECT workspace_id, slack_message_id, COUNT(*)
-- FROM questions
-- GROUP BY workspace_id, slack_message_id
-- HAVING COUNT(*) > 1;
--
-- To remove duplicates (keeps the oldest one):
-- DELETE FROM questions
-- WHERE id NOT IN (
--   SELECT MIN(id)
--   FROM questions
--   GROUP BY workspace_id, slack_message_id
-- );
