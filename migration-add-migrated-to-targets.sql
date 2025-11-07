-- Migration: Add migrated_to_targets column to workspace_config
-- Date: November 7, 2024
-- Description: Adds a boolean flag to track whether legacy escalation config has been migrated to the new targets system

-- Add the missing column
ALTER TABLE workspace_config
ADD COLUMN IF NOT EXISTS migrated_to_targets BOOLEAN NOT NULL DEFAULT false;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'workspace_config'
AND column_name = 'migrated_to_targets';
