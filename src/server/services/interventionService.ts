/**
 * Intervention Service
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Coordinates intervention discovery, recommendations, session execution,
 * outcome tracking, state loop completion, and dual-layer persistence (Supabase + in-memory fallback).
 */

import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { isValidUuid } from '../engine/providers';
import {
  INTERVENTION_LIBRARY,
  selectIntervention,
  calculateAllInterventionsEffectiveness,
  computeSessionDeltas,
  InterventionDefinition,
  InterventionRecommendation,
  InterventionSession,
  InterventionEffectiveness,
} from '../engine/interventionEngine';
import { stateService } from './stateService';
import { patternService } from './patternService';
import { StateDimensionKey, WellnessSignal } from '../engine/types';

const TABLE_INTERVENTION_SESSIONS = 'intervention_sessions';

// In-memory fallback caches for zero-budget offline resilience & non-hanging tests
const inMemorySessions = new Map<string, InterventionSession[]>();

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

export const interventionService = {
  /**
   * Return all available intervention definitions from the internal library.
   */
  getAvailableInterventions(): InterventionDefinition[] {
    return Object.values(INTERVENTION_LIBRARY);
  },

  /**
   * Get an intervention definition by its unique ID.
   */
  getInterventionById(id: string): InterventionDefinition | null {
    return INTERVENTION_LIBRARY[id] || null;
  },

  /**
   * Retrieve deterministic, personalized intervention recommendation for a user.
   * Completely read-only and side-effect free.
   */
  async getRecommendation(
    userId: string,
    textContext?: string | null
  ): Promise<InterventionRecommendation> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    // 1. Retrieve current state
    const currentState = await stateService.getCurrentState(userId).catch(() => null);

    // 2. Retrieve recent patterns
    const recentPatterns = await patternService.getPatterns(userId).catch(() => []);

    // 3. Retrieve past intervention sessions
    const sessionHistory = await this.getUserHistory(userId).catch(() => []);

    // 4. Deterministically select recommendation
    return selectIntervention({
      currentState,
      recentPatterns,
      sessionHistory,
      currentTimestamp: new Date(),
      textContext,
    });
  },

  /**
   * Start a new intervention session, taking an initial pre-state snapshot.
   */
  async startSession(userId: string, interventionId: string): Promise<InterventionSession> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    const definition = INTERVENTION_LIBRARY[interventionId];
    if (!definition) {
      throw new Error(`INTERVENTION_NOT_FOUND: Unknown intervention ID '${interventionId}'`);
    }

    // Capture pre-state snapshot
    const currentState = await stateService.getCurrentState(userId).catch(() => null);
    const preStateSnapshot: Record<StateDimensionKey, number> = {
      mood: currentState?.mood ?? 70,
      stress: currentState?.stress ?? 30,
      fatigue: currentState?.fatigue ?? 35,
      energy: currentState?.energy ?? 65,
      focus: currentState?.focus ?? 70,
      cognitiveLoad: currentState?.cognitiveLoad ?? 35,
    };

    const sessionId = randomUUID();
    const nowIso = new Date().toISOString();

    const session: InterventionSession = {
      id: sessionId,
      userId,
      interventionId,
      status: 'started',
      startedAt: nowIso,
      preStateSnapshot,
      interventionVersion: definition.version,
      createdAt: nowIso,
    };

    // 1. Cache in memory
    const userSessions = inMemorySessions.get(userId) || [];
    userSessions.unshift(session);
    inMemorySessions.set(userId, userSessions);

    // 2. Persist to Supabase
    try {
      await withDbTimeout(
        supabase.from(TABLE_INTERVENTION_SESSIONS).insert({
          id: session.id,
          user_id: session.userId,
          intervention_id: session.interventionId,
          status: session.status,
          started_at: session.startedAt,
          pre_state_snapshot: session.preStateSnapshot,
          intervention_version: session.interventionVersion,
          created_at: session.createdAt,
        })
      );
    } catch {
      // Fallback preserved in memory
    }

    return session;
  },

  /**
   * Complete an intervention session, compute deltas, feed signal to State Engine, and persist.
   */
  async completeSession(
    userId: string,
    sessionId: string,
    payload: {
      postStateSnapshot?: Record<StateDimensionKey, number>;
      perceivedUsefulness?: number;
      userFeedback?: string;
      durationSeconds?: number;
    }
  ): Promise<InterventionSession> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }
    if (!isValidUuid(sessionId)) {
      throw new Error('INVALID_SESSION_ID: Must be a valid UUID');
    }

    // 1. Find session
    let session = (inMemorySessions.get(userId) || []).find((s) => s.id === sessionId);

    if (!session) {
      try {
        const { data, error } = await withDbTimeout(
          supabase
            .from(TABLE_INTERVENTION_SESSIONS)
            .select('*')
            .eq('id', sessionId)
            .eq('user_id', userId)
            .single()
        );

        if (!error && data) {
          session = {
            id: data.id,
            userId: data.user_id,
            interventionId: data.intervention_id,
            status: data.status,
            startedAt: data.started_at,
            completedAt: data.completed_at,
            durationSeconds: data.duration_seconds,
            preStateSnapshot: data.pre_state_snapshot,
            postStateSnapshot: data.post_state_snapshot,
            dimensionDeltas: data.dimension_deltas,
            perceivedUsefulness: data.perceived_usefulness,
            userFeedback: data.user_feedback,
            interventionVersion: data.intervention_version,
            createdAt: data.created_at,
          };
        }
      } catch {
        // Query failed
      }
    }

    if (!session) {
      throw new Error('SESSION_NOT_FOUND: Session does not exist or user does not have permission');
    }

    // Idempotency: if already completed, return existing session
    if (session.status === 'completed') {
      return session;
    }

    // Determine post-state snapshot
    let postStateSnapshot = payload.postStateSnapshot;
    if (!postStateSnapshot) {
      const currentState = await stateService.getCurrentState(userId).catch(() => null);
      postStateSnapshot = {
        mood: currentState?.mood ?? session.preStateSnapshot.mood,
        stress: currentState?.stress ?? session.preStateSnapshot.stress,
        fatigue: currentState?.fatigue ?? session.preStateSnapshot.fatigue,
        energy: currentState?.energy ?? session.preStateSnapshot.energy,
        focus: currentState?.focus ?? session.preStateSnapshot.focus,
        cognitiveLoad: currentState?.cognitiveLoad ?? session.preStateSnapshot.cognitiveLoad,
      };
    }

    // Compute mathematical deltas: post - pre
    const dimensionDeltas = computeSessionDeltas(session.preStateSnapshot, postStateSnapshot);
    const completedAt = new Date().toISOString();

    const updatedSession: InterventionSession = {
      ...session,
      status: 'completed',
      completedAt,
      durationSeconds: payload.durationSeconds ?? session.durationSeconds,
      postStateSnapshot,
      dimensionDeltas,
      perceivedUsefulness: payload.perceivedUsefulness,
      userFeedback: payload.userFeedback,
    };

    // Update memory
    const userSessions = inMemorySessions.get(userId) || [];
    const idx = userSessions.findIndex((s) => s.id === sessionId);
    if (idx >= 0) {
      userSessions[idx] = updatedSession;
    } else {
      userSessions.unshift(updatedSession);
    }
    inMemorySessions.set(userId, userSessions);

    // Update database
    try {
      await withDbTimeout(
        supabase
          .from(TABLE_INTERVENTION_SESSIONS)
          .update({
            status: 'completed',
            completed_at: updatedSession.completedAt,
            duration_seconds: updatedSession.durationSeconds,
            post_state_snapshot: updatedSession.postStateSnapshot,
            dimension_deltas: updatedSession.dimensionDeltas,
            perceived_usefulness: updatedSession.perceivedUsefulness,
            user_feedback: updatedSession.userFeedback,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .eq('user_id', userId)
      );
    } catch {
      // Memory fallback preserved
    }

    // Close the product loop: Feed intervention outcome as a WellnessSignal back into State Engine
    try {
      const outcomeSignal: WellnessSignal = {
        id: randomUUID(),
        userId,
        timestamp: completedAt,
        modality: 'intervention_outcome',
        sourceId: sessionId,
        estimates: {
          mood: { value: postStateSnapshot.mood, confidence: 0.85 },
          stress: { value: postStateSnapshot.stress, confidence: 0.85 },
          fatigue: { value: postStateSnapshot.fatigue, confidence: 0.85 },
          energy: { value: postStateSnapshot.energy, confidence: 0.85 },
          focus: { value: postStateSnapshot.focus, confidence: 0.85 },
          cognitiveLoad: { value: postStateSnapshot.cognitiveLoad, confidence: 0.85 },
        },
        features: {
          triggers: [session.interventionId],
          sentimentSummary: `Completed ${session.interventionId} intervention`,
        },
        reliabilityWeight: 0.90, // High reliability: post-session reflective report
        expiresAt: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      };

      await stateService.ingestSignal(outcomeSignal);
    } catch {
      // Non-blocking signal ingestion
    }

    return updatedSession;
  },

  /**
   * Retrieve intervention session history for a user.
   */
  async getUserHistory(userId: string, limit = 50): Promise<InterventionSession[]> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    const cached = inMemorySessions.get(userId) || [];

    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_INTERVENTION_SESSIONS)
          .select('*')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(limit)
      );

      if (!error && data && data.length > 0) {
        const mapped: InterventionSession[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          interventionId: row.intervention_id,
          status: row.status,
          startedAt: row.started_at,
          completedAt: row.completed_at,
          durationSeconds: row.duration_seconds,
          preStateSnapshot: row.pre_state_snapshot,
          postStateSnapshot: row.post_state_snapshot,
          dimensionDeltas: row.dimension_deltas,
          perceivedUsefulness: row.perceived_usefulness,
          userFeedback: row.user_feedback,
          interventionVersion: row.intervention_version,
          createdAt: row.created_at,
        }));

        inMemorySessions.set(userId, mapped);
        return mapped;
      }
    } catch {
      // Fall through to memory
    }

    return cached.slice(0, limit);
  },

  /**
   * Compute aggregated personal effectiveness statistics for all interventions.
   */
  async getEffectiveness(userId: string): Promise<Record<string, InterventionEffectiveness>> {
    const history = await this.getUserHistory(userId);
    return calculateAllInterventionsEffectiveness(history);
  },

  /**
   * Clear in-memory sessions (for testing only).
   */
  _clearMemory(): void {
    inMemorySessions.clear();
  },
};
