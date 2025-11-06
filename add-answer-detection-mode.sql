-- Add answer_detection_mode column to workspace_config table
ALTER TABLE public.workspace_config
ADD COLUMN IF NOT EXISTS answer_detection_mode TEXT DEFAULT 'emoji_only';

-- Update any existing rows to have the default value
UPDATE public.workspace_config
SET answer_detection_mode = 'emoji_only'
WHERE answer_detection_mode IS NULL;
