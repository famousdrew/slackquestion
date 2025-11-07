-- Slack Question Router Database Schema
-- Run this in Supabase SQL Editor

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_team_id VARCHAR(255) UNIQUE NOT NULL,
  team_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slack_channel_id VARCHAR(255) NOT NULL,
  channel_name VARCHAR(255),
  is_monitored BOOLEAN DEFAULT true,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, slack_channel_id)
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slack_user_id VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  real_name VARCHAR(255),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, slack_user_id)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  asker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slack_message_id VARCHAR(255) NOT NULL,
  slack_thread_id VARCHAR(255),
  message_text TEXT NOT NULL,
  extracted_keywords TEXT[],
  asked_at TIMESTAMP NOT NULL,
  answered_at TIMESTAMP,
  answerer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'unanswered',
  escalation_level INTEGER DEFAULT 0,
  last_escalated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create user_expertise table
CREATE TABLE IF NOT EXISTS user_expertise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic VARCHAR(255) NOT NULL,
  confidence_score FLOAT DEFAULT 0.5,
  answer_count INTEGER DEFAULT 0,
  last_answered_at TIMESTAMP,
  source VARCHAR(50) DEFAULT 'auto',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

-- Create escalations table
CREATE TABLE IF NOT EXISTS escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  escalation_level INTEGER NOT NULL,
  suggested_users UUID[],
  action_taken VARCHAR(255),
  escalated_at TIMESTAMP DEFAULT NOW()
);

-- Create workspace_config table
CREATE TABLE IF NOT EXISTS workspace_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID UNIQUE NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_escalation_minutes INTEGER DEFAULT 120,
  second_escalation_minutes INTEGER DEFAULT 240,
  final_escalation_minutes INTEGER DEFAULT 1440,
  grace_period_minutes INTEGER DEFAULT 30,
  dm_suggestions_enabled BOOLEAN DEFAULT true,
  thread_posts_enabled BOOLEAN DEFAULT true,
  final_escalation_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create daily_stats table
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  avg_response_time_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, channel_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_workspace ON questions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_questions_channel ON questions(channel_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_asked_at ON questions(asked_at);
CREATE INDEX IF NOT EXISTS idx_user_expertise_user ON user_expertise(user_id);
CREATE INDEX IF NOT EXISTS idx_escalations_question ON escalations(question_id);

-- Success message
SELECT 'Database schema created successfully!' as message;
