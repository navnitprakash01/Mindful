-- Migration: 20260912000000_longitudinal_pattern_engine.sql
-- Mindful 2.0 Phase 2: Longitudinal Pattern Engine Schema

CREATE TABLE IF NOT EXISTS personal_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0.00 AND confidence <= 1.00),
    strength TEXT NOT NULL CHECK (strength IN ('mild', 'moderate', 'strong')),
    status TEXT NOT NULL CHECK (status IN ('candidate', 'validated', 'weakening', 'inactive')),
    first_observed_at TIMESTAMPTZ NOT NULL,
    last_observed_at TIMESTAMPTZ NOT NULL,
    observation_count INT NOT NULL DEFAULT 1,
    evidence JSONB NOT NULL DEFAULT '{}',
    ai_explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_pattern UNIQUE (user_id, pattern_type, pattern_key)
);

-- Enable Row Level Security
ALTER TABLE personal_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns" ON personal_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns" ON personal_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns" ON personal_patterns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns" ON personal_patterns
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for fast query and user-scoped retrieval
CREATE INDEX IF NOT EXISTS idx_patterns_user_status ON personal_patterns(user_id, status, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_updated ON personal_patterns(user_id, updated_at DESC);
