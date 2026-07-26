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