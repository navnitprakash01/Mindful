-- Migration: 20260914000000_personal_memory_and_proactivity.sql
-- Mindful 2.0 Phase 8: Proactive Intelligence + Personal AI Memory

-- 1. Create personal_memories table
CREATE TABLE IF NOT EXISTS personal_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('preference', 'goal', 'context', 'learned_affinity')),
    key TEXT NOT NULL,
    summary TEXT NOT NULL CHECK (char_length(summary) <= 160),
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.50 CHECK (confidence >= 0.00 AND confidence <= 1.00),
    status TEXT NOT NULL CHECK (status IN ('candidate', 'active', 'stale', 'archived')),
    source_type TEXT NOT NULL CHECK (source_type IN ('user_explicit', 'pattern_engine', 'intervention_outcome')),
    source_id UUID,
    user_confirmed BOOLEAN DEFAULT FALSE,
    last_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_memory_key UNIQUE (user_id, category, key)
);

-- Enable Row Level Security
ALTER TABLE personal_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON personal_memories
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories" ON personal_memories
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own memories" ON personal_memories
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own memories" ON personal_memories
    FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_memories_user_status ON personal_memories(user_id, status);
CREATE INDEX IF NOT EXISTS idx_memories_user_category ON personal_memories(user_id, category);
CREATE INDEX IF NOT EXISTS idx_memories_user_updated ON personal_memories(user_id, updated_at DESC);

-- 2. Create proactive_events table
CREATE TABLE IF NOT EXISTS proactive_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    trigger_type TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('surfaced', 'suppressed', 'dismissed', 'acted_upon')),
    suppression_reason TEXT,
    action_payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE proactive_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own proactive events" ON proactive_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proactive events" ON proactive_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_proactive_events_user_created ON proactive_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proactive_events_user_decision ON proactive_events(user_id, decision);
