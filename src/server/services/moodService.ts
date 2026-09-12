/**
 * Mood Service
 * Mindful 2.0 — Phase 1
 * 
 * Manages MoodLog persistence and automatic signal extraction into the State Engine.
 */

import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { SignalExtractor, MoodLogInput } from '../engine/signalExtractor';
import { stateService } from './stateService';

const TABLE_MOODS = 'mood_logs';

export interface MoodLogRow {
  id: string;
  userId: string;
  energyLevel: number;
  moodType: string;
  notes: string;
  triggers: string[];
  physicalSensations: string[];
  createdAt: string;
}

// In-memory fallback in case Supabase table migration is pending
const inMemoryMoods = new Map<string, MoodLogRow[]>();

export const moodService = {
  /**
   * Record a new mood check-in and automatically emit a WellnessSignal
   */
  async createMoodLog(userId: string, input: Omit<MoodLogInput, 'userId'>): Promise<MoodLogRow> {
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    const newLog: MoodLogRow = {
      id,
      userId,
      energyLevel: input.energyLevel,
      moodType: input.moodType,
      notes: input.notes || '',
      triggers: input.triggers || [],
      physicalSensations: input.physicalSensations || [],
      createdAt,
    };

    // 1. Update in-memory storage for immediate access
    const userMoods = inMemoryMoods.get(userId) || [];
    userMoods.unshift(newLog);
    if (userMoods.length > 50) userMoods.pop();
    inMemoryMoods.set(userId, userMoods);

    // 2. Persist to Supabase if available
    try {
      const { data, error } = await supabase
        .from(TABLE_MOODS)
        .insert({
          user_id: userId,
          energy_level: input.energyLevel,
          mood_type: input.moodType,
          notes: input.notes || '',
          triggers: input.triggers || [],
          physical_sensations: input.physicalSensations || [],
          created_at: createdAt,
        })
        .select()
        .single();

      if (!error && data) {
        newLog.id = data.id;
      }
    } catch (err) {
      console.warn('[MoodService] Supabase insert notice:', err);
    }

    // 3. Extract and ingest a high-confidence WellnessSignal into the Personal State Engine
    const signal = SignalExtractor.fromMoodLog({
      ...input,
      id: newLog.id,
      userId,
      timestamp: createdAt,
    });

    await stateService.ingestSignal(signal);

    // 4. Background pattern analysis trigger (non-blocking)
    try {
      const { patternService } = await import('./patternService');
      void patternService.analyzeAndPersistPatterns(userId);
    } catch {
      // Non-critical background operation
    }

    return newLog;
  },

  /**
   * List mood check-ins for a user
   */
  async listMoodLogs(userId: string, limit: number = 30): Promise<MoodLogRow[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE_MOODS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          energyLevel: row.energy_level,
          moodType: row.mood_type,
          notes: row.notes || '',
          triggers: row.triggers || [],
          physicalSensations: row.physical_sensations || [],
          createdAt: row.created_at,
        }));
      }
    } catch {
      // Fall through to in-memory moods
    }

    return inMemoryMoods.get(userId) || [];
  },
};
