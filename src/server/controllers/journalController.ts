import { Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthenticatedRequest } from '../middleware/auth';
import { JournalEntry } from '../../types';
import { stateService } from '../services/stateService';
import { SignalExtractor } from '../engine/signalExtractor';
import { screenForCrisis } from '../engine/interventionEngine/safety';

interface JournalListQuery {
  page?: string;
  limit?: string;
  search?: string;
  tag?: string;
}

interface JournalCreateBody {
  title: string;
  content: string;
  tags: string[];
  mood: string;
  moodScore: number;
  emotion?: string;
  aiSummary?: string;
  aiAnalysis?: string;
  favorite: boolean;
  aiEmotions?: { name: string; score: number }[];
  aiThemes?: string[];
  aiSuggestedAction?: string;
  aiReflectionPrompt?: string;
}

interface JournalUpdateBody {
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

function mapRowToEntry(row: Record<string, unknown>): JournalEntry {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    title: row.title as string,
    content: row.content as string,
    tags: (row.tags as string[]) ?? [],
    mood: row.mood as string,
    moodScore: row.mood_score as number,
    emotion: row.emotion as string | undefined,
    aiSummary: row.ai_summary as string | undefined,
    aiAnalysis: row.ai_analysis as string | undefined,
    favorite: row.favorite as boolean,
    wordCount: row.word_count as number,
    aiEmotions: (row.ai_emotions as { name: string; score: number }[]) ?? undefined,
    aiThemes: (row.ai_themes as string[]) ?? undefined,
    aiSuggestedAction: row.ai_suggested_action as string | undefined,
    aiReflectionPrompt: row.ai_reflection_prompt as string | undefined,
  };
}

export const journalController = {
  async create(req: AuthenticatedRequest, res: Response) {
    try {
      const body = req.body as JournalCreateBody;
      const userId = req.user!.id;

      if (!body.content || !body.content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const wordCount = body.content.trim().split(/\s+/).filter(Boolean).length;

      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          user_id: userId,
          title: body.title?.trim() || 'Untitled Reflection',
          content: body.content,
          tags: body.tags ?? [],
          mood: body.mood,
          mood_score: body.moodScore,
          emotion: body.emotion,
          ai_summary: body.aiSummary,
          ai_analysis: body.aiAnalysis,
          favorite: body.favorite ?? false,
          ...(body.aiEmotions ? { ai_emotions: body.aiEmotions } : {}),
          ...(body.aiThemes ? { ai_themes: body.aiThemes } : {}),
          ...(body.aiSuggestedAction ? { ai_suggested_action: body.aiSuggestedAction } : {}),
          ...(body.aiReflectionPrompt ? { ai_reflection_prompt: body.aiReflectionPrompt } : {}),
        })
        .select()
        .single();

      if (error) {
        console.error('Create Journal Error:', error);
        console.error('Supabase Error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return res.status(500).json({
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }

      // Emit personal state signal
      try {
        const crisisCheck = screenForCrisis((body.content || '') + ' ' + (body.title || ''));
        const signal = SignalExtractor.fromJournal({
          id: data.id,
          userId,
          content: body.content,
          tags: body.tags,
          mood: body.mood,
          moodScore: body.moodScore,
          emotion: body.emotion,
          aiAnalysis: {
            dominantEmotion: body.emotion || body.mood,
            dominantScore: body.moodScore,
            emotions: body.aiEmotions,
            themes: body.aiThemes,
            summary: body.aiSummary,
            suggestedAction: body.aiSuggestedAction,
            reflectionPrompt: body.aiReflectionPrompt,
          },
        });
        if (crisisCheck.isCrisisDetected) {
          (signal.features as any).isCrisisDetected = true;
          (signal.features as any).matchedTrigger = crisisCheck.matchedTrigger;
        }
        await stateService.ingestSignal(signal);

        const mapped = mapRowToEntry(data);
        if (crisisCheck.isCrisisDetected) {
          return res.status(201).json({
            ...mapped,
            isCrisisDetected: true,
            crisisNotice: crisisCheck.helplineNotice,
          });
        }
      } catch (sigErr) {
        console.warn('Journal signal emission notice:', sigErr);
      }

      return res.status(201).json(mapRowToEntry(data));
    } catch (err) {
      console.error('Create journal entry exception:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { page = '1', limit = '20', search, tag } = req.query as JournalListQuery;
      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
      const offset = (pageNum - 1) * limitNum;

      let query = supabase
        .from('journal_entries')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limitNum - 1);

      if (search) {
        query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
      }

      if (tag) {
        query = query.contains('tags', [tag]);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('List journal entries error:', error);
        return res.status(500).json({ error: 'Failed to fetch journal entries' });
      }

      return res.json({
        entries: (data ?? []).map(mapRowToEntry),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limitNum),
        },
      });
    } catch (err) {
      console.error('List journal entries exception:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Journal entry not found' });
        }
        console.error('Get journal entry error:', error);
        return res.status(500).json({ error: 'Failed to fetch journal entry' });
      }

      return res.json(mapRowToEntry(data));
    } catch (err) {
      console.error('Get journal entry exception:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const body = req.body as JournalUpdateBody;

      if (body.content !== undefined && !body.content.trim()) {
        return res.status(400).json({ error: 'Content cannot be empty' });
      }

      const updates: Record<string, unknown> = {};
      if (body.title !== undefined) updates.title = body.title.trim() || 'Untitled Reflection';
      if (body.content !== undefined) updates.content = body.content;
      if (body.tags !== undefined) updates.tags = body.tags;
      if (body.mood !== undefined) updates.mood = body.mood;
      if (body.moodScore !== undefined) updates.mood_score = body.moodScore;
      if (body.emotion !== undefined) updates.emotion = body.emotion;
      if (body.aiSummary !== undefined) updates.ai_summary = body.aiSummary;
      if (body.aiAnalysis !== undefined) updates.ai_analysis = body.aiAnalysis;
      if (body.favorite !== undefined) updates.favorite = body.favorite;
      if (body.aiEmotions !== undefined) updates.ai_emotions = body.aiEmotions;
      if (body.aiThemes !== undefined) updates.ai_themes = body.aiThemes;
      if (body.aiSuggestedAction !== undefined) updates.ai_suggested_action = body.aiSuggestedAction;
      if (body.aiReflectionPrompt !== undefined) updates.ai_reflection_prompt = body.aiReflectionPrompt;

      if (body.content !== undefined) {
        updates.word_count = body.content.trim().split(/\s+/).filter(Boolean).length;
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Journal entry not found' });
        }
        console.error('Update journal entry error:', error);
        return res.status(500).json({ error: 'Failed to update journal entry' });
      }

      // Emit updated signal into Personal State Engine
      try {
        const signal = SignalExtractor.fromJournal({
          id: data.id,
          userId,
          content: data.content,
          mood: data.mood,
          moodScore: data.mood_score,
          emotion: data.emotion,
          aiAnalysis: {
            dominantEmotion: data.emotion || data.mood,
            dominantScore: data.mood_score,
            emotions: data.ai_emotions,
            themes: data.ai_themes,
            summary: data.ai_summary,
            suggestedAction: data.ai_suggested_action,
            reflectionPrompt: data.ai_reflection_prompt,
          },
        });
        await stateService.ingestSignal(signal);
      } catch (sigErr) {
        console.warn('Journal update signal emission notice:', sigErr);
      }

      return res.json(mapRowToEntry(data));
    } catch (err) {
      console.error('Update journal entry exception:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Delete journal entry error:', error);
        return res.status(500).json({ error: 'Failed to delete journal entry' });
      }

      return res.status(204).send();
    } catch (err) {
      console.error('Delete journal entry exception:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  async toggleFavorite(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const { data: existing, error: fetchError } = await supabase
        .from('journal_entries')
        .select('favorite')
        .eq('id', id)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return res.status(404).json({ error: 'Journal entry not found' });
        }
        console.error('Fetch for toggle favorite error:', fetchError);
        return res.status(500).json({ error: 'Failed to toggle favorite' });
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .update({ favorite: !existing.favorite })
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Toggle favorite error:', error);
        return res.status(500).json({ error: 'Failed to toggle favorite' });
      }

      return res.json(mapRowToEntry(data));
    } catch (err) {
      console.error('Toggle favorite exception:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
};