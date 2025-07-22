-- Emma AI Database Schema
-- Privacy-first, scalable architecture for relationship coaching platform
-- Compatible with Supabase PostgreSQL

-- ========================================
-- CORE ENTITIES
-- ========================================

-- Users table (minimal data collection)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Authentication data only
  auth_id UUID UNIQUE, -- Reference to Supabase auth.users
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'individual', 'couples', 'premium')),
  is_anonymous BOOLEAN DEFAULT true,
  
  -- Privacy settings
  data_retention_days INTEGER DEFAULT 30,
  analytics_opt_out BOOLEAN DEFAULT false,
  
  CONSTRAINT users_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sessions table (encrypted conversation data)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Session metadata
  session_type TEXT DEFAULT 'coaching' CHECK (session_type IN ('coaching', 'crisis', 'practice')),
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  
  -- Encrypted content (zero-knowledge)
  encrypted_transcript TEXT, -- Client-side encrypted
  encryption_key_hash TEXT, -- For verification only
  
  -- Analysis results (non-personal)
  emotion_summary JSONB, -- {"dominant": "stressed", "intensity": 0.7, "progression": [...]}
  skills_practiced TEXT[], -- ["active_listening", "i_statements"]
  coaching_effectiveness_score FLOAT CHECK (coaching_effectiveness_score >= 0 AND coaching_effectiveness_score <= 1),
  
  -- Crisis detection (for safety)
  crisis_level INTEGER DEFAULT 0 CHECK (crisis_level >= 0 AND crisis_level <= 3), -- 0=none, 1=low, 2=medium, 3=high
  crisis_indicators TEXT[], -- ["substance_abuse", "violence_threat"]
  human_escalation_triggered BOOLEAN DEFAULT false,
  
  -- Performance metrics
  response_time_ms INTEGER,
  api_calls_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0
);

-- Crisis Events (audit trail for safety)
CREATE TABLE crisis_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Crisis details
  crisis_type TEXT NOT NULL CHECK (crisis_type IN ('domestic_violence', 'suicide_risk', 'child_safety', 'substance_abuse', 'mental_health_emergency')),
  severity_level INTEGER NOT NULL CHECK (severity_level >= 1 AND severity_level <= 3),
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Detection metadata
  detection_method TEXT CHECK (detection_method IN ('ml_model', 'rule_based', 'human_reported')),
  model_version TEXT,
  trigger_phrases TEXT[], -- For audit purposes
  
  -- Response tracking
  escalation_status TEXT DEFAULT 'pending' CHECK (escalation_status IN ('pending', 'in_progress', 'resolved', 'false_positive')),
  human_counselor_id UUID, -- Reference to counselor system
  response_time_seconds INTEGER,
  resolution_notes TEXT
);

-- ========================================
-- ANALYTICS & INSIGHTS (ANONYMIZED)
-- ========================================

-- Anonymized usage analytics (no personal data)
CREATE TABLE analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Temporal data
  session_date DATE,
  session_hour INTEGER CHECK (session_hour >= 0 AND session_hour <= 23),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Session characteristics
  session_duration_minutes INTEGER,
  session_type TEXT,
  user_subscription_tier TEXT,
  
  -- Emotional patterns (aggregated)
  primary_emotion TEXT,
  emotion_intensity_avg FLOAT,
  emotion_improvement BOOLEAN,
  
  -- Coaching effectiveness
  skills_practiced_count INTEGER,
  user_satisfaction_score FLOAT,
  coaching_effectiveness FLOAT,
  
  -- Technical metrics
  voice_processing_time_ms INTEGER,
  response_generation_time_ms INTEGER,
  total_api_calls INTEGER,
  error_occurred BOOLEAN,
  
  -- Geographic (country level only)
  country_code CHAR(2),
  timezone TEXT
);

-- System performance metrics
CREATE TABLE system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Performance data
  metric_name TEXT NOT NULL,
  metric_value FLOAT NOT NULL,
  metric_unit TEXT,
  
  -- Context
  service_name TEXT, -- 'voice_processing', 'ai_generation', 'crisis_detection'
  environment TEXT DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ========================================
-- COACHING & CONTENT
-- ========================================

-- Coaching templates (for AI responses)
CREATE TABLE coaching_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Template metadata
  template_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'conflict_resolution', 'communication_skills', 'emotional_regulation'
  skill_focus TEXT NOT NULL, -- 'active_listening', 'i_statements', 'boundary_setting'
  
  -- Content
  template_text TEXT NOT NULL,
  follow_up_questions TEXT[],
  practice_exercises TEXT[],
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  effectiveness_rating FLOAT DEFAULT 0,
  
  -- Validation
  clinical_review_status TEXT DEFAULT 'pending' CHECK (clinical_review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID, -- Reference to clinical staff
  review_notes TEXT,
  
  -- Active status
  is_active BOOLEAN DEFAULT true
);

-- Relationship goal templates
CREATE TABLE relationship_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Goal definition
  goal_category TEXT NOT NULL, -- 'communication', 'conflict_resolution', 'intimacy', 'trust_building'
  goal_description TEXT NOT NULL,
  target_completion_date DATE,
  
  -- Progress tracking
  current_progress FLOAT DEFAULT 0 CHECK (current_progress >= 0 AND current_progress <= 1),
  milestones_completed INTEGER DEFAULT 0,
  total_milestones INTEGER,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  completion_date DATE
);

-- ========================================
-- SYSTEM CONFIGURATION
-- ========================================

-- Feature flags and configuration
CREATE TABLE system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Configuration
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN ('feature_flag', 'setting', 'limit', 'threshold')),
  
  -- Environment
  environment TEXT DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Users indexes
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Sessions indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_crisis_level ON sessions(crisis_level);
CREATE INDEX idx_sessions_session_type ON sessions(session_type);
CREATE INDEX idx_sessions_completed ON sessions(completed);

-- Crisis events indexes
CREATE INDEX idx_crisis_events_session_id ON crisis_events(session_id);
CREATE INDEX idx_crisis_events_created_at ON crisis_events(created_at);
CREATE INDEX idx_crisis_events_crisis_type ON crisis_events(crisis_type);
CREATE INDEX idx_crisis_events_severity_level ON crisis_events(severity_level);
CREATE INDEX idx_crisis_events_escalation_status ON crisis_events(escalation_status);

-- Analytics indexes
CREATE INDEX idx_analytics_sessions_date ON analytics_sessions(session_date);
CREATE INDEX idx_analytics_sessions_type ON analytics_sessions(session_type);
CREATE INDEX idx_analytics_sessions_tier ON analytics_sessions(user_subscription_tier);

-- System metrics indexes
CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_service ON system_metrics(service_name);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_goals ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Sessions access policy
CREATE POLICY "Users can access own sessions" ON sessions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- Crisis events - restricted access
CREATE POLICY "Crisis events restricted access" ON crisis_events
  FOR SELECT USING (
    session_id IN (
      SELECT s.id FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE u.auth_id = auth.uid()
    )
  );

-- Relationship goals access
CREATE POLICY "Users can manage own goals" ON relationship_goals
  FOR ALL USING (
    user_id IN (
      SELECT id FROM users WHERE auth_id = auth.uid()
    )
  );

-- ========================================
-- DATA RETENTION TRIGGERS
-- ========================================

-- Automatic data cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete expired sessions based on user preferences
  DELETE FROM sessions 
  WHERE created_at < NOW() - INTERVAL '1 day' * (
    SELECT COALESCE(data_retention_days, 30)
    FROM users 
    WHERE users.id = sessions.user_id
  );
  
  -- Delete old analytics data (keep 2 years)
  DELETE FROM analytics_sessions 
  WHERE recorded_at < NOW() - INTERVAL '2 years';
  
  -- Delete old system metrics (keep 6 months)
  DELETE FROM system_metrics 
  WHERE recorded_at < NOW() - INTERVAL '6 months';
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run daily
SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');

-- ========================================
-- INITIAL CONFIGURATION
-- ========================================

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('crisis_detection_enabled', 'true', 'feature_flag', 'Enable crisis detection system'),
('max_session_duration_minutes', '60', 'limit', 'Maximum session duration'),
('voice_processing_timeout_ms', '5000', 'threshold', 'Voice processing timeout'),
('ai_response_max_tokens', '500', 'limit', 'Maximum AI response length'),
('rate_limit_per_hour', '100', 'limit', 'API calls per hour per user'),
('crisis_response_timeout_ms', '100', 'threshold', 'Crisis detection must complete within this time'),
('default_data_retention_days', '30', 'setting', 'Default data retention period'),
('analytics_sampling_rate', '0.1', 'setting', 'Fraction of sessions to include in analytics');

-- Insert basic coaching templates
INSERT INTO coaching_templates (template_name, category, skill_focus, template_text, follow_up_questions, practice_exercises) VALUES
(
  'active_listening_intro',
  'communication_skills',
  'active_listening',
  'I hear that you''re feeling {emotion}. Let me help you practice active listening, which means giving your full attention to understand your partner''s perspective without immediately responding or defending.',
  ARRAY['Can you tell me more about what happened?', 'How did that make you feel?', 'What would you like your partner to understand?'],
  ARRAY['Try repeating back what your partner said in your own words', 'Ask one clarifying question before responding']
),
(
  'i_statements_basic',
  'conflict_resolution',
  'i_statements',
  'Instead of saying "You always..." or "You never...", try using I-statements like "I feel..." or "I need...". This helps express your feelings without making your partner defensive.',
  ARRAY['What specific behavior would you like to address?', 'How does this behavior make you feel?', 'What do you need from your partner?'],
  ARRAY['Rewrite your concern using "I feel..." instead of "You..."', 'Practice stating your needs clearly']
);

COMMIT;