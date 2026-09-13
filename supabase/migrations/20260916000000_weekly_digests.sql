-- Migration: 20260916000000_weekly_digests.sql
-- Mindful 2.0 Phase 13: Longitudinal Wellness Intelligence Forecasting & Weekly Digest

CREATE TABLE IF NOT EXISTS weekly_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
    digest_data JSONB NOT NULL,
    forecast_snapshot JSONB NOT NULL,
    is_ai_enhanced BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_weekly_digests_user_week UNIQUE (user_id, week_start_date)
);

-- Enable Row Level Security
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly digests" ON weekly_digests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly digests" ON weekly_digests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly digests" ON weekly_digests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly digests" ON weekly_digests
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_user_week ON weekly_digests(user_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_created ON weekly_digests(user_id, created_at DESC);
