/**
 * Proactive Decision Engine Policy Gate Tests
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ProactiveDecisionEngine } from '../src/server/engine/proactiveEngine/proactiveEngine';
import { PersonalState } from '../src/server/engine/types';
import { PersonalPattern } from '../src/server/engine/patternEngine/types';
import { PersonalMemory } from '../src/server/services/memoryService';
import { ProactiveEvent } from '../src/server/engine/proactiveEngine/types';

describe('ProactiveDecisionEngine — Deterministic Policy Gate Pipeline', () => {
  const userId = randomUUID();

  // Baseline mock state with calibrated confidence
  function makeMockState(overrides: Partial<PersonalState> = {}): PersonalState {
    return {
      id: randomUUID(),
      userId,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      mood: 55,
      stress: 40,
      fatigue: 45,
      energy: 60,
      focus: 65,
      cognitiveLoad: 40,
      confidence: 0.70,
      overallConfidence: 0.70,
      dimensions: {
        mood: { value: 55, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        stress: { value: 40, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        fatigue: { value: 45, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        energy: { value: 60, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        focus: { value: 65, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        cognitiveLoad: { value: 40, confidence: 0.70, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
      },
      evidence: [],
      sourceSummary: { mood_checkin: 1 },
      somaticMarkers: [],
      contextualTriggers: [],
      activeSignalsCount: 2,
      decayHalfLifeHours: 12,
      ...overrides,
    };
  }

  function makeMockPattern(overrides: Partial<PersonalPattern> = {}): PersonalPattern {
    return {
      id: randomUUID(),
      userId,
      type: 'temporal_rhythm',
      patternKey: 'afternoon_focus_dip',
      title: 'Afternoon Focus Dip',
      description: 'Focus tends to dip between 2pm and 4pm.',
      deterministicTitle: 'Afternoon Focus Dip',
      deterministicDescription: 'Focus tends to dip between 2pm and 4pm.',
      confidence: 0.75,
      strength: 'moderate',
      status: 'validated',
      firstObservedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      lastObservedAt: new Date().toISOString(),
      observationCount: 6,
      evidence: {
        observationCount: 6,
        supportingCount: 5,
        comparisonCount: 1,
        supportingTimestamps: [],
        metricKey: 'focus',
        supportingAvg: 40,
        sampleContexts: [],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  // Noon UTC (outside quiet hours)
  const daytimeDate = new Date('2026-09-12T14:00:00Z');

  describe('Gate 1: Safety & Crisis Precedence', () => {
    it('immediately suppresses proactive outreach if crisis text is detected', () => {
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: true, quietHoursStart: 22, quietHoursEnd: 8, userTimezone: 'UTC' },
        now: daytimeDate,
        textContext: 'I feel completely hopeless and want to end it all',
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.decisionType, 'suppressed');
      assert.strictEqual(decision.suppressionReason, 'crisis_active');
    });

    it('suppresses proactive outreach if contextual triggers in state contain crisis markers', () => {
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState({ contextualTriggers: ['severe hopelessness and want to die'] }),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: true, quietHoursStart: 22, quietHoursEnd: 8, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'crisis_active');
    });
  });

  describe('Gate 2: User Opt-In', () => {
    it('strictly preserves silence when user has not enabled proactive intelligence', () => {
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: false },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'opt_in_disabled');
    });
  });

  describe('Gate 3: Quiet Hours', () => {
    it('suppresses contact during quiet hours (e.g. 23:00 local time)', () => {
      const nighttime = new Date('2026-09-12T23:30:00Z');
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: true, quietHoursStart: 22, quietHoursEnd: 8, userTimezone: 'UTC' },
        now: nighttime,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'quiet_hours_active');
    });

    it('correctly uses user local timezone to evaluate quiet hours', () => {
      // 14:00 UTC is 07:00 in America/Los_Angeles (UTC-7) -> within 22:00-08:00 quiet hours!
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [],
        settings: {
          enabled: true,
          quietHoursStart: 22,
          quietHoursEnd: 8,
          userTimezone: 'America/Los_Angeles',
        },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'quiet_hours_active');
    });
  });

  describe('Gate 4 & 5: Frequency Cap and Cooldown', () => {
    it('suppresses contact when daily frequency cap is reached', () => {
      const pastEvent: ProactiveEvent = {
        id: randomUUID(),
        userId,
        triggerType: 'gentle_state_reflection',
        decision: 'surfaced',
        createdAt: new Date(daytimeDate.getTime() - 8 * 3600000).toISOString(), // 8h ago
      };

      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [pastEvent],
        settings: { enabled: true, frequencyCapPerDay: 1, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'frequency_cap_reached');
    });

    it('suppresses contact when within 6-hour cooldown window', () => {
      const recentSurfaced: ProactiveEvent = {
        id: randomUUID(),
        userId,
        triggerType: 'gentle_state_reflection',
        decision: 'surfaced',
        createdAt: new Date(daytimeDate.getTime() - 2 * 3600000).toISOString(), // 2h ago (< 6h)
      };

      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [recentSurfaced],
        settings: { enabled: true, frequencyCapPerDay: 3, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'cooldown_active');
      assert.strictEqual(decision.cooldownHoursRemaining, 4.0);
    });
  });

  describe('Gate 6 & 7: Active Session and Recent Dismissal', () => {
    it('suppresses contact when an intervention session is currently in progress', () => {
      const activeSession = {
        id: randomUUID(),
        userId,
        interventionId: 'box-breathing',
        status: 'started' as const,
        startedAt: new Date().toISOString(),
        preStateSnapshot: {} as any,
        interventionVersion: '1.0.0',
        createdAt: new Date().toISOString(),
      };

      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [],
        activeInterventionSession: activeSession,
        settings: { enabled: true, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'active_intervention_in_progress');
    });

    it('suppresses contact when user dismissed a prompt within 12 hours', () => {
      const recentDismissal: ProactiveEvent = {
        id: randomUUID(),
        userId,
        triggerType: 'user_response',
        decision: 'dismissed',
        createdAt: new Date(daytimeDate.getTime() - 3 * 3600000).toISOString(), // 3h ago
      };

      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [recentDismissal],
        settings: { enabled: true, frequencyCapPerDay: 3, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'recent_dismissal');
    });
  });

  describe('Gate 8 & 9: Evidence Sufficiency & Action Selection', () => {
    it('suppresses contact when state confidence is low (< 0.25)', () => {
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState({ overallConfidence: 0.15 }),
        patterns: [makeMockPattern()],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: true, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'low_confidence_state');
    });

    it('suppresses contact when evidence is insufficient (silence is default)', () => {
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [], // no patterns
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: true, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'insufficient_evidence');
    });

    it('surfaces pattern_check_in when validated mature pattern exists', () => {
      const pattern = makeMockPattern();
      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: makeMockState(),
        patterns: [pattern],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: true, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, true);
      assert.strictEqual(decision.decisionType, 'surfaced');
      assert.strictEqual(decision.actionType, 'pattern_check_in');
      assert.match(decision.headline!, /Recurring Pattern/);
      assert.ok(decision.evidenceReferences.includes(pattern.id));
    });

    it('surfaces intervention_suggestion when stress is elevated and user has breathing affinity', () => {
      const memory: PersonalMemory = {
        id: randomUUID(),
        userId,
        category: 'learned_affinity',
        key: 'breath_rating',
        summary: 'User rated breathing reset 5/5 previously.',
        confidence: 0.90,
        status: 'active',
        sourceType: 'intervention_outcome',
        userConfirmed: true,
        lastObservedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const highStressState = makeMockState({
        stress: 68,
        activeSignalsCount: 2,
        dimensions: {
          mood: { value: 50, confidence: 0.7, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          stress: { value: 68, confidence: 0.8, baselineDeviation: 18, trend: 'declining', contributingSignalIds: [] },
          fatigue: { value: 50, confidence: 0.7, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          energy: { value: 50, confidence: 0.7, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          focus: { value: 50, confidence: 0.7, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          cognitiveLoad: { value: 50, confidence: 0.7, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        },
      });

      const decision = ProactiveDecisionEngine.evaluate({
        userId,
        currentState: highStressState,
        patterns: [],
        activeMemories: [memory],
        recentEvents: [],
        settings: { enabled: true, userTimezone: 'UTC' },
        now: daytimeDate,
      });

      assert.strictEqual(decision.shouldSurface, true);
      assert.strictEqual(decision.actionType, 'intervention_suggestion');
      assert.strictEqual(decision.suggestedInterventionId, 'box-breathing');
      assert.match(decision.message!, /box breathing/i);
    });
  });
});
