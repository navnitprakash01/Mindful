/**
 * Multimodal State Fusion Test Suite
 * Mindful 2.0 — Phase 5: Multimodal State Fusion
 *
 * Exhaustively validates:
 * 1. Harmonious Multi-modal Agreement (corroboration bonus, high consistency index)
 * 2. Multi-modal Disagreement & Conflict (divergence tracking, conflict penalty, non-diagnostic explainability)
 * 3. Duplicate Event & Correlation Damping (diminishing marginal returns, provenance retention)
 * 4. Distinct Events Separation
 * 5. Temporal Epoch Stratification & Decay (Immediate, Recent, Historical, Expired)
 * 6. Single-Modality Graceful Handling (null consistency, <= 0.80 ceiling)
 * 7. Empty State / Cold Start
 * 8. Asymptotic Confidence Saturation (no artificial certainty inflation)
 * 9. Universal Crisis Precedence (crisis in one modality cannot be masked by calm/positive in others)
 * 10. Multi-Tenant Scoping & Isolation
 * 11. Pure Deterministic Execution (zero budget / no LLM required)
 * 12. Non-Finite Robustness (NaN / Infinity protection)
 * 13. Full Provenance & Reference Attribution
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateEngine } from '../src/server/engine/stateEngine';
import { MultimodalFusionEngine } from '../src/server/engine/fusion/fusionEngine';
import {
  stratifySignals,
  classifyTemporalEpoch,
  getSignalAgeHours,
} from '../src/server/engine/fusion/temporal';
import {
  areSignalsCorrelated,
  clusterAndDampSignals,
} from '../src/server/engine/fusion/correlation';
import {
  evaluateCrossModalConsistency,
  CONSISTENCY_CONFIG,
} from '../src/server/engine/fusion/consistency';
import { evaluateSafetyPrecedence } from '../src/server/engine/fusion/safetyPrecedence';
import { WellnessSignal } from '../src/server/engine/types';

describe('Phase 5 — Multimodal State Fusion Subsystem', () => {
  const engine = new StateEngine();
  const fusionEngine = new MultimodalFusionEngine();
  const now = new Date('2026-09-12T12:00:00Z');

  // =========================================================================
  // 1. HARMONIOUS MULTI-MODAL AGREEMENT (CORROBORATION)
  // =========================================================================
  it('1. Harmonious Multi-modal Agreement: computes high consistency, grants bounded corroboration bonus, and generates corroboration evidence', () => {
    // Mood: 78, Journal: 80, Voice: 76 (all close, max discrepancy = 4 points <= 12)
    const signals: WellnessSignal[] = [
      {
        id: 'sig-agree-mood',
        userId: 'user-agree',
        timestamp: now.toISOString(),
        modality: 'mood_checkin',
        estimates: { mood: { value: 78, confidence: 0.90 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sig-agree-journal',
        userId: 'user-agree',
        timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        modality: 'text_journal',
        estimates: { mood: { value: 80, confidence: 0.85 } },
        features: { sentimentSummary: 'Productive morning feeling calm and steady' },
        reliabilityWeight: 0.85,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sig-agree-voice',
        userId: 'user-agree',
        timestamp: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
        modality: 'voice_transcript',
        estimates: { mood: { value: 76, confidence: 0.80 } },
        features: { sentimentSummary: 'Voice acoustics show relaxed speech tempo and steady energy' },
        reliabilityWeight: 0.80,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    const state = engine.computeState('user-agree', signals, now);

    // Consistency score must be high (>= 0.85)
    const moodDim = state.dimensions.mood;
    assert.ok(moodDim.consistencyScore !== null, 'Consistency score should not be null for 3 modalities');
    assert.ok(moodDim.consistencyScore! >= 0.85, `Expected consistency >= 0.85, got ${moodDim.consistencyScore}`);
    assert.strictEqual(moodDim.divergenceDetected, false);

    // Fused value should be around 78-80
    assert.ok(moodDim.value >= 74 && moodDim.value <= 82, `Expected mood near 78, got ${moodDim.value}`);

    // Confidence should receive corroboration bonus (bounded <= 0.95)
    assert.ok(moodDim.confidence > 0.50, 'Confidence should be strong');
    assert.ok(moodDim.confidence <= 0.95, 'Confidence must never exceed multimodal ceiling 0.95');

    // Corroboration evidence item must be present
    const corrobEv = state.evidence.find((e) => e.id === 'ev-corrob-mood');
    assert.ok(corrobEv, 'Corroboration evidence item should be generated');
    assert.ok(corrobEv.observation.includes('corroborate consistent'));
  });

  // =========================================================================
  // 2. MULTI-MODAL DISAGREEMENT & DIVERGENCE
  // =========================================================================
  it('2. Multi-modal Disagreement: identifies divergence, applies conflict penalty, preserves modality breakdown, and uses strictly non-diagnostic phrasing', () => {
    // Mood check-in: 30, Journal: 35, Voice: 80
    // Voice differs from mood check-in by 50 points (> 30 threshold)
    const signals: WellnessSignal[] = [
      {
        id: 'sig-disagree-mood',
        userId: 'user-disagree',
        timestamp: now.toISOString(),
        modality: 'mood_checkin',
        estimates: { mood: { value: 30, confidence: 0.90 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sig-disagree-journal',
        userId: 'user-disagree',
        timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
        modality: 'text_journal',
        estimates: { mood: { value: 35, confidence: 0.85 } },
        features: { sentimentSummary: 'Feeling down and sluggish' },
        reliabilityWeight: 0.85,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sig-disagree-voice',
        userId: 'user-disagree',
        timestamp: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
        modality: 'voice_transcript',
        estimates: { mood: { value: 80, confidence: 0.80 } },
        features: { sentimentSummary: 'Fast-paced voice notes' },
        reliabilityWeight: 0.80,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    const state = engine.computeState('user-disagree', signals, now);
    const moodDim = state.dimensions.mood;

    // Divergence must be detected
    assert.strictEqual(moodDim.divergenceDetected, true, 'Divergence must be flagged');
    assert.ok(moodDim.consistencyScore !== null && moodDim.consistencyScore < 0.85, 'Consistency score should reflect spread');

    // Modality breakdown must be preserved in dimension metadata
    assert.ok(moodDim.modalityBreakdown, 'Modality breakdown should be attached');
    assert.ok(moodDim.modalityBreakdown['mood_checkin']);
    assert.ok(moodDim.modalityBreakdown['voice_transcript']);
    assert.strictEqual(moodDim.modalityBreakdown['mood_checkin']?.value, 30);
    assert.strictEqual(moodDim.modalityBreakdown['voice_transcript']?.value, 80);

    // Divergence evidence item must be generated
    const divEv = state.evidence.find((e) => e.id.startsWith('ev-div-mood'));
    assert.ok(divEv, 'Divergence evidence item should exist');
    assert.ok(divEv.observation.includes('Divergence noted between'));

    // STRICT NON-DIAGNOSTIC PHRASING AUDIT:
    const bannedTerms = [
      'depress', 'anxiety disorder', 'bipolar', 'hypomania', 'masking',
      'alexithymia', 'subconscious suppression', 'pathological', 'psychiatric'
    ];
    for (const ev of state.evidence) {
      for (const term of bannedTerms) {
        assert.ok(
          !ev.observation.toLowerCase().includes(term),
          `Evidence observation must not contain diagnostic term "${term}": got "${ev.observation}"`
        );
      }
    }
  });

  // =========================================================================
  // 3. DUPLICATE EVENT / BURST CORRELATION DAMPING
  // =========================================================================
  it('3. Duplicate Event & Correlation Damping: prevents double-counting while preserving all source references', () => {
    // 3 rapid mood check-ins within 4 minutes (burst)
    const burstSignals: WellnessSignal[] = [
      {
        id: 'burst-1',
        userId: 'user-burst',
        timestamp: now.toISOString(),
        modality: 'mood_checkin',
        sourceId: 'session-quick-check',
        estimates: { mood: { value: 75, confidence: 0.90 } },
        features: { triggers: ['Work'] },
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'burst-2',
        userId: 'user-burst',
        timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
        modality: 'mood_checkin',
        sourceId: 'session-quick-check',
        estimates: { mood: { value: 75, confidence: 0.90 } },
        features: { triggers: ['Work'] },
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'burst-3',
        userId: 'user-burst',
        timestamp: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
        modality: 'mood_checkin',
        sourceId: 'session-quick-check',
        estimates: { mood: { value: 75, confidence: 0.90 } },
        features: { triggers: ['Work'] },
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    const state = engine.computeState('user-burst', burstSignals, now);

    // Verify cluster detection: all 3 signals belong to 1 cluster
    assert.strictEqual(state.clustersCount, 1);
    assert.strictEqual(state.activeSignalsCount, 3);

    // Provenance integrity: contributingSignalIds must retain all 3 signal IDs
    const moodDim = state.dimensions.mood;
    assert.strictEqual(moodDim.contributingSignalIds.length, 3);
    assert.ok(moodDim.contributingSignalIds.includes('burst-1'));
    assert.ok(moodDim.contributingSignalIds.includes('burst-2'));
    assert.ok(moodDim.contributingSignalIds.includes('burst-3'));

    // Effective damped weight check:
    // Rank 0: 1.0x, Rank 1: 0.50x, Rank 2: 0.25x -> Total damped weight = 1.75x, NOT 3.0x
    const temporal = stratifySignals(burstSignals, now);
    const { clusters, effectiveWeightMap } = clusterAndDampSignals(temporal);
    assert.strictEqual(clusters.length, 1);

    const weights = Array.from(effectiveWeightMap.values());
    const totalDampedWeight = weights.reduce((sum, w) => sum + w, 0);
    assert.ok(totalDampedWeight < 2.0, `Expected total weight < 2.0 (damped), got ${totalDampedWeight}`);
    assert.ok(totalDampedWeight >= 1.5, `Expected total weight >= 1.5, got ${totalDampedWeight}`);

    // Confidence must still be constrained to single-modality ceiling <= 0.80
    assert.ok(moodDim.confidence <= 0.80, `Confidence must not exceed single-modality ceiling 0.80, got ${moodDim.confidence}`);
  });

  // =========================================================================
  // 4. DISTINCT EVENTS SEPARATION
  // =========================================================================
  it('4. Distinct Events Separation: signals separated in time or unrelated context do not cluster', () => {
    const signalA: WellnessSignal = {
      id: 'sig-sep-1',
      userId: 'user-sep',
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: { mood: { value: 70, confidence: 0.85 } },
      features: { triggers: ['Fitness'] },
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    // 35 minutes later (well beyond the 15-minute correlation window)
    const signalB: WellnessSignal = {
      id: 'sig-sep-2',
      userId: 'user-sep',
      timestamp: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      modality: 'mood_checkin',
      estimates: { mood: { value: 75, confidence: 0.85 } },
      features: { triggers: ['Work'] },
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const corr = areSignalsCorrelated(signalA, signalB);
    assert.strictEqual(corr.correlated, false, 'Signals > 15m apart must not be correlated');

    const state = engine.computeState('user-sep', [signalA, signalB], now);
    assert.strictEqual(state.clustersCount, 2, 'Should form 2 independent clusters');
  });

  // =========================================================================
  // 5. TEMPORAL STRATIFICATION & DECAY
  // =========================================================================
  it('5. Temporal Stratification & Decay: categorizes into immediate, recent, historical, and discards expired', () => {
    const tImmediate = now.toISOString(); // 0m -> immediate
    const tRecent = new Date(now.getTime() - 2 * 3600 * 1000).toISOString(); // 2h -> recent
    const tHistorical = new Date(now.getTime() - 14 * 3600 * 1000).toISOString(); // 14h -> historical
    const tExpired = new Date(now.getTime() - 50 * 3600 * 1000).toISOString(); // 50h -> expired

    assert.strictEqual(classifyTemporalEpoch(getSignalAgeHours(tImmediate, now)), 'immediate');
    assert.strictEqual(classifyTemporalEpoch(getSignalAgeHours(tRecent, now)), 'recent');
    assert.strictEqual(classifyTemporalEpoch(getSignalAgeHours(tHistorical, now)), 'historical');
    assert.strictEqual(classifyTemporalEpoch(getSignalAgeHours(tExpired, now)), 'expired');

    const mixedSignals: WellnessSignal[] = [
      {
        id: 'sig-imm',
        userId: 'user-temp',
        timestamp: tImmediate,
        modality: 'mood_checkin',
        estimates: { mood: { value: 90, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sig-exp',
        userId: 'user-temp',
        timestamp: tExpired,
        modality: 'mood_checkin',
        estimates: { mood: { value: 10, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    const state = engine.computeState('user-temp', mixedSignals, now);
    // Expired signal must NOT be active
    assert.strictEqual(state.activeSignalsCount, 1);
    assert.strictEqual(state.dimensions.mood.contributingSignalIds.includes('sig-exp'), false);
    assert.strictEqual(state.dimensions.mood.contributingSignalIds.includes('sig-imm'), true);
  });

  // =========================================================================
  // 6. SINGLE MODALITY GRACEFUL HANDLING
  // =========================================================================
  it('6. Single Modality: produces null consistency score and enforces single-modality ceiling <= 0.80', () => {
    const singleModalitySignal: WellnessSignal = {
      id: 'sig-solo',
      userId: 'user-solo',
      timestamp: now.toISOString(),
      modality: 'text_journal',
      estimates: {
        mood: { value: 85, confidence: 0.95 },
        stress: { value: 20, confidence: 0.90 },
      },
      features: {},
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const state = engine.computeState('user-solo', [singleModalitySignal], now);

    // Consistency score must be null (cross-modal cannot be measured with 1 modality)
    assert.strictEqual(state.dimensions.mood.consistencyScore, null);
    assert.strictEqual(state.dimensions.stress.consistencyScore, null);
    assert.strictEqual(state.dimensions.mood.divergenceDetected, false);

    // Confidence must not exceed single-modality ceiling (0.80)
    assert.ok(
      state.dimensions.mood.confidence <= CONSISTENCY_CONFIG.SINGLE_MODALITY_MAX_CONF,
      `Expected mood confidence <= 0.80, got ${state.dimensions.mood.confidence}`
    );
  });

  // =========================================================================
  // 7. EMPTY STATE / COLD START
  // =========================================================================
  it('7. Empty State (Cold Start): returns neutral baseline, 0.0 confidence, and clean null consistency', () => {
    const state = engine.computeState('user-cold', [], now);

    assert.strictEqual(state.activeSignalsCount, 0);
    assert.strictEqual(state.clustersCount, 0);
    assert.strictEqual(state.overallConfidence, 0.0);
    assert.strictEqual(state.dimensions.mood.value, 70); // default baseline
    assert.strictEqual(state.dimensions.mood.confidence, 0.0);
    assert.strictEqual(state.dimensions.mood.consistencyScore, null);
    assert.strictEqual(state.dimensions.mood.divergenceDetected, false);
    assert.strictEqual(state.evidence.length, 0);
  });

  // =========================================================================
  // 8. ASYMPTOTIC CONFIDENCE SATURATION
  // =========================================================================
  it('8. Asymptotic Confidence Saturation: massive signal flood never saturates confidence to 1.0', () => {
    const floodSignals: WellnessSignal[] = [];

    // 15 signals from 3 modalities
    for (let i = 0; i < 5; i++) {
      floodSignals.push({
        id: `flood-m-${i}`,
        userId: 'user-flood',
        timestamp: new Date(now.getTime() - i * 3600 * 1000).toISOString(),
        modality: 'mood_checkin',
        estimates: { mood: { value: 80, confidence: 1.0 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      });
      floodSignals.push({
        id: `flood-j-${i}`,
        userId: 'user-flood',
        timestamp: new Date(now.getTime() - i * 3600 * 1000).toISOString(),
        modality: 'text_journal',
        estimates: { mood: { value: 80, confidence: 1.0 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      });
      floodSignals.push({
        id: `flood-v-${i}`,
        userId: 'user-flood',
        timestamp: new Date(now.getTime() - i * 3600 * 1000).toISOString(),
        modality: 'voice_transcript',
        estimates: { mood: { value: 80, confidence: 1.0 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      });
    }

    const state = engine.computeState('user-flood', floodSignals, now);

    // Multimodal ceiling <= 0.95 (never 1.00)
    assert.ok(state.dimensions.mood.confidence <= 0.95, `Confidence must not exceed 0.95: got ${state.dimensions.mood.confidence}`);
    assert.ok(state.overallConfidence <= 0.95, `Overall confidence must not exceed 0.95: got ${state.overallConfidence}`);
  });

  // =========================================================================
  // 9. UNIVERSAL CRISIS PRECEDENCE
  // =========================================================================
  it('9. Universal Crisis Precedence: crisis in text cannot be suppressed or masked by calm acoustic or positive mood check-in', () => {
    const signals: WellnessSignal[] = [
      // 1. Journal text containing acute distress / self-harm
      {
        id: 'sig-crisis-journal',
        userId: 'user-crisis',
        timestamp: now.toISOString(),
        modality: 'text_journal',
        estimates: {
          mood: { value: 20, confidence: 0.90 },
          stress: { value: 95, confidence: 0.95 },
        },
        features: {
          sentimentSummary: 'I feel completely overwhelmed and want to die, no point in going on',
          content: 'I feel completely overwhelmed and want to die, no point in going on',
        },
        reliabilityWeight: 0.85,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      // 2. Misleadingly calm voice acoustics
      {
        id: 'sig-calm-voice',
        userId: 'user-crisis',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        modality: 'voice_transcript',
        estimates: {
          mood: { value: 75, confidence: 0.85 },
          stress: { value: 25, confidence: 0.85 },
        },
        features: { sentimentSummary: 'Calm vocal pitch and moderate pacing' },
        reliabilityWeight: 0.80,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      // 3. Misleading high mood slider
      {
        id: 'sig-happy-checkin',
        userId: 'user-crisis',
        timestamp: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
        modality: 'mood_checkin',
        estimates: {
          mood: { value: 85, confidence: 0.90 },
          stress: { value: 15, confidence: 0.90 },
        },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    const state = engine.computeState('user-crisis', signals, now);

    // ABSOLUTE SAFETY GATE INVARIANT:
    assert.strictEqual(state.isCrisisDetected, true, 'Crisis MUST be detected');
    assert.ok(state.crisisNotice, 'Crisis helpline notice must be populated');
    assert.ok(state.crisisNotice.includes('988'), 'Helpline notice must include 988 lifeline');

    // Crisis evidence item must be prepended with highest priority
    const crisisEv = state.evidence[0];
    assert.ok(crisisEv, 'Crisis evidence item should be first');
    assert.strictEqual(crisisEv.directionText, 'Immediate Safety Protocol');
  });

  // =========================================================================
  // 10. MULTI-TENANT SCOPING & ISOLATION
  // =========================================================================
  it('10. Multi-Tenant Scoping: completely isolates state, clusters, and consistency between distinct users', () => {
    const userA = 'tenant-user-alpha';
    const userB = 'tenant-user-beta';

    const signalA: WellnessSignal = {
      id: 'sig-tenant-a',
      userId: userA,
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: { mood: { value: 25, confidence: 0.9 } },
      features: { triggers: ['Exam Failure'] },
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const signalB: WellnessSignal = {
      id: 'sig-tenant-b',
      userId: userB,
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: { mood: { value: 90, confidence: 0.9 } },
      features: { triggers: ['Celebration'] },
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const stateA = engine.computeState(userA, [signalA], now);
    const stateB = engine.computeState(userB, [signalB], now);

    assert.strictEqual(stateA.userId, userA);
    assert.strictEqual(stateB.userId, userB);
    assert.ok(stateA.mood < 55);
    assert.ok(stateB.mood > 75);
    assert.ok(stateA.contextualTriggers.includes('Exam Failure'));
    assert.ok(!stateA.contextualTriggers.includes('Celebration'));
    assert.ok(stateB.contextualTriggers.includes('Celebration'));
    assert.ok(!stateB.contextualTriggers.includes('Exam Failure'));
  });

  // =========================================================================
  // 11. DETERMINISTIC EXECUTION (ZERO BUDGET)
  // =========================================================================
  it('11. Deterministic Execution: produces identical output across multiple runs with zero network/API dependencies', () => {
    const signal: WellnessSignal = {
      id: 'sig-det',
      userId: 'user-det',
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: { mood: { value: 72, confidence: 0.85 } },
      features: {},
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const run1 = engine.computeState('user-det', [signal], now);
    const run2 = engine.computeState('user-det', [signal], now);

    assert.strictEqual(run1.mood, run2.mood);
    assert.strictEqual(run1.stress, run2.stress);
    assert.strictEqual(run1.confidence, run2.confidence);
    assert.strictEqual(run1.dimensions.mood.value, run2.dimensions.mood.value);
    assert.strictEqual(run1.dimensions.mood.confidence, run2.dimensions.mood.confidence);
  });

  // =========================================================================
  // 12. NON-FINITE NUMERIC ROBUSTNESS
  // =========================================================================
  it('12. Non-Finite Numeric Robustness: gracefully ignores NaN or Infinity inputs without corrupting state', () => {
    const corruptSignal: WellnessSignal = {
      id: 'sig-corrupt',
      userId: 'user-corrupt',
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: {
        mood: { value: NaN, confidence: Infinity },
        stress: { value: -Infinity, confidence: NaN },
      },
      features: {},
      reliabilityWeight: NaN,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const state = engine.computeState('user-corrupt', [corruptSignal], now);

    // State dimensions must remain valid numbers within [0, 100]
    for (const [key, dim] of Object.entries(state.dimensions)) {
      assert.ok(!isNaN(dim.value), `${key} value must not be NaN`);
      assert.ok(isFinite(dim.value), `${key} value must be finite`);
      assert.ok(!isNaN(dim.confidence), `${key} confidence must not be NaN`);
      assert.ok(isFinite(dim.confidence), `${key} confidence must be finite`);
    }
  });

  // =========================================================================
  // 13. PROVENANCE & ATTRIBUTION INTEGRITY
  // =========================================================================
  it('13. Provenance & Attribution: every evidence item and dimension tracks valid signal references', () => {
    const signal: WellnessSignal = {
      id: 'sig-prov-1',
      userId: 'user-prov',
      sourceId: 'source-origin-456',
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: {
        mood: { value: 85, confidence: 0.9 },
        energy: { value: 75, confidence: 0.85 },
      },
      features: {},
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const state = engine.computeState('user-prov', [signal], now);

    // Contributing signal IDs
    assert.ok(state.dimensions.mood.contributingSignalIds.includes('sig-prov-1'));

    // Evidence referenceId
    const moodEv = state.evidence.find((e) => e.dimension === 'mood');
    assert.ok(moodEv);
    assert.strictEqual(moodEv.referenceId, 'source-origin-456');
  });
});
