-- Companion Conversations & Messages Tables
-- Migration: 20240101000001_create_companion_tables.sql

-- Conversations table
CREATE TABLE IF NOT EXISTS companion_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE IF NOT EXISTS companion_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES companion_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_companion_conversations_user_id ON companion_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_companion_conversations_updated_at ON companion_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_companion_messages_conversation_id ON companion_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_companion_messages_created_at ON companion_messages(created_at);

-- RLS Policies
ALTER TABLE companion_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON companion_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON companion_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON companion_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON companion_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Users can only access messages in their own conversations
CREATE POLICY "Users can view own messages" ON companion_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM companion_conversations
            WHERE companion_conversations.id = companion_messages.conversation_id
            AND companion_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages" ON companion_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM companion_conversations
            WHERE companion_conversations.id = companion_messages.conversation_id
            AND companion_conversations.user_id = auth.uid()
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companion_conversations_updated_at ON companion_conversations;

CREATE TRIGGER update_companion_conversations_updated_at
    BEFORE UPDATE ON companion_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE companion_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE companion_messages;