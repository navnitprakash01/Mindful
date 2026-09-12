import { supabase } from '../lib/supabase';
import type {
  JournalEntryRow,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
  JournalEntryResponse,
  PaginatedJournalResponse,
  JournalQueryParams,
} from '../types/journal';

const TABLE_NAME = 'journal_entries';

function mapRowToResponse(row: JournalEntryRow): JournalEntryResponse {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    content: row.content,
    tags: row.tags,
    mood: row.mood,
    moodScore: row.mood_score,
    emotion: row.emotion ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    aiAnalysis: row.ai_analysis ?? undefined,
    favorite: row.favorite,
    wordCount: row.word_count,
    aiEmotions: row.ai_emotions ?? undefined,
    aiThemes: row.ai_themes ?? undefined,
    aiSuggestedAction: row.ai_suggested_action ?? undefined,
    aiReflectionPrompt: row.ai_reflection_prompt ?? undefined,
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const journalService = {
  async create(userId: string, input: CreateJournalEntryInput): Promise<JournalEntryResponse> {
    const wordCount = countWords(input.content);
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        user_id: userId,
        title: input.title,
        content: input.content,
        tags: input.tags,
        mood: input.mood,
        mood_score: input.moodScore,
        emotion: input.emotion ?? null,
        ai_summary: input.aiSummary ?? null,
        ai_analysis: input.aiAnalysis ?? null,
        favorite: input.favorite ?? false,
        word_count: wordCount,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create journal entry: ${error.message}`);
    }

    return mapRowToResponse(data);
  },

  async getById(userId: string, entryId: string): Promise<JournalEntryResponse | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select()
      .eq('id', entryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch journal entry: ${error.message}`);
    }

    return data ? mapRowToResponse(data) : null;
  },

  async list(userId: string, params: JournalQueryParams = {}): Promise<PaginatedJournalResponse> {
    const {
      page = 1,
      pageSize = 10,
      search,
      tag,
      mood,
      favorite,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = params;

    let query = supabase
      .from(TABLE_NAME)
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%,tags.cs.{${search}}`);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    if (mood) {
      query = query.eq('mood', mood);
    }

    if (favorite !== undefined) {
      query = query.eq('favorite', favorite);
    }

    const validSortColumns = ['created_at', 'updated_at', 'title'];
    const validSortOrders = ['asc', 'desc'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    query = query.order(sortColumn, { ascending: order === 'asc' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list journal entries: ${error.message}`);
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return {
      entries: (data ?? []).map(mapRowToResponse),
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async update(userId: string, entryId: string, input: UpdateJournalEntryInput): Promise<JournalEntryResponse | null> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (input.title !== undefined) updates.title = input.title;
    if (input.content !== undefined) {
      updates.content = input.content;
      updates.word_count = countWords(input.content);
    }
    if (input.tags !== undefined) updates.tags = input.tags;
    if (input.mood !== undefined) updates.mood = input.mood;
    if (input.moodScore !== undefined) updates.mood_score = input.moodScore;
    if (input.emotion !== undefined) updates.emotion = input.emotion;
    if (input.aiSummary !== undefined) updates.ai_summary = input.aiSummary;
    if (input.aiAnalysis !== undefined) updates.ai_analysis = input.aiAnalysis;
    if (input.favorite !== undefined) updates.favorite = input.favorite;

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(updates)
      .eq('id', entryId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update journal entry: ${error.message}`);
    }

    return data ? mapRowToResponse(data) : null;
  },

  async delete(userId: string, entryId: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete journal entry: ${error.message}`);
    }

    return true;
  },

  async toggleFavorite(userId: string, entryId: string): Promise<JournalEntryResponse | null> {
    const { data: current, error: fetchError } = await supabase
      .from(TABLE_NAME)
      .select('favorite')
      .eq('id', entryId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch journal entry: ${fetchError.message}`);
    }

    if (!current) {
      return null;
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ favorite: !current.favorite, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to toggle favorite: ${error.message}`);
    }

    return data ? mapRowToResponse(data) : null;
  },
};