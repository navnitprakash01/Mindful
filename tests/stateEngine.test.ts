import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StateEngine, STATE_ENGINE_CONFIG } from '../src/server/engine/stateEngine';
import { SignalExtractor } from '../src/server/engine/signalExtractor';
import { WellnessSignal, PersonalBaseline } from '../src/server/engine/types';

describe('StateEngine - Mathematical Decay & Fusion (6 Dimensions)', () => {
  const engine = new StateEngine();

  it('computes exponential time-decay weights accurately across half-lives', () => {
    const now = new Date('2026-09-11T12:00:00Z');
    
    // Signal at t=0
    const signalT0: WellnessSignal = {
      id: 'sig-0',
      userId: 'u1',
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: { mood: { value: 80, confidence: 0.9 } },
      features: {},
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };
    
    const weight0 = engine.computeDecayWeight(signalT0, now);
    assert.strictEqual(Math.round(weight0 * 100) / 100, 1.0);

    // Signal at t = 12h (1 half-life)
    const timeT12 = new Date(now.getTime() - 12 * 3600 * 1000);
    const signalT12 = { ...signalT0, timestamp: timeT12.toISOString() };
    const weight12 = engine.computeDecayWeight(signalT12, now);
    assert.strictEqual(Math.round(weight12 * 100) / 100, 0.5);

    // Signal at t = 24h (2 half-lives)
    const timeT24 = new Date(now.getTime() - 24 * 3600 * 1000);
    const signalT24 = { ...signalT0, timestamp: timeT24.toISOString() };
    const weight24 = engine.computeDecayWeight(signalT24, now);
    assert.strictEqual(Math.round(weight24 * 100) / 100, 0.25);

    // Signal beyond max age (48h)
    const timeT49 = new Date(now.getTime() - 49 * 3600 * 1000);
    const signalT49 = { ...signalT0, timestamp: timeT49.toISOString() };
    const weight49 = engine.computeDecayWeight(signalT49, now);
    assert.strictEqual(weight49, 0.0);

    // Future timestamp edge case (diffMs = 0 -> weight = 1.0)
    const futureTime = new Date(now.getTime() + 3600 * 1000);
    const signalFuture = { ...signalT0, timestamp: futureTime.toISOString() };
    const weightFuture = engine.computeDecayWeight(signalFuture, now);
    assert.strictEqual(Math.round(weightFuture * 100) / 100, 1.0);
  });

  it('returns baseline values with 0 confidence across all 6 dimensions when no signals exist', () => {
    const now = new Date('2026-09-11T12:00:00Z');
    const state = engine.computeState('test-user', [], now);

    assert.strictEqual(state.userId, 'test-user');
    assert.strictEqual(state.activeSignalsCount, 0);
    assert.strictEqual(state.overallConfidence, 0);
    assert.strictEqual(state.confidence, 0);

    // Verify all 6 dimensions exist and equal default baseline
    assert.strictEqual(state.dimensions.mood.value, STATE_ENGINE_CONFIG.DEFAULT_BASELINE.mood);
    assert.strictEqual(state.dimensions.stress.value, STATE_ENGINE_CONFIG.DEFAULT_BASELINE.stress);
    assert.strictEqual(state.dimensions.fatigue.value, STATE_ENGINE_CONFIG.DEFAULT_BASELINE.fatigue);
    assert.strictEqual(state.dimensions.energy.value, STATE_ENGINE_CONFIG.DEFAULT_BASELINE.energy);
    assert.strictEqual(state.dimensions.focus.value, STATE_ENGINE_CONFIG.DEFAULT_BASELINE.focus);
    assert.strictEqual(state.dimensions.cognitiveLoad.value, STATE_ENGINE_CONFIG.DEFAULT_BASELINE.cognitiveLoad);

    // Flat accessors
    assert.strictEqual(state.mood, state.dimensions.mood.value);
    assert.strictEqual(state.stress, state.dimensions.stress.value);
    assert.strictEqual(state.fatigue, state.dimensions.fatigue.value);
    assert.strictEqual(state.energy, state.dimensions.energy.value);
    assert.strictEqual(state.focus, state.dimensions.focus.value);
    assert.strictEqual(state.cognitiveLoad, state.dimensions.cognitiveLoad.value);

    assert.strictEqual(state.dimensions.mood.trend, 'stable');
    assert.strictEqual(state.evidence.length, 0);
  });

  it('clamps dimension values strictly to [0, 100] and confidence to [0.0, 1.0]', () => {
    const now = new Date('2026-09-11T12:00:00Z');
    const outOfBoundsSignal: WellnessSignal = {
      id: 'sig-oob',
      userId: 'u1',
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: {
        mood: { value: 150, confidence: 1.5 }, // Exceeds upper bound
        stress: { value: -30, confidence: -0.2 }, // Below lower bound
      },
      features: {},
      reliabilityWeight: 2.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const state = engine.computeState('u1', [outOfBoundsSignal], now);

    assert.ok(state.dimensions.mood.value <= 100, 'Mood value must be <= 100');
    assert.ok(state.dimensions.mood.value >= 0, 'Mood value must be >= 0');
    assert.ok(state.dimensions.stress.value <= 100, 'Stress value must be <= 100');
    assert.ok(state.dimensions.stress.value >= 0, 'Stress value must be >= 0');
    assert.ok(state.overallConfidence <= 1.0, 'Confidence must be <= 1.0');
    assert.ok(state.overallConfidence >= 0.0, 'Confidence must be >= 0.0');
  });

  it('generates structured evidence items with observation, contribution, and direction', () => {
    const now = new Date('2026-09-11T12:00:00Z');
    const signal: WellnessSignal = {
      id: 'sig-ev-test',
      userId: 'u1',
      timestamp: now.toISOString(),
      modality: 'mood_checkin',
      estimates: {
        mood: { value: 85, confidence: 0.95 },
        stress: { value: 65, confidence: 0.88 },
      },
      features: {
        energy: 8,
        triggers: ['Deadlines'],
        somaticSensations: ['Tightness in neck'],
      },
      reliabilityWeight: 1.0,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
    };

    const state = engine.computeState('u1', [signal], now);

    assert.ok(state.evidence.length >= 2);
    const moodEv = state.evidence.find((e) => e.dimension === 'mood');
    assert.ok(moodEv);
    assert.strictEqual(moodEv.source, 'mood_checkin');
    assert.ok(moodEv.observation.includes('Reported mood of 85'));
    assert.strictEqual(moodEv.contribution, 'elevating');
    assert.ok(moodEv.directionText?.includes('+'));
    assert.strictEqual(moodEv.referenceId, 'sig-ev-test');

    const stressEv = state.evidence.find((e) => e.dimension === 'stress');
    assert.ok(stressEv);
    assert.ok(stressEv.observation.includes('Deadlines'));
    assert.ok(stressEv.observation.includes('Tightness in neck'));
  });

  it('summarizes contributing sources accurately in sourceSummary', () => {
    const now = new Date('2026-09-11T12:00:00Z');
    const signals: WellnessSignal[] = [
      {
        id: 's1',
        userId: 'u1',
        timestamp: now.toISOString(),
        modality: 'mood_checkin',
        estimates: { mood: { value: 80, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 's2',
        userId: 'u1',
        timestamp: now.toISOString(),
        modality: 'text_journal',
        estimates: { mood: { value: 75, confidence: 0.8 } },
        features: {},
        reliabilityWeight: 0.85,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 's3',
        userId: 'u1',
        timestamp: now.toISOString(),
        modality: 'text_journal',
        estimates: { mood: { value: 78, confidence: 0.8 } },
        features: {},
        reliabilityWeight: 0.85,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    const state = engine.computeState('u1', signals, now);
    assert.strictEqual(state.sourceSummary['mood_checkin'], 1);
    assert.strictEqual(state.sourceSummary['text_journal'], 2);
    assert.strictEqual(state.activeSignalsCount, 3);
  });

  it('reverts toward personal baseline when custom baseline is supplied', () => {
    const now = new Date('2026-09-11T12:00:00Z');
    const customBaseline: PersonalBaseline = {
      userId: 'u1',
      observationCount: 15,
      overallConfidence: 1.0,
      isPreliminary: false,
      dimensions: {
        mood: { mean: 85, median: 85, stdDev: 5, observationCount: 15, confidence: 1.0, isPreliminary: false, lastUpdated: now.toISOString() },
        stress: { mean: 15, median: 15, stdDev: 4, observationCount: 15, confidence: 1.0, isPreliminary: false, lastUpdated: now.toISOString() },
        fatigue: { mean: 20, median: 20, stdDev: 4, observationCount: 15, confidence: 1.0, isPreliminary: false, lastUpdated: now.toISOString() },
        energy: { mean: 80, median: 80, stdDev: 5, observationCount: 15, confidence: 1.0, isPreliminary: false, lastUpdated: now.toISOString() },
        focus: { mean: 85, median: 85, stdDev: 5, observationCount: 15, confidence: 1.0, isPreliminary: false, lastUpdated: now.toISOString() },
        cognitiveLoad: { mean: 20, median: 20, stdDev: 4, observationCount: 15, confidence: 1.0, isPreliminary: false, lastUpdated: now.toISOString() },
      },
      lastUpdated: now.toISOString(),
    };

    // When no signals exist, state should match the user's specific baseline (mean 85, not default 70)
    const state = engine.computeState('u1', [], now, customBaseline);
    assert.strictEqual(state.dimensions.mood.value, 85);
    assert.strictEqual(state.dimensions.stress.value, 15);
    assert.strictEqual(state.dimensions.energy.value, 80);
  });

  it('applies conflict penalty to confidence when contradictory signals occur', () => {
    const now = new Date('2026-09-11T12:00:00Z');

    // Two harmonious signals: mood 85 and mood 90
    const harmoniousSignals: WellnessSignal[] = [
      {
        id: 'sig-h1',
        userId: 'u1',
        timestamp: now.toISOString(),
        modality: 'mood_checkin',
        estimates: { mood: { value: 85, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sig-h2',
        userId: 'u1',
        timestamp: now.toISOString(),
        modality: 'text_journal',
        estimates: { mood: { value: 90, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    // Two conflicting signals: mood 95 and mood 15
    const conflictingSignals: WellnessSignal[] = [
      {
        id: 'sig-c1',
        userId: 'u1',
        timestamp: now.toISOString(),
        modality: 'mood_checkin',
        estimates: { mood: { value: 95, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'sig-c2',
        userId: 'u1',
        timestamp: now.toISOString(),
        modality: 'text_journal',
        estimates: { mood: { value: 15, confidence: 0.9 } },
        features: {},
        reliabilityWeight: 1.0,
        expiresAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
      },
    ];

    const stateHarmonious = engine.computeState('u1', harmoniousSignals, now);
    const stateConflicting = engine.computeState('u1', conflictingSignals, now);

    assert.ok(
      stateHarmonious.dimensions.mood.confidence > stateConflicting.dimensions.mood.confidence,
      `Expected harmonious confidence (${stateHarmonious.dimensions.mood.confidence}) > conflicting confidence (${stateConflicting.dimensions.mood.confidence})`
    );
  });
});

describe('SignalExtractor & Providers - Multimodal Domain Transformation', () => {
  it('correctly extracts 6-dimensional signal from mood check-in with triggers & sensations', () => {
    const signal = SignalExtractor.fromMoodLog({
      userId: 'user-abc',
      energyLevel: 3,
      moodType: 'Anxiety',
      triggers: ['Deadlines'],
      physicalSensations: ['Tightness in neck'],
      notes: 'Feeling overwhelmed by launch prep',
    });

    assert.strictEqual(signal.userId, 'user-abc');
    assert.strictEqual(signal.modality, 'mood_checkin');
    assert.strictEqual(signal.reliabilityWeight, 1.0);
    assert.strictEqual(signal.estimates.mood?.value, 30);
    // Energy level 3 -> energy 30, fatigue 80
    assert.strictEqual(signal.estimates.energy?.value, 30);
    assert.strictEqual(signal.estimates.fatigue?.value, 80);
    // Anxiety base stress is 82 + Deadlines (+12) + Tightness in neck (+10) capped at 100
    assert.strictEqual(signal.estimates.stress?.value, 100);
    // Cognitive load should be elevated
    assert.ok((signal.estimates.cognitiveLoad?.value ?? 0) >= 75);
    assert.ok(signal.features.triggers?.includes('Deadlines'));
    assert.ok(signal.features.somaticSensations?.includes('Tightness in neck'));
  });

  it('correctly maps journal entry with AI sentiment analysis', () => {
    const signal = SignalExtractor.fromJournal({
      userId: 'user-abc',
      content: 'I had a very productive and grounded session today building our new architecture.',
      moodScore: 88,
      aiAnalysis: {
        dominantEmotion: 'calm',
        dominantScore: 0.9,
        emotions: [{ name: 'calm', score: 0.9 }, { name: 'focus', score: 0.85 }],
        themes: ['Productivity', 'Engineering'],
        summary: 'Productive and grounded architecture work',
        suggestedAction: 'Keep up the rhythm',
        reflectionPrompt: 'What enabled such deep focus today?',
      },
    });

    assert.strictEqual(signal.userId, 'user-abc');
    assert.strictEqual(signal.modality, 'text_journal');
    assert.strictEqual(signal.estimates.mood?.value, 88);
    assert.ok((signal.estimates.stress?.value ?? 100) < 40);
    assert.strictEqual(signal.reliabilityWeight, 0.85);
  });

  it('processes journal entries deterministically when AI is unconfigured or fails (zero-budget mode)', () => {
    // No aiAnalysis passed — pure local deterministic text analysis
    const signal = SignalExtractor.fromJournal({
      userId: 'user-abc',
      content: 'I feel exhausted, tired, and completely drained from the hectic deadline and pressure.',
    });

    assert.strictEqual(signal.userId, 'user-abc');
    assert.strictEqual(signal.modality, 'text_journal');
    // Lexicon detects exhaustion, fatigue, deadline, pressure:
    assert.ok((signal.estimates.fatigue?.value ?? 0) > 50, 'Fatigue should be elevated');
    assert.ok((signal.estimates.stress?.value ?? 0) > 40, 'Stress should be elevated');
    assert.ok((signal.estimates.energy?.value ?? 100) < 50, 'Energy should be reduced');
    // Reduced confidence because it was deterministic without AI
    assert.ok((signal.estimates.mood?.confidence ?? 1.0) < 0.70);
  });

  it('correctly tags voice transcripts when Voice tag is present in journal entry', () => {
    const signal = SignalExtractor.fromJournal({
      userId: 'user-abc',
      content: 'Speaking my thoughts aloud into the voice recorder while taking a peaceful walk.',
      tags: ['Reflection', 'Voice'],
    });

    assert.strictEqual(signal.modality, 'voice_transcript');
    assert.strictEqual(signal.reliabilityWeight, 0.80);
  });

  it('correctly maps companion interaction to conversational signal', () => {
    const signal = SignalExtractor.fromCompanionSession({
      userId: 'user-abc',
      mode: 'CBT Reframer',
      recentMessagesCount: 6,
      detectedSentiment: 'stressed',
      topics: ['Work', 'Exhaustion'],
    });

    assert.strictEqual(signal.userId, 'user-abc');
    assert.strictEqual(signal.modality, 'companion_session');
    assert.strictEqual(signal.reliabilityWeight, 0.70);
    assert.ok((signal.estimates.stress?.value ?? 0) >= 70);
  });
});
