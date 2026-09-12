/**
 * Proactive Service
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 *
 * Coordinates proactive decision evaluations, event audits, frequency cap enforcement,
 * user response recording, and dual-layer persistence (Supabase + in-memory fallback).
 */

import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { isValidUuid } from '../engine/providers';
import { stateService } from './stateService';
import { patternService } from './patternService';
import { memoryService } from './memoryService';
import { ProactiveDecisionEngine } from '../engine/proactiveEngine/proactiveEngine';
import {
  ProactiveDecision,
  ProactiveEvent,
  ProactiveSettings,
} from '../engine/proactiveEngine/types';
import { DEFAULT_PROACTIVE_SETTINGS, isValidTimezone } from '../engine/proactiveEngine/policyRules';

const TABLE_PROACTIVE_EVENTS = 'proactive_events';

// In-memory fallback caches for zero-budget offline resilience & testing
const inMemoryEvents = new Map<string, ProactiveEvent[]>();
const inMemorySettings = new Map<string, ProactiveSettings>();

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

export const proactiveService = {
  /**
   * Retrieves configured proactive settings for the user.
   */
  async getSettings(userId: string): Promise<ProactiveSettings> {
    if (!isValidUuid(userId)) {
      return DEFAULT_PROACTIVE_SETTINGS;
    }
    return inMemorySettings.get(userId) || DEFAULT_PROACTIVE_SETTINGS;
  },

  /**
   * Updates proactive settings for the authenticated user.
   */
  async updateSettings(userId: string, updates: Partial<ProactiveSettings>): Promise<ProactiveSettings> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    if (updates.userTimezone !== undefined) {
      if (updates.userTimezone && !isValidTimezone(updates.userTimezone)) {
        throw new Error('INVALID_TIMEZONE: Must be a valid IANA timezone identifier');
      }
    }

    const current = await this.getSettings(userId);
    const updated: ProactiveSettings = {
      ...current,
      ...updates,
      userTimezone: (updates.userTimezone && isValidTimezone(updates.userTimezone))
        ? updates.userTimezone.trim()
        : current.userTimezone,
      frequencyCapPerDay: (updates.frequencyCapPerDay && [1, 2, 3].includes(updates.frequencyCapPerDay))
        ? updates.frequencyCapPerDay
        : current.frequencyCapPerDay,
    };

    inMemorySettings.set(userId, updated);
    return updated;
  },

  /**
   * Fetch recent proactive event history for user.
   */
  async getRecentEvents(userId: string, limit = 50): Promise<ProactiveEvent[]> {
    if (!isValidUuid(userId)) return [];

    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_PROACTIVE_EVENTS)
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit)
      );

      if (!error && data) {
        const mapped: ProactiveEvent[] = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          triggerType: row.trigger_type,
          decision: row.decision,
          suppressionReason: row.suppression_reason || undefined,
          actionPayload: row.action_payload || {},
          createdAt: row.created_at,
        }));
        inMemoryEvents.set(userId, mapped);
        return mapped;
      }
    } catch {
      // Fall through to in-memory store
    }

    return inMemoryEvents.get(userId) || [];
  },

  /**
   * Read-only evaluation of whether a proactive decision is currently justified.
   * Completely side-effect free: does NOT write to database.
   */
  async checkProactiveStatus(
    userId: string,
    options?: { textContext?: string; userTimezone?: string }
  ): Promise<ProactiveDecision> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    // 1. Fetch authoritative PersonalState
    const currentState = await stateService.getCurrentState(userId).catch(() => null);

    // 2. Fetch validated longitudinal patterns
    const patterns = await patternService.getPatterns(userId).catch(() => []);

    // 3. Fetch active relevant memories
    const activeMemories = await memoryService.resolveActiveMemoryContext(userId, 5).catch(() => []);

    // 4. Fetch recent proactive event audit trail
    const recentEvents = await this.getRecentEvents(userId, 20).catch(() => []);

    // 5. Fetch user settings
    const settings = await this.getSettings(userId);
    if (options?.userTimezone && isValidTimezone(options.userTimezone)) {
      settings.userTimezone = options.userTimezone.trim();
    }

    // 6. Evaluate deterministic decision policy
    return ProactiveDecisionEngine.evaluate({
      userId,
      currentState,
      patterns,
      activeMemories,
      recentEvents,
      settings,
      now: new Date(),
      textContext: options?.textContext,
    });
  },

  /**
   * Records that a proactive action was actively surfaced to the user.
   */
  async recordSurfacedDecision(userId: string, decision: ProactiveDecision): Promise<ProactiveEvent> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    const eventId = randomUUID();
    const eventRecord: ProactiveEvent = {
      id: eventId,
      userId,
      triggerType: decision.actionType || 'gentle_state_reflection',
      decision: 'surfaced',
      actionPayload: {
        headline: decision.headline,
        message: decision.message,
        rationale: decision.rationale,
        suggestedInterventionId: decision.suggestedInterventionId,
        evidenceReferences: decision.evidenceReferences,
      },
      createdAt: new Date().toISOString(),
    };

    const userEvents = inMemoryEvents.get(userId) || [];
    userEvents.unshift(eventRecord);
    inMemoryEvents.set(userId, userEvents);

    try {
      await withDbTimeout(
        supabase.from(TABLE_PROACTIVE_EVENTS).insert({
          id: eventRecord.id,
          user_id: eventRecord.userId,
          trigger_type: eventRecord.triggerType,
          decision: eventRecord.decision,
          action_payload: eventRecord.actionPayload,
          created_at: eventRecord.createdAt,
        })
      );
    } catch {
      // In-memory fallback preserved
    }

    return eventRecord;
  },

  /**
   * Records user feedback/response to a surfaced proactive action.
   */
  async recordResponse(
    userId: string,
    eventId: string,
    response: 'dismissed' | 'acted_upon'
  ): Promise<ProactiveEvent> {
    if (!isValidUuid(userId) || !isValidUuid(eventId)) {
      throw new Error('INVALID_ID: User ID and Event ID must be valid UUIDs');
    }

    const now = new Date().toISOString();
    const responseEventId = randomUUID();
    const eventRecord: ProactiveEvent = {
      id: responseEventId,
      userId,
      triggerType: 'user_response',
      decision: response,
      actionPayload: { respondingToEventId: eventId },
      createdAt: now,
    };

    const userEvents = inMemoryEvents.get(userId) || [];
    userEvents.unshift(eventRecord);
    inMemoryEvents.set(userId, userEvents);

    try {
      await withDbTimeout(
        supabase.from(TABLE_PROACTIVE_EVENTS).insert({
          id: eventRecord.id,
          user_id: eventRecord.userId,
          trigger_type: eventRecord.triggerType,
          decision: eventRecord.decision,
          action_payload: eventRecord.actionPayload,
          created_at: eventRecord.createdAt,
        })
      );
    } catch {
      // In-memory fallback preserved
    }

    return eventRecord;
  },
};
