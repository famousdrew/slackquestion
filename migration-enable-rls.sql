-- Migration: Enable Row-Level Security (RLS) on all tables
-- Date: 2025-01-07
-- Purpose: Add RLS protection to prevent unauthorized access

-- Enable RLS on tables
ALTER TABLE channel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_expertise ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_config ENABLE ROW LEVEL SECURITY;

-- Create policies that allow full access for authenticated requests
-- (Your app uses service role via DATABASE_URL, so it will have full access)

-- channel_config policies
CREATE POLICY "Enable all access for service role" ON channel_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- daily_stats policies
CREATE POLICY "Enable all access for service role" ON daily_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- escalation_events policies
CREATE POLICY "Enable all access for service role" ON escalation_events
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- escalation_targets policies
CREATE POLICY "Enable all access for service role" ON escalation_targets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- user_expertise policies
CREATE POLICY "Enable all access for service role" ON user_expertise
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- workspace_config policies
CREATE POLICY "Enable all access for service role" ON workspace_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Verification queries
-- Run these to confirm RLS is enabled:

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'channel_config',
  'daily_stats',
  'escalation_events',
  'escalation_targets',
  'user_expertise',
  'workspace_config'
)
ORDER BY tablename;

-- Check policies exist
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'channel_config',
  'daily_stats',
  'escalation_events',
  'escalation_targets',
  'user_expertise',
  'workspace_config'
)
ORDER BY tablename;
