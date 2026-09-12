-- Migration: 20260911000000_personal_state_engine.sql
-- Mindful 2.0 Phase 1: Personal State Engine Schema

-- 1. Create mood_logs table (persisting previously client-only mood logs)
CREATE TABLE IF NOT EXISTS mood_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    energy_level INT NOT NULL CHECK (energy_level BETWEEN 1 AND 10),
    mood_type TEXT NOT NULL,
    notes TEXT DEFAULT '',
    triggers TEXT[] DEFAULT '{}',
    physical_sensations TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mood logs" ON mood_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mood logs" ON mood_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mood logs" ON mood_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mood logs" ON mood_logs
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mood_logs_user_created ON mood_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_logs_mood_type ON mood_logs(mood_type);

-- 2. Create wellness_signals table (standardized multimodal signal store)
CREATE TABLE IF NOT EXISTS wellness_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    modality TEXT NOT NULL,
    source_id UUID,
    estimates JSONB NOT NULL,
    features JSONB DEFAULT '{}',
    reliability_weight NUMERIC(3, 2) DEFAULT 1.00,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE wellness_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wellness signals" ON wellness_signals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wellness signals" ON wellness_signals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wellness signals" ON wellness_signals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wellness signals" ON wellness_signals
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_signals_user_active ON wellness_signals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_expiry ON wellness_signals(expires_at);

-- 3. Create personal_wellness_states table (longitudinal state snapshots)
CREATE TABLE IF NOT EXISTS personal_wellness_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    dimensions JSONB NOT NULL,
    overall_confidence NUMERIC(3, 2) NOT NULL,
    somatic_markers TEXT[] DEFAULT '{}',
    contextual_triggers TEXT[] DEFAULT '{}',
    evidence JSONB DEFAULT '[]',
    source_summary JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE personal_wellness_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wellness states" ON personal_wellness_states
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wellness states" ON personal_wellness_states
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_states_user_created ON personal_wellness_states(user_id, created_at DESC);

-- 4. Create personal_baselines table (computed baseline distributions per user)
CREATE TABLE IF NOT EXISTS personal_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    observation_count INT DEFAULT 0,
    overall_confidence NUMERIC(3, 2) DEFAULT 0.00,
    is_preliminary BOOLEAN DEFAULT TRUE,
    dimensions JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE personal_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own baseline" ON personal_baselines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own baseline" ON personal_baselines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baseline" ON personal_baselines
    FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_baselines_user ON personal_baselines(user_id);

-- 5. Extend journal_entries to persist complete AI output
ALTER TABLE journal_entries 
    ADD COLUMN IF NOT EXISTS ai_emotions JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS ai_themes TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS ai_suggested_action TEXT,
    ADD COLUMN IF NOT EXISTS ai_reflection_prompt TEXT;
