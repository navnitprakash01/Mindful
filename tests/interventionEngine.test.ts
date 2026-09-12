/**
 * Intervention Engine Unit Tests
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Tests internal library completeness, deterministic multi-factor recommendation,
 * crisis safety screening, mathematical delta calculation, and strict non-causal language.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVENTION_LIBRARY,
  selectIntervention,
  screenForCrisis,
  computeSessionDeltas,
  calculateInterventionEffectiveness,
  calculateAllInterventionsEffectiveness,
  isFavorableShift,
  InterventionSession,
} from '../src/server/engine/interventionEngine';
import { PersonalState } from '../src/server/engine/types';

process.env.NODE_ENV = 'test';

function createMockState(overrides: Partial<PersonalState> = {}): PersonalState {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    mood: 70,
    stress: 30,
    fatigue: 35,
    energy: 65,
    focus: 70,
    cognitiveLoad: 35,
    confidence: 0.85,
    dimensions: {} as any,
    evidence: [],
    sourceSummary: {},
    overallConfidence: 0.85,
    somaticMarkers: [],
    contextualTriggers: [],
    activeSignalsCount: 5,
    decayHalfLifeHours: 12,
    ...overrides,
  };
}

describe('Intervention Library Integrity', () => {
  it('contains all 8 deterministic, safe protocols', () => {
    const requiredIds = [
      'breathing-reset',
      'grounding-anchor',
      'focus-reset',
      'cognitive-unload',
      'somatic-recovery',
      'gentle-reflection',
      'sleep-winddown',
      'behavioral-activation',
    ];

    for (const id of requiredIds) {
      const item = INTERVENTION_LIBRARY[id];
      assert.ok(item, `Missing intervention ${id}`);
      assert.strictEqual(item.id, id);
      assert.ok(item.title.length > 0);
      assert.ok(item.shortDescription.length > 0);
      assert.ok(item.steps.length >= 3, `Protocol ${id} should have at least 3 steps`);
      assert.ok(item.durationMinutes > 0);
      assert.ok(item.safetyNotes.length > 0);
      assert.ok(item.cooldownHours >= 0);
    }
  });
});

describe('Safety & Crisis Screening', () => {
  it('detects crisis keywords and returns 24/7 lifeline contact information', () => {
    const crisisInputs = [
      'I want to die and end it all',
      'Thinking about suicide today',
      'I want to hurt myself badly',
      'There is no reason to live anymore',
    ];

    for (const text of crisisInputs) {
      const res = screenForCrisis(text);
      assert.strictEqual(res.isCrisisDetected, true);
      assert.ok(res.helplineNotice?.includes('988'));
      assert.ok(res.helplineNotice?.includes('741741'));
    }
  });

  it('passes normal stressful or emotional text without triggering false alarms', () => {
    const benignInputs = [
      'I had a very busy and stressful meeting today',
      'Feeling a little tired and unmotivated',
      'My focus was scattered during the afternoon',
      '',
      null,
      undefined,
    ];

    for (const text of benignInputs) {
      const res = screenForCrisis(text);
      assert.strictEqual(res.isCrisisDetected, false);
      assert.strictEqual(res.helplineNotice, undefined);
    }
  });
});

describe('Selection Engine — Deterministic Multi-Factor Matching', () => {
  it('selects Box Breathing or Sensory Grounding for high stress (stress >= 60)', () => {
    const highStressState = createMockState({
      stress: 78,
      mood: 48,
      energy: 55,
      focus: 50,
    });

    const rec = selectIntervention({
      currentState: highStressState,
      currentTimestamp: new Date('2026-09-12T14:00:00Z'),
    });

    assert.ok(
      rec.intervention.id === 'breathing-reset' || rec.intervention.id === 'grounding-anchor',
      `Expected stress reset, got ${rec.intervention.id}`
    );
    assert.strictEqual(rec.isColdOrLowConfidence, false);
    assert.ok(rec.suitabilityScore >= 0.6);
    assert.ok(rec.reasons.some((r) => r.toLowerCase().includes('stress')));
  });

  it('selects Focus Reset for scattered focus with preserved baseline energy', () => {
    const scatteredFocusState = createMockState({
      stress: 30,
      focus: 38,
      energy: 65,
      cognitiveLoad: 45,
    });

    const rec = selectIntervention({
      currentState: scatteredFocusState,
      currentTimestamp: new Date('2026-09-12T11:00:00Z'),
    });

    assert.strictEqual(rec.intervention.id, 'focus-reset');
    assert.ok(rec.reasons.some((r) => r.toLowerCase().includes('focus')));
  });

  it('selects Somatic Recovery for high fatigue (fatigue >= 60)', () => {
    const exhaustedState = createMockState({
      fatigue: 75,
      energy: 30,
      stress: 40,
      focus: 40,
    });

    const rec = selectIntervention({
      currentState: exhaustedState,
      currentTimestamp: new Date('2026-09-12T15:00:00Z'),
    });

    assert.strictEqual(rec.intervention.id, 'somatic-recovery');
    assert.ok(rec.reasons.some((r) => r.toLowerCase().includes('fatigue')));
  });

  it('selects Sleep Wind-Down in late evening hours (e.g. 22:00)', () => {
    const eveningState = createMockState({
      stress: 45,
      fatigue: 55,
      energy: 35,
    });

    const eveningDate = new Date();
    eveningDate.setHours(22, 0, 0, 0);

    const rec = selectIntervention({
      currentState: eveningState,
      currentTimestamp: eveningDate,
    });

    assert.strictEqual(rec.intervention.id, 'sleep-winddown');
  });

  it('handles cold start and low confidence gracefully without guessing', () => {
    const coldRec = selectIntervention({
      currentState: null,
    });

    assert.strictEqual(coldRec.isColdOrLowConfidence, true);
    assert.ok(coldRec.reasons.some((r) => r.toLowerCase().includes('low') || r.toLowerCase().includes('calibrat')));
    assert.ok(coldRec.alternativeInterventions && coldRec.alternativeInterventions.length >= 1);
  });

  it('attaches crisis helpline notice to recommendation if textContext indicates crisis', () => {
    const rec = selectIntervention({
      currentState: createMockState({ stress: 80 }),
      textContext: 'I feel suicidal today',
    });

    assert.ok(rec.safetyNotice);
    assert.ok(rec.safetyNotice.includes('988'));
  });
});

describe('Effectiveness Engine & Non-Causal Outcomes', () => {
  it('computes exact mathematical dimension deltas (post - pre)', () => {
    const pre = {
      mood: 45,
      stress: 75,
      fatigue: 60,
      energy: 40,
      focus: 35,
      cognitiveLoad: 70,
    };

    const post = {
      mood: 60,
      stress: 45,
      fatigue: 55,
      energy: 50,
      focus: 60,
      cognitiveLoad: 50,
    };

    const deltas = computeSessionDeltas(pre, post);

    assert.strictEqual(deltas.mood, 15);
    assert.strictEqual(deltas.stress, -30);
    assert.strictEqual(deltas.fatigue, -5);
    assert.strictEqual(deltas.energy, 10);
    assert.strictEqual(deltas.focus, 25);
    assert.strictEqual(deltas.cognitiveLoad, -20);
  });

  it('correctly evaluates polarity of favorable shifts', () => {
    // Mood/Energy/Focus: higher is positive
    assert.strictEqual(isFavorableShift('mood', 10), true);
    assert.strictEqual(isFavorableShift('mood', -5), false);
    assert.strictEqual(isFavorableShift('focus', 15), true);

    // Stress/Fatigue/CognitiveLoad: lower is positive
    assert.strictEqual(isFavorableShift('stress', -15), true);
    assert.strictEqual(isFavorableShift('stress', 10), false);
    assert.strictEqual(isFavorableShift('fatigue', -8), true);
    assert.strictEqual(isFavorableShift('cognitiveLoad', -12), true);
  });

  it('calculates completion rate and average usefulness from history', () => {
    const sessions: InterventionSession[] = [
      {
        id: 's1',
        userId: 'u1',
        interventionId: 'breathing-reset',
        status: 'completed',
        startedAt: '2026-09-10T10:00:00Z',
        completedAt: '2026-09-10T10:03:00Z',
        preStateSnapshot: { mood: 50, stress: 70, fatigue: 40, energy: 50, focus: 50, cognitiveLoad: 40 },
        postStateSnapshot: { mood: 60, stress: 55, fatigue: 40, energy: 50, focus: 50, cognitiveLoad: 40 },
        dimensionDeltas: { stress: -15, mood: 10 },
        perceivedUsefulness: 5,
        interventionVersion: '1.0.0',
        createdAt: '2026-09-10T10:00:00Z',
      },
      {
        id: 's2',
        userId: 'u1',
        interventionId: 'breathing-reset',
        status: 'completed',
        startedAt: '2026-09-11T10:00:00Z',
        completedAt: '2026-09-11T10:03:00Z',
        preStateSnapshot: { mood: 50, stress: 80, fatigue: 40, energy: 50, focus: 50, cognitiveLoad: 40 },
        postStateSnapshot: { mood: 65, stress: 60, fatigue: 40, energy: 50, focus: 50, cognitiveLoad: 40 },
        dimensionDeltas: { stress: -20, mood: 15 },
        perceivedUsefulness: 4,
        interventionVersion: '1.0.0',
        createdAt: '2026-09-11T10:00:00Z',
      },
      {
        id: 's3',
        userId: 'u1',
        interventionId: 'breathing-reset',
        status: 'abandoned',
        startedAt: '2026-09-11T14:00:00Z',
        preStateSnapshot: { mood: 50, stress: 80, fatigue: 40, energy: 50, focus: 50, cognitiveLoad: 40 },
        interventionVersion: '1.0.0',
        createdAt: '2026-09-11T14:00:00Z',
      },
    ];

    const stats = calculateInterventionEffectiveness('breathing-reset', sessions);

    assert.strictEqual(stats.attemptsCount, 3);
    assert.strictEqual(stats.completedCount, 2);
    assert.strictEqual(stats.completionRate, 0.67);
    assert.strictEqual(stats.avgUsefulness, 4.5);
    assert.strictEqual(stats.dimensionStats.stress?.avgDelta, -17.5);
    assert.strictEqual(stats.dimensionStats.stress?.positiveShiftCount, 2);
  });

  it('STRICT NON-CAUSALITY: Factual summaries never use causal or clinical claims', () => {
    const sessions: InterventionSession[] = [
      {
        id: 's1',
        userId: 'u1',
        interventionId: 'focus-reset',
        status: 'completed',
        startedAt: '2026-09-10T10:00:00Z',
        preStateSnapshot: { mood: 50, stress: 40, fatigue: 40, energy: 60, focus: 30, cognitiveLoad: 40 },
        postStateSnapshot: { mood: 55, stress: 35, fatigue: 40, energy: 60, focus: 55, cognitiveLoad: 35 },
        dimensionDeltas: { focus: 25 },
        perceivedUsefulness: 5,
        interventionVersion: '1.0.0',
        createdAt: '2026-09-10T10:00:00Z',
      },
      {
        id: 's2',
        userId: 'u1',
        interventionId: 'focus-reset',
        status: 'completed',
        startedAt: '2026-09-11T10:00:00Z',
        preStateSnapshot: { mood: 50, stress: 40, fatigue: 40, energy: 60, focus: 35, cognitiveLoad: 40 },
        postStateSnapshot: { mood: 55, stress: 35, fatigue: 40, energy: 60, focus: 60, cognitiveLoad: 35 },
        dimensionDeltas: { focus: 25 },
        perceivedUsefulness: 4,
        interventionVersion: '1.0.0',
        createdAt: '2026-09-11T10:00:00Z',
      },
      {
        id: 's3',
        userId: 'u1',
        interventionId: 'focus-reset',
        status: 'completed',
        startedAt: '2026-09-12T10:00:00Z',
        preStateSnapshot: { mood: 50, stress: 40, fatigue: 40, energy: 60, focus: 40, cognitiveLoad: 40 },
        postStateSnapshot: { mood: 55, stress: 35, fatigue: 40, energy: 60, focus: 65, cognitiveLoad: 35 },
        dimensionDeltas: { focus: 25 },
        perceivedUsefulness: 5,
        interventionVersion: '1.0.0',
        createdAt: '2026-09-12T10:00:00Z',
      },
    ];

    const all = calculateAllInterventionsEffectiveness(sessions);
    const forbiddenCausalWords = [
      /\bcause\b/i,
      /\bcaused\b/i,
      /\bcauses\b/i,
      /\bproves\b/i,
      /\bcure\b/i,
      /\bcured\b/i,
      /\bfixes\b/i,
      /\bguarantee\b/i,
      /\bguarantees\b/i,
      /\btreatment\b/i,
    ];

    for (const [id, eff] of Object.entries(all)) {
      for (const pattern of forbiddenCausalWords) {
        assert.ok(
          !pattern.test(eff.factualSummary),
          `Intervention ${id} contains forbidden causal language matching ${pattern}: "${eff.factualSummary}"`
        );
      }
    }
  });
});
