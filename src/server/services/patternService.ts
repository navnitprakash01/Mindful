/**
 * Pattern Service
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Coordinates historical aggregation, pattern detection, optional narrative enhancement,
 * and idempotent persistence in Supabase with zero-budget in-memory fallback.
 */

import { supabase } from '../lib/supabase';
import { defaultPatternEngine } from '../engine/patternEngine/patternEngine';
import { ObservationNormalizer } from '../engine/patternEngine/normalizer';
import { PersonalPattern } from '../engine/patternEngine/types';
import { moodService } from './moodService';
import { stateService } from './stateService';
import { GoogleGenAI } from '@google/genai';

const TABLE_PATTERNS = 'personal_patterns';

// In-memory fallback for offline resilience & testing
const inMemoryPatterns = new Map<string, PersonalPattern[]>();

/**
 * Timeout wrapper for database requests to guarantee zero hanging on unmigrated / offline DB
 */
async function withDbTimeout<T>(promise: PromiseLike<T>, timeoutMs = 1200): Promise<T> {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('TEST_ENV_IN_MEMORY_ONLY');
  }
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timer!);
  }
}

// Optional Gemini instance for narrative explanation enhancement
let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.NODE_ENV !== 'test') {
  try {
    geminiAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'mindful-patterns' } },
    });
  } catch {
    geminiAi = null;
  }
}

export const patternService = {
  /**
   * Read-only retrieval of validated patterns for an authenticated user.
   * Does NOT trigger re-computation or database writes on read.
   */
  async getPatterns(userId: string): Promise<PersonalPattern[]> {
    // 1. Check in-memory cache
    const cached = inMemoryPatterns.get(userId);

    // 2. Query Supabase
    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_PATTERNS)
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'validated')
          .order('confidence', { ascending: false })
      );

      if (!error && data && data.length > 0) {
        const mapped: PersonalPattern[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          type: row.pattern_type,
          patternKey: row.pattern_key,
          title: row.title,
          description: row.description,
          confidence: Number(row.confidence),
          strength: row.strength,
          status: row.status,
          firstObservedAt: row.first_observed_at,
          lastObservedAt: row.last_observed_at,
          observationCount: row.observation_count,
          evidence: row.evidence || {},
          deterministicTitle: row.title,
          deterministicDescription: row.description,
          aiExplanation: row.ai_explanation || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        inMemoryPatterns.set(userId, mapped);
        return mapped;
      }
    } catch {
      // Fall through to in-memory store
    }

    return cached || [];
  },

  /**
   * Analyze accumulated history, discover patterns, and idempotently persist them.
   * Triggered on meaningful data mutations (e.g. after a mood check-in) or explicit refresh.
   */
  async analyzeAndPersistPatterns(userId: string): Promise<PersonalPattern[]> {
    // 1. Gather real user records from services
    const [moodLogs, activeSignals, stateHistory] = await Promise.all([
      moodService.listMoodLogs(userId, 60),
      stateService.getActiveSignals(userId),
      stateService.getStateHistory(userId, 30),
    ]);

    // 2. Normalize and merge observations into a single chronological stream
    const normalizedLogs = ObservationNormalizer.fromMoodLogs(moodLogs);
    const normalizedSignals = ObservationNormalizer.fromSignals(activeSignals);
    const normalizedStates = ObservationNormalizer.fromStates(stateHistory);

    const mergedObservations = ObservationNormalizer.mergeAndSort(
      normalizedLogs,
      normalizedSignals,
      normalizedStates
    );

    // 3. Run pure Pattern Engine
    const discoveredPatterns = defaultPatternEngine.analyze(userId, mergedObservations);

    // 4. Optional Gemini enhancement for top patterns (non-blocking)
    if (geminiAi && discoveredPatterns.length > 0 && process.env.NODE_ENV !== 'test') {
      try {
        const top = discoveredPatterns.slice(0, 2);
        for (const p of top) {
          const prompt = `You are Mindful's empathetic AI assistant. Explain this validated wellness observation concisely in 1-2 calm, supportive sentences without claiming causation or diagnosing any condition.
Pattern: "${p.title}"
Details: "${p.description}"
Evidence: ${JSON.stringify(p.evidence)}
Do NOT use words like "causes", "because of", or "leads to". Speak strictly about observational co-occurrence.`;

          const response = await geminiAi.models.generateContent({
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            contents: prompt,
          });

          if (response?.text) {
            p.aiExplanation = response.text.trim();
          }
        }
      } catch (aiErr) {
        console.warn('[PatternService] Optional AI explanation notice:', aiErr);
      }
    }

    // 5. Update in-memory cache
    inMemoryPatterns.set(userId, discoveredPatterns);

    // 6. Idempotently persist to Supabase
    if (discoveredPatterns.length > 0) {
      try {
        const records = discoveredPatterns.map((p) => ({
          id: p.id,
          user_id: p.userId,
          pattern_type: p.type,
          pattern_key: p.patternKey,
          title: p.title,
          description: p.description,
          confidence: p.confidence,
          strength: p.strength,
          status: p.status,
          first_observed_at: p.firstObservedAt,
          last_observed_at: p.lastObservedAt,
          observation_count: p.observationCount,
          evidence: p.evidence,
          ai_explanation: p.aiExplanation || null,
          updated_at: new Date().toISOString(),
        }));

        await withDbTimeout(
          supabase
            .from(TABLE_PATTERNS)
            .upsert(records, { onConflict: 'user_id,pattern_type,pattern_key' })
        );
      } catch (dbErr) {
        console.warn('[PatternService] Supabase pattern upsert notice:', (dbErr as Error).message);
      }
    }

    return discoveredPatterns;
  },
};
