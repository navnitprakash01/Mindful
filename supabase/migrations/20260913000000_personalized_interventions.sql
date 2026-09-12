-- Migration: 20260913000000_personalized_interventions.sql
-- Mindful 2.0 Phase 3: Personalized Intervention + Outcome Tracking Schema

CREATE TABLE IF NOT EXISTS intervention_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    intervention_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'abandoned')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INT,
    pre_state_snapshot JSONB NOT NULL,
    post_state_snapshot JSONB,
    dimension_deltas JSONB DEFAULT '{}',
    perceived_usefulness INT CHECK (perceived_usefulness BETWEEN 1 AND 5),
    user_feedback TEXT,
    intervention_version TEXT NOT NULL DEFAULT '1.0.0',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE intervention_sessions ENABLE ROW LEVEL SECURITY;

-- User-scoped RLS policies (Idempotent: DROP POLICY IF EXISTS followed by CREATE POLICY)
DROP POLICY IF EXISTS "Users can view own intervention sessions" ON intervention_sessions;
CREATE POLICY "Users can view own intervention sessions" ON intervention_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own intervention sessions" ON intervention_sessions;
CREATE POLICY "Users can insert own intervention sessions" ON intervention_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own intervention sessions" ON intervention_sessions;
CREATE POLICY "Users can update own intervention sessions" ON intervention_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own intervention sessions" ON intervention_sessions;
CREATE POLICY "Users can delete own intervention sessions" ON intervention_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Indexes for performance, timeline queries, and multi-tenant scoping
CREATE INDEX IF NOT EXISTS idx_sessions_user_started ON intervention_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON intervention_sessions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_intervention ON intervention_sessions(user_id, intervention_id);