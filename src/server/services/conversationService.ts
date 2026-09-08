import { supabase } from '../lib/supabase';
import type {
  CompanionConversation,
  CompanionMessage,
  CreateConversationRequest,
  CreateMessageRequest,
  GenerateTitleRequest,
} from '../types/companion';

const TABLE_CONVERSATIONS = 'companion_conversations';
const TABLE_MESSAGES = 'companion_messages';

function generateTitle(firstUserMessage: string): string {
  const cleaned = firstUserMessage.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 40) return cleaned;
  
  const words = cleaned.split(' ');
  let title = '';
  for (const word of words) {
    if ((title + word).length > 37) break;
    title += (title ? ' ' : '') + word;
  }
  return title.length < cleaned.length ? title + '...' : title;
}

function mapConversationRow(row: any): CompanionConversation {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapMessageRow(row: any): CompanionMessage {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata || {},
    created_at: row.created_at,
  };
}

export const conversationService = {
  async createConversation(userId: string, firstUserMessage?: string): Promise<CompanionConversation | null> {
    const title = firstUserMessage ? generateTitle(firstUserMessage) : 'New Conversation';
    
    const { data, error } = await supabase
      .from('companion_conversations')
      .insert({
        user_id: userId,
        title,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create conversation:', error);
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return mapConversationRow(data);
  },

  async getConversations(userId: string): Promise<CompanionConversation[]> {
    const { data, error } = await supabase
      .from('companion_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch conversations:', error);
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return (data || []).map(mapConversationRow);
  },

  async getConversationById(userId: string, conversationId: string): Promise<CompanionConversation | null> {
    const { data, error } = await supabase
      .from('companion_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch conversation:', error);
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return data ? mapConversationRow(data) : null;
  },

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('companion_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to delete conversation:', error);
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }

    return true;
  },

  async getMessages(conversationId: string, limit = 50): Promise<CompanionMessage[]> {
    const { data, error } = await supabase
      .from('companion_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch messages:', error);
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return (data || []).map(mapMessageRow);
  },

  async addMessage(input: CreateMessageRequest): Promise<CompanionMessage | null> {
    const { data, error } = await supabase
      .from('companion_messages')
      .insert({
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to add message:', error);
      throw new Error(`Failed to add message: ${error.message}`);
    }

    return mapMessageRow(data);
  },

  async updateConversationTimestamp(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('companion_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (error) {
      console.error('Failed to update conversation timestamp:', error);
    }
  },

  generateTitle,
};