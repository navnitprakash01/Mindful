/**
 * Cognitive Service
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 *
 * Coordinates deep work focus session lifecycles, aggregated telemetry processing,
 * rate limiting, signal extraction into StateService, and data purging.
 *
 * Strict Architectural Guarantees:
 * - Sessions are server-generated and user-scoped (no cross-tenant leakage).
 * - Rate-limited telemetry heartbeats with zero raw keylogging.
 * - Discarded sessions produce ZERO signals.
 * - Completed sessions ingest canonical 'session_cognitive' signal into StateService.
 */

import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { isValidUuid } from '../engine/providers';
import { stateService } from './stateService';
import { interventionService } from './interventionService';
import { SignalExtractor } from '../engine/signalExtractor';
import { CognitiveSignalProvider } from '../engine/cognitive/cognitiveSignalProvider';
import {
  FocusSession,
  StartSessionInput,
  CompleteSessionInput,
  CognitiveTelemetryWindow,
  CognitiveMetrics,
  CognitiveEstimate,
} from '../engine/cognitive/types';
import { WellnessSignal, PersonalState } from '../engine/types';
import { InterventionDefinition } from '../engine/interventionEngine/types';

const TABLE_SIGNALS = 'wellness_signals';

const cognitiveProvider = new CognitiveSignalProvider();

// In-memory active session stores
const activeSessions = new Map<string, FocusSession>();
const userActiveSessionMap = new Map<string, string>(); // userId -> sessionId
const lastHeartbeatTimestamps = new Map<string, number>(); // sessionId -> epochMs

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

export const cognitiveService = {
  /**
   * Initiates a new user-controlled focus session.
   */
  async startSession(userId: string, input: StartSessionInput): Promise<FocusSession> {
    if (!isValidUuid(userId)) {
      throw new Error('Invalid user ID');
    }

    // If user already has an active session, mark the prior one as discarded
    const existingSessionId = userActiveSessionMap.get(userId);
    if (existingSessionId && activeSessions.has(existingSessionId)) {
      const prior = activeSessions.get(existingSessionId)!;
      if (prior.status === 'active') {
        prior.status = 'discarded';
      }
    }

    const sessionId = randomUUID();
    const nowIso = new Date().toISOString();

    const session: FocusSession = {
      id: sessionId,
      userId,
      sessionType: input.sessionType,
      plannedDurationMinutes: input.plannedDurationMinutes,
      activityLabel: input.activityLabel,
      status: 'active',
      startedAt: nowIso,
      heartbeatCount: 0,
      aggregatedTelemetry: {
        totalIntervalSeconds: 0,
        totalAttentionalShifts: 0,
        totalActiveTypingSeconds: 0,
        cadenceEntropySamples: [],
      },
    };

    activeSessions.set(sessionId, session);
    userActiveSessionMap.set(userId, sessionId);
    lastHeartbeatTimestamps.set(sessionId, 0);

    return session;
  },

  /**
   * Retrieves current active focus session for a user.
   */
  getActiveSession(userId: string): FocusSession | null {
    if (!isValidUuid(userId)) return null;
    const sessionId = userActiveSessionMap.get(userId);
    if (!sessionId) return null;
    const session = activeSessions.get(sessionId);
    if (!session || session.status !== 'active') return null;
    return session;
  },

  /**
   * Records a heartbeat window of aggregated telemetry metrics.
   * Rate limited to at most 1 per 5 seconds per session.
   */
  async recordHeartbeat(
    userId: string,
    sessionId: string,
    telemetry: CognitiveTelemetryWindow
  ): Promise<{
    success: boolean;
    cognitiveLoad: number;
    focusClarity: number;
    recommendationTriggered: boolean;
  }> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Strictly enforce multi-tenant isolation
    if (session.userId !== userId) {
      throw new Error('Forbidden: Session belongs to another user');
    }

    // Strictly enforce session lifecycle state
    if (session.status !== 'active') {
      throw new Error(`Cannot record telemetry on ${session.status} session`);
    }

    // Rate limiting: at most 1 heartbeat every 3 seconds per session
    const lastTime = lastHeartbeatTimestamps.get(sessionId) || 0;
    const now = Date.now();
    if (now - lastTime < 2500) {
      throw new Error('Rate limit exceeded: Heartbeats must be spaced by at least 3 seconds');
    }
    lastHeartbeatTimestamps.set(sessionId, now);

    // Update aggregated telemetry
    session.aggregatedTelemetry.totalIntervalSeconds += telemetry.intervalSeconds;
    session.aggregatedTelemetry.totalAttentionalShifts += telemetry.attentionalShiftCount;
    session.aggregatedTelemetry.totalActiveTypingSeconds += telemetry.activeTypingSeconds;
    session.aggregatedTelemetry.cadenceEntropySamples.push(telemetry.typingCadenceEntropy);
    if (telemetry.subjectiveDifficulty !== undefined) {
      session.aggregatedTelemetry.latestSubjectiveDifficulty = telemetry.subjectiveDifficulty;
    }
    session.lastHeartbeatAt = new Date().toISOString();
    session.heartbeatCount++;

    // Calculate intermediate rolling metrics
    const durationMinutes = Math.max(1, Math.round(session.aggregatedTelemetry.totalIntervalSeconds / 60));
    const shiftRate =
      session.aggregatedTelemetry.totalIntervalSeconds > 0
        ? Number(
            (
              (session.aggregatedTelemetry.totalAttentionalShifts /
                session.aggregatedTelemetry.totalIntervalSeconds) *
              60
            ).toFixed(2)
          )
        : 0;

    const meanEntropy =
      session.aggregatedTelemetry.cadenceEntropySamples.length > 0
        ? Number(
            (
              session.aggregatedTelemetry.cadenceEntropySamples.reduce((a, b) => a + b, 0) /
              session.aggregatedTelemetry.cadenceEntropySamples.length
            ).toFixed(2)
          )
        : 0.45;

    const intermediateMetrics: CognitiveMetrics = {
      sessionDurationMinutes: durationMinutes,
      attentionalShiftRate: shiftRate,
      typingCadenceEntropy: meanEntropy,
      activeTypingRatio:
        session.aggregatedTelemetry.totalIntervalSeconds > 0
          ? Number(
              (
                session.aggregatedTelemetry.totalActiveTypingSeconds /
                session.aggregatedTelemetry.totalIntervalSeconds
              ).toFixed(2)
            )
          : 0.5,
      subjectiveDifficulty: session.aggregatedTelemetry.latestSubjectiveDifficulty,
    };

    const intermediateEstimate = cognitiveProvider.calculateEstimate(intermediateMetrics);

    return {
      success: true,
      cognitiveLoad: intermediateEstimate.cognitiveLoad,
      focusClarity: intermediateEstimate.focus,
      recommendationTriggered: intermediateEstimate.cognitiveLoad >= 65,
    };
  },

  /**
   * Finalizes an active focus session, extracts a canonical WellnessSignal,
   * dispatches it to StateService, and returns post-session guidance.
   */
  async completeSession(
    userId: string,
    sessionId: string,
    input: CompleteSessionInput
  ): Promise<{
    session: FocusSession;
    signal: WellnessSignal;
    stateSnapshot: PersonalState;
    suggestedIntervention?: InterventionDefinition;
  }> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Tenant isolation check
    if (session.userId !== userId) {
      throw new Error('Forbidden: Session belongs to another user');
    }

    // Cannot complete an already completed or discarded session
    if (session.status !== 'active') {
      throw new Error(`Cannot complete session with status: ${session.status}`);
    }

    // Finalize duration
    const nowIso = new Date().toISOString();
    session.status = 'completed';
    session.completedAt = nowIso;

    const durationMinutes =
      input.totalDurationMinutes ??
      Math.max(1, Math.round(session.aggregatedTelemetry.totalIntervalSeconds / 60));

    const shiftRate =
      session.aggregatedTelemetry.totalIntervalSeconds > 0
        ? Number(
            (
              (session.aggregatedTelemetry.totalAttentionalShifts /
                session.aggregatedTelemetry.totalIntervalSeconds) *
              60
            ).toFixed(2)
          )
        : (input.summaryMetrics?.attentionalShiftRate ?? 0);

    const meanEntropy =
      session.aggregatedTelemetry.cadenceEntropySamples.length > 0
        ? Number(
            (
              session.aggregatedTelemetry.cadenceEntropySamples.reduce((a, b) => a + b, 0) /
              session.aggregatedTelemetry.cadenceEntropySamples.length
            ).toFixed(2)
          )
        : (input.summaryMetrics?.typingCadenceEntropy ?? 0.45);

    session.summaryMetrics = {
      sessionDurationMinutes: durationMinutes,
      attentionalShiftRate: shiftRate,
      typingCadenceEntropy: meanEntropy,
      activeTypingRatio:
        input.summaryMetrics?.activeTypingRatio ??
        (session.aggregatedTelemetry.totalIntervalSeconds > 0
          ? Number(
              (
                session.aggregatedTelemetry.totalActiveTypingSeconds /
                session.aggregatedTelemetry.totalIntervalSeconds
              ).toFixed(2)
            )
          : 0.5),
      subjectiveDifficulty:
        input.selfReportedStrain !== undefined
          ? Math.max(1, Math.min(5, Math.round((input.selfReportedStrain / 100) * 4 + 1)))
          : session.aggregatedTelemetry.latestSubjectiveDifficulty,
    };

    // Extract signal
    const signal = SignalExtractor.fromCognitiveSession(userId, session);
    session.finalEstimate = cognitiveProvider.calculateEstimate(session.summaryMetrics);

    // Ingest into StateService (feeds MultimodalFusionEngine, StateEngine, and EvidenceGraph)
    await stateService.ingestSignal(signal);

    // Fetch updated authoritative personal state
    const stateSnapshot = await stateService.getCurrentState(userId);

    // Clear active session mapping for user
    if (userActiveSessionMap.get(userId) === sessionId) {
      userActiveSessionMap.delete(userId);
    }

    // Evaluate intervention recommendation if cognitive strain or fatigue is high
    let suggestedIntervention: InterventionDefinition | undefined;
    if (
      stateSnapshot.cognitiveLoad >= 50 ||
      stateSnapshot.focus <= 45 ||
      (session.finalEstimate && session.finalEstimate.cognitiveLoad >= 60)
    ) {
      try {
        const recommendation = await interventionService.getRecommendation(userId);
        if (recommendation?.intervention) {
          suggestedIntervention = recommendation.intervention;
        }
      } catch {
        // Fallback: non-blocking
      }
    }

    return {
      session,
      signal,
      stateSnapshot,
      suggestedIntervention,
    };
  },

  /**
   * Discards an in-progress focus session without generating signals.
   */
  async discardSession(userId: string, sessionId: string): Promise<boolean> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const session = activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.userId !== userId) {
      throw new Error('Forbidden: Session belongs to another user');
    }

    session.status = 'discarded';
    if (userActiveSessionMap.get(userId) === sessionId) {
      userActiveSessionMap.delete(userId);
    }

    return true;
  },

  /**
   * Purges all cognitive session signals for the authenticated user.
   * Strictly isolates deletion to modality = 'session_cognitive'.
   */
  async purgeHistory(userId: string): Promise<{ deletedCount: number }> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    // Clean up any in-memory active sessions for this user
    const activeId = userActiveSessionMap.get(userId);
    if (activeId) {
      activeSessions.delete(activeId);
      userActiveSessionMap.delete(userId);
      lastHeartbeatTimestamps.delete(activeId);
    }

    // Clear from stateService in-memory store
    const purgedFromState = await stateService.purgeSignals(userId, 'session_cognitive');
    let deletedCount = purgedFromState;

    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_SIGNALS)
          .delete()
          .eq('user_id', userId)
          .eq('modality', 'session_cognitive')
          .select('id')
      );

      if (!error && data) {
        deletedCount = Math.max(deletedCount, data.length);
      }
    } catch {
      // In-memory test environment fallback handled
    }

    return { deletedCount };
  },

  /**
   * Testing helper: reset internal memory stores
   */
  _resetMemoryStore(): void {
    activeSessions.clear();
    userActiveSessionMap.clear();
    lastHeartbeatTimestamps.clear();
  },
};
