/**
 * Personal State Service
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 * 
 * Manages signal ingestion, state calculation, baseline tracking, and persistence coordination.
 * Provides resilient dual-layer architecture (Supabase DB + zero-budget in-memory fallback).
 */

import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { defaultStateEngine } from '../engine/stateEngine';
import { defaultBaselineEngine } from '../engine/baselineEngine';
import { isValidUuid } from '../engine/providers';
import {
  WellnessSignal,
  PersonalState,
  PersonalBaseline,
  StateEvidenceItem,
} from '../engine/types';

const TABLE_SIGNALS = 'wellness_signals';
const TABLE_STATES = 'personal_wellness_states';
const TABLE_BASELINES = 'personal_baselines';

// In-memory fallback caches for zero-budget offline resilience
const inMemorySignals = new Map<string, WellnessSignal[]>();
const inMemoryStates = new Map<string, PersonalState[]>();
const inMemoryBaselines = new Map<string, PersonalBaseline>();

const isTestEnv = process.env.NODE_ENV === 'test';

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

export const stateService = {
  /**
   * Ingest a new WellnessSignal into the system
   */
  async ingestSignal(signal: WellnessSignal): Promise<void> {
    // 1. In-memory cache for immediate zero-latency access
    const userSignals = inMemorySignals.get(signal.userId) || [];
    userSignals.unshift(signal);
    if (userSignals.length > 50) userSignals.pop();
    inMemorySignals.set(signal.userId, userSignals);

    // 2. Persist to Supabase with timeout guard
    try {
      const validSignalId = isValidUuid(signal.id) ? signal.id : randomUUID();
      const validSourceId = isValidUuid(signal.sourceId) ? signal.sourceId : null;

      const { error } = await withDbTimeout(
        supabase.from(TABLE_SIGNALS).insert({
          id: validSignalId,
          user_id: signal.userId,
          modality: signal.modality,
          source_id: validSourceId,
          estimates: signal.estimates,
          features: signal.features,
          reliability_weight: signal.reliabilityWeight,
          expires_at: signal.expiresAt,
          created_at: signal.timestamp,
        })
      );

      if (error) {
        console.warn(`[StateService] Database signal persist notice: ${error.message}`);
      }
    } catch (err) {
      console.warn('[StateService] Supabase signal insert notice (using in-memory):', (err as Error).message);
    }

    // 3. Persist state snapshot upon signal ingestion (state-changing event)
    try {
      const updatedState = await this.getCurrentState(signal.userId);
      await this.saveStateSnapshot(updatedState);
    } catch {
      // Non-critical background save
    }
  },

  /**
   * Fetch active signals for a user (past 48 hours)
   */
  async getActiveSignals(userId: string): Promise<WellnessSignal[]> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_SIGNALS)
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: false })
      );

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          timestamp: row.created_at,
          modality: row.modality,
          sourceId: row.source_id,
          estimates: row.estimates,
          features: row.features || {},
          reliabilityWeight: Number(row.reliability_weight || 1.0),
          expiresAt: row.expires_at,
        }));
      }
    } catch {
      // Fall through to in-memory store
    }

    return inMemorySignals.get(userId) || [];
  },

  /**
   * Get or calculate the user's personal baseline from real recorded history
   */
  async getPersonalBaseline(userId: string): Promise<PersonalBaseline> {
    // 1. Check in-memory cache
    const cachedBaseline = inMemoryBaselines.get(userId);

    // 2. Try fetching persisted baseline from database
    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_BASELINES)
          .select('*')
          .eq('user_id', userId)
          .maybeSingle()
      );

      if (!error && data) {
        const baseline: PersonalBaseline = {
          userId: data.user_id,
          observationCount: data.observation_count,
          overallConfidence: Number(data.overall_confidence),
          isPreliminary: data.is_preliminary,
          dimensions: data.dimensions,
          lastUpdated: data.last_updated,
        };
        inMemoryBaselines.set(userId, baseline);
        return baseline;
      }
    } catch {
      // Continue to computation from history
    }

    if (cachedBaseline) {
      return cachedBaseline;
    }

    // 3. Compute baseline from historical states (up to 30 days)
    const history = await this.getStateHistory(userId, 30);
    const computedBaseline = defaultBaselineEngine.calculateBaseline(userId, history);
    inMemoryBaselines.set(userId, computedBaseline);

    // 4. Upsert baseline snapshot to database if user has recorded states
    if (history.length > 0) {
      try {
        await withDbTimeout(
          supabase.from(TABLE_BASELINES).upsert({
            user_id: userId,
            observation_count: computedBaseline.observationCount,
            overall_confidence: computedBaseline.overallConfidence,
            is_preliminary: computedBaseline.isPreliminary,
            dimensions: computedBaseline.dimensions,
            last_updated: computedBaseline.lastUpdated,
          }, { onConflict: 'user_id' })
        );
      } catch {
        // Non-critical background save
      }
    }

    return computedBaseline;
  },

  /**
   * Compute the current PersonalState for a user (read-only and idempotent)
   */
  async getCurrentState(userId: string): Promise<PersonalState> {
    const signals = await this.getActiveSignals(userId);
    const baseline = await this.getPersonalBaseline(userId);
    const computedState = defaultStateEngine.computeState(userId, signals, new Date(), baseline);

    // Cache state in memory
    const userStates = inMemoryStates.get(userId) || [];
    userStates.unshift(computedState);
    if (userStates.length > 30) userStates.pop();
    inMemoryStates.set(userId, userStates);

    return computedState;
  },

  /**
   * Persist a state snapshot to the database on real state transitions
   */
  async saveStateSnapshot(state: PersonalState): Promise<void> {
    const validStateId = isValidUuid(state.id) ? state.id : randomUUID();

    try {
      await withDbTimeout(
        supabase.from(TABLE_STATES).insert({
          id: validStateId,
          user_id: state.userId,
          dimensions: state.dimensions,
          overall_confidence: state.overallConfidence,
          somatic_markers: state.somaticMarkers,
          contextual_triggers: state.contextualTriggers,
          evidence: state.evidence,
          source_summary: state.sourceSummary,
          created_at: state.timestamp,
        })
      );
    } catch {
      // Non-critical background save
    }
  },

  /**
   * Recompute state and baseline on demand, persisting the snapshot
   */
  async recomputeState(userId: string): Promise<PersonalState> {
    const state = await this.getCurrentState(userId);
    await this.saveStateSnapshot(state);
    return state;
  },

  /**
   * Get structured evidence explaining current state dimensions
   */
  async getStateEvidence(userId: string): Promise<StateEvidenceItem[]> {
    const currentState = await this.getCurrentState(userId);
    return currentState.evidence;
  },

  /**
   * Get historical state snapshots for longitudinal view
   */
  async getStateHistory(userId: string, days: number = 7): Promise<PersonalState[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_STATES)
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', cutoff)
          .order('created_at', { ascending: true })
      );

      if (!error && data && data.length > 0) {
        return data.map((row: any) => {
          const dims = row.dimensions || {};
          const conf = Number(row.overall_confidence || 0.65);
          return {
            id: row.id,
            userId: row.user_id,
            timestamp: row.created_at,
            createdAt: row.created_at,
            mood: dims.mood?.value ?? 70,
            stress: dims.stress?.value ?? 30,
            fatigue: dims.fatigue?.value ?? 35,
            energy: dims.energy?.value ?? 65,
            focus: dims.focus?.value ?? 70,
            cognitiveLoad: dims.cognitiveLoad?.value ?? 35,
            confidence: conf,
            dimensions: dims,
            evidence: row.evidence || [],
            sourceSummary: row.source_summary || {},
            overallConfidence: conf,
            somaticMarkers: row.somatic_markers || [],
            contextualTriggers: row.contextual_triggers || [],
            activeSignalsCount: row.active_signals_count || 0,
            decayHalfLifeHours: 12.0,
          };
        });
      }
    } catch {
      // Fall through to in-memory states
    }

    const cached = inMemoryStates.get(userId) || [];
    if (cached.length > 0) {
      return [...cached].reverse();
    }

    // Return empty history if none recorded (prevents mutual recursion with getCurrentState)
    return [];
  },
};
