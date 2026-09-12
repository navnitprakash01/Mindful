export interface JournalEntryRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  mood: string;
  mood_score: number;
  emotion?: string;
  ai_summary?: string;
  ai_analysis?: string;
  favorite: boolean;
  word_count: number;
  ai_emotions?: { name: string; score: number }[];
  ai_themes?: string[];
  ai_suggested_action?: string;
  ai_reflection_prompt?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateJournalEntryInput {
  title: string;
  content: string;
  tags: string[];
  mood: string;
  moodScore: number;
  emotion?: string;
  aiSummary?: string;
  aiAnalysis?: string;
  favorite?: boolean;
  aiEmotions?: { name: string; score: number }[];
  aiThemes?: string[];
  aiSuggestedAction?: string;
  aiReflectionPrompt?: string;
}

export interface UpdateJournalEntryInput {
  title?: string;
  content?: string;
  tags?: string[];
  mood?: string;
  moodScore?: number;
  emotion?: string;
  aiSummary?: string;
  aiAnalysis?: string;
  favorite?: boolean;
  aiEmotions?: { name: string; score: number }[];
  aiThemes?: string[];
  aiSuggestedAction?: string;
  aiReflectionPrompt?: string;
}

export interface JournalEntryResponse {
  id: string;
  createdAt: string;
  title: string;
  content: string;
  tags: string[];
  mood: string;
  moodScore: number;
  emotion?: string;
  aiSummary?: string;
  aiAnalysis?: string;
  favorite: boolean;
  wordCount: number;
  aiEmotions?: { name: string; score: number }[];
  aiThemes?: string[];
  aiSuggestedAction?: string;
  aiReflectionPrompt?: string;
}

export interface PaginatedJournalResponse {
  entries: JournalEntryResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface JournalQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
  mood?: string;
  favorite?: boolean;
  sortBy?: 'created_at' | 'updated_at' | 'title';
  sortOrder?: 'asc' | 'desc';
}