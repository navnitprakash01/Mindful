-- Migration: 20260915000000_user_habits.sql
-- Mindful 2.0 Phase 11: Behavioral Rituals & Habit Action Intelligence

CREATE TABLE IF NOT EXISTS user_habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL,
    target_frequency INT NOT NULL DEFAULT 7,
    preferred_time_window TEXT NOT NULL DEFAULT 'anytime',
    duration_minutes INT,
    status TEXT NOT NULL DEFAULT 'active',
    completed_dates TEXT[] DEFAULT '{}',
    streak INT DEFAULT 0,
    best_streak INT DEFAULT 0,
    source_intervention_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE user_habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits" ON user_habits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON user_habits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON user_habits
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON user_habits
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_habits_user_status ON user_habits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_habits_created ON user_habits(user_id, created_at DESC);
