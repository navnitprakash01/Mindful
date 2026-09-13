-- Migration: 20260917000000_companion_messages_rls.sql
-- Mindful 3.0 — Hardening: Add explicit UPDATE and DELETE RLS policies for companion_messages

-- Policy: Users can only update messages in their own conversations
CREATE POLICY "Users can update own messages" ON companion_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM companion_conversations
            WHERE companion_conversations.id = companion_messages.conversation_id
            AND companion_conversations.user_id = auth.uid()
        )
    );

-- Policy: Users can only delete messages in their own conversations
CREATE POLICY "Users can delete own messages" ON companion_messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM companion_conversations
            WHERE companion_conversations.id = companion_messages.conversation_id
            AND companion_conversations.user_id = auth.uid()
        )
    );
