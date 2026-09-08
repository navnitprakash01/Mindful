export interface CompanionRequest {
  message: string;
  conversation: ConversationMessage[];
  userId: string;
  mode?: string;
  conversationId?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  mode?: string;
}

export interface CompanionResponse {
  message: string;
  suggestions?: string[];
  timestamp: string;
  conversationId?: string;
}

export interface JournalContext {
  entries: JournalContextEntry[];
  hasContext: boolean;
}

export interface JournalContextEntry {
  date: string;
  emotion: string;
  summary: string;
  themes: string[];
}

export interface PromptContext {
  systemPrompt: string;
  conversation: ConversationMessage[];
  journalContext: JournalContext;
  currentMessage: string;
  mode: string;
}

export interface JournalEntryRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  mood: string;
  mood_score: number;
  emotion: string | null;
  ai_summary: string | null;
  ai_analysis: string | null;
  favorite: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

// Conversation persistence types
export interface CompanionConversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CompanionMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ConversationListResponse {
  conversations: CompanionConversation[];
}

export interface ConversationDetailResponse {
  conversation: CompanionConversation;
  messages: CompanionMessage[];
}

export interface CreateConversationRequest {
  title: string;
  userId: string;
}

export interface CreateMessageRequest {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateTitleRequest {
  firstUserMessage: string;
}