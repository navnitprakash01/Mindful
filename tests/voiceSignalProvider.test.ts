import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VoiceSignalProvider,
  computeAcousticBaseline,
  VoiceObservationInput,
  AcousticBaseline,
} from '../src/server/engine/voiceSignalProvider';
import { WellnessSignal } from '../src/server/engine/types';
import { isValidUuid } from '../src/server/engine/providers';

describe('Voice Signal Provider & Acoustic Baseline Tests', () => {
  const testUserId = '00000000-0000-4000-8000-000000000001';
  const provider = new VoiceSignalProvider();

  it('computes acoustic baseline from past voice signals requiring >= 3 observations', () => {
    // 0 signals
    const emptyBaseline = computeAcousticBaseline(testUserId, []);
    assert.strictEqual(emptyBaseline, null, 'Baseline should be null with 0 historical observations');

    // 2 signals -> preliminary
    const twoSignals: WellnessSignal[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        userId: testUserId,
        timestamp: '2026-09-10T10:00:00.000Z',
        modality: 'voice_transcript',
        features: { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.80 } as any,
        estimates: {},
        reliabilityWeight: 0.80,
        expiresAt: '2026-09-11T10:00:00.000Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        userId: testUserId,
        timestamp: '2026-09-11T10:00:00.000Z',
        modality: 'voice_transcript',
        features: { speechRateWpm: 140, pauseRatio: 0.30, vocalEnergy: 0.60, quality: 0.80 } as any,
        estimates: {},
        reliabilityWeight: 0.80,
        expiresAt: '2026-09-12T10:00:00.000Z',
      },
    ];

    const prelimBaseline = computeAcousticBaseline(testUserId, twoSignals);
    assert.ok(prelimBaseline, 'Should produce baseline with 2 observations');
    assert.strictEqual(prelimBaseline.isPreliminary, true, 'isPreliminary must be true for < 3 observations');
    assert.strictEqual(prelimBaseline.observationCount, 2);
    assert.strictEqual(prelimBaseline.avgSpeechRateWpm, 130);
    assert.strictEqual(prelimBaseline.avgPauseRatio, 0.25);
    assert.strictEqual(prelimBaseline.avgVocalEnergy, 0.55);

    // 3 signals -> non-preliminary
    const threeSignals: WellnessSignal[] = [
      ...twoSignals,
      {
        id: '33333333-3333-4333-8333-333333333333',
        userId: testUserId,
        timestamp: '2026-09-12T10:00:00.000Z',
        modality: 'voice_transcript',
        features: { speechRateWpm: 160, pauseRatio: 0.25, vocalEnergy: 0.55, quality: 0.80 } as any,
        estimates: {},
        reliabilityWeight: 0.80,
        expiresAt: '2026-09-13T10:00:00.000Z',
      },
    ];

    const matureBaseline = computeAcousticBaseline(testUserId, threeSignals);
    assert.ok(matureBaseline);
    assert.strictEqual(matureBaseline.isPreliminary, false, 'isPreliminary must be false for >= 3 observations');
    assert.strictEqual(matureBaseline.observationCount, 3);
    assert.strictEqual(matureBaseline.avgSpeechRateWpm, 140);
  });

  it('detects lower speaking rate deviation relative to mature personal baseline', () => {
    const matureBaseline: AcousticBaseline = {
      userId: testUserId,
      avgSpeechRateWpm: 150,
      avgPauseRatio: 0.20,
      avgVocalEnergy: 0.55,
      observationCount: 5,
      isPreliminary: false,
      lastUpdated: new Date().toISOString(),
    };

    // User is speaking at 115 WPM (-35 WPM delta, below -20 threshold)
    const observation: VoiceObservationInput = {
      userId: testUserId,
      metrics: {
        audioDurationSeconds: 15,
        speechDurationSeconds: 9,
        pauseCount: 6,
        pauseRatio: 0.40,
        speechRateWpm: 115,
        vocalEnergy: 0.40,
        quality: 0.85,
        confidence: 0.80,
      },
      acousticBaseline: matureBaseline,
    };

    const signals = provider.extractSignals(observation);
    assert.strictEqual(signals.length, 1);
    const signal = signals[0];

    assert.ok(isValidUuid(signal.id));
    assert.strictEqual(signal.modality, 'voice_transcript');
    assert.strictEqual(signal.reliabilityWeight, 0.80);
    assert.strictEqual((signal.features as any).speechRateWpm, 115);

    // Assert fatigue elevated & energy reduced
    assert.ok((signal.estimates.fatigue?.value ?? 0) >= 50, 'Fatigue estimate should increase');
    assert.ok((signal.estimates.energy?.value ?? 100) <= 50, 'Energy estimate should decrease');

    const summary = signal.features.sentimentSummary;
    assert.strictEqual(summary, 'Speaking rate is lower than your recent baseline');
  });

  it('detects elevated tempo and high energy deviation relative to personal baseline', () => {
    const matureBaseline: AcousticBaseline = {
      userId: testUserId,
      avgSpeechRateWpm: 130,
      avgPauseRatio: 0.25,
      avgVocalEnergy: 0.50,
      observationCount: 6,
      isPreliminary: false,
      lastUpdated: new Date().toISOString(),
    };

    // User speaking at 165 WPM (+35 WPM delta, >= 25 threshold) with vocal energy 0.70 (>= 0.60)
    const observation: VoiceObservationInput = {
      userId: testUserId,
      metrics: {
        audioDurationSeconds: 12,
        speechDurationSeconds: 10.5,
        pauseCount: 2,
        pauseRatio: 0.12,
        speechRateWpm: 165,
        vocalEnergy: 0.70,
        quality: 0.90,
        confidence: 0.85,
      },
      acousticBaseline: matureBaseline,
    };

    const [signal] = provider.extractSignals(observation);
    assert.ok((signal.estimates.stress?.value ?? 0) >= 50, 'Stress estimate should increase');
    assert.strictEqual(
      signal.features.sentimentSummary,
      'Speech tempo and vocal energy are elevated above your baseline'
    );
  });

  it('falls back to mild bounds gracefully when baseline is preliminary or absent', () => {
    const observation: VoiceObservationInput = {
      userId: testUserId,
      metrics: {
        audioDurationSeconds: 8,
        pauseCount: 2,
        pauseRatio: 0.22,
        speechRateWpm: 130,
        vocalEnergy: 0.50,
      },
      acousticBaseline: null,
    };

    const [signal] = provider.extractSignals(observation);
    assert.strictEqual(signal.features.sentimentSummary, 'Vocal rhythm calibrating with initial baseline');
    assert.ok((signal.estimates.stress?.confidence ?? 0) <= 0.70, 'Confidence is conservative without baseline');
  });

  it('incorporates transcript sentiment descriptors into signal estimates', () => {
    const observation: VoiceObservationInput = {
      userId: testUserId,
      metrics: {
        audioDurationSeconds: 10,
        pauseCount: 3,
        pauseRatio: 0.25,
        speechRateWpm: 135,
        vocalEnergy: 0.50,
      },
      transcript: 'I am feeling overwhelmed with deadlines and panic',
    };

    const [signal] = provider.extractSignals(observation);
    assert.ok((signal.estimates.stress?.value ?? 0) >= 45, 'Stress estimate adjusted by transcript keyword');
    assert.ok((signal.estimates.mood?.value ?? 100) <= 60, 'Mood adjusted downward by transcript keyword');
  });

  it('strictly enforces non-causal, non-diagnostic phrasing', () => {
    const observations: VoiceObservationInput[] = [
      {
        userId: testUserId,
        metrics: { audioDurationSeconds: 5, pauseCount: 1, pauseRatio: 0.2, speechRateWpm: 80 },
      },
      {
        userId: testUserId,
        metrics: { audioDurationSeconds: 5, pauseCount: 1, pauseRatio: 0.2, speechRateWpm: 190, vocalEnergy: 0.8 },
      },
      {
        userId: testUserId,
        metrics: { audioDurationSeconds: 5, pauseCount: 1, pauseRatio: 0.2, speechRateWpm: 130 },
      },
    ];

    const bannedClinicalRegex = /depressed|depression|diagnos|disorder|pathology|cure|prescribe|illness|anxiety\s+disorder/i;

    for (const obs of observations) {
      const [signal] = provider.extractSignals(obs);
      const summary = signal.features.sentimentSummary;
      assert.ok(
        !bannedClinicalRegex.test(summary),
        `Summary "${summary}" must not contain banned clinical/diagnostic words`
      );
    }
  });

  it('keeps confidence bounded between 0.20 and 0.85', () => {
    // Extreme high inputs
    const highObs: VoiceObservationInput = {
      userId: testUserId,
      metrics: {
        audioDurationSeconds: 60,
        pauseCount: 10,
        pauseRatio: 0.2,
        quality: 1.0,
        confidence: 1.0,
      },
      transcript: 'A sufficiently long transcript exceeding twenty characters for bonus confidence.',
      acousticBaseline: {
        userId: testUserId,
        avgSpeechRateWpm: 130,
        avgPauseRatio: 0.2,
        avgVocalEnergy: 0.5,
        observationCount: 10,
        isPreliminary: false,
        lastUpdated: new Date().toISOString(),
      },
    };

    const [highSignal] = provider.extractSignals(highObs);
    const stressConf = highSignal.estimates.stress?.confidence ?? 0;
    assert.ok(stressConf <= 0.85, `Confidence ${stressConf} must not exceed 0.85`);

    // Extreme low inputs
    const lowObs: VoiceObservationInput = {
      userId: testUserId,
      metrics: {
        audioDurationSeconds: 2,
        pauseCount: 0,
        pauseRatio: 0,
        quality: 0.05,
        confidence: 0.05,
      },
    };

    const [lowSignal] = provider.extractSignals(lowObs);
    const lowStressConf = lowSignal.estimates.stress?.confidence ?? 0;
    assert.ok(lowStressConf >= 0.20, `Confidence ${lowStressConf} must not fall below 0.20`);
  });

  // ============================================================
  // MUST-FIX #1 REGRESSION TESTS: BASELINE CONTAMINATION FILTERING
  // ============================================================

  const createSignal = (id: string, features: Record<string, any>): WellnessSignal => ({
    id,
    userId: testUserId,
    timestamp: new Date().toISOString(),
    modality: 'voice_transcript',
    features: features as any,
    estimates: {},
    reliabilityWeight: 0.80,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
  });

  it('1. Three valid observations → mature baseline', () => {
    const signals: WellnessSignal[] = [
      createSignal('11111111-1111-4111-8111-000000000001', { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.85 }),
      createSignal('11111111-1111-4111-8111-000000000002', { speechRateWpm: 130, pauseRatio: 0.25, vocalEnergy: 0.55, quality: 0.80 }),
      createSignal('11111111-1111-4111-8111-000000000003', { speechRateWpm: 140, pauseRatio: 0.30, vocalEnergy: 0.60, quality: 0.90 }),
    ];

    const baseline = computeAcousticBaseline(testUserId, signals);
    assert.ok(baseline);
    assert.strictEqual(baseline.observationCount, 3);
    assert.strictEqual(baseline.isPreliminary, false, '3 valid observations must produce mature baseline');
    assert.strictEqual(baseline.avgSpeechRateWpm, 130);
  });

  it('2. Two valid + one low-quality observation (quality < 0.40) → baseline remains preliminary', () => {
    const signals: WellnessSignal[] = [
      createSignal('22222222-2222-4222-8222-000000000001', { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.80 }),
      createSignal('22222222-2222-4222-8222-000000000002', { speechRateWpm: 130, pauseRatio: 0.25, vocalEnergy: 0.55, quality: 0.85 }),
      // Low quality: 0.25 (< 0.40)
      createSignal('22222222-2222-4222-8222-000000000003', { speechRateWpm: 200, pauseRatio: 0.10, vocalEnergy: 0.90, quality: 0.25 }),
    ];

    const baseline = computeAcousticBaseline(testUserId, signals);
    assert.ok(baseline);
    assert.strictEqual(baseline.observationCount, 2, 'Low-quality observation must be excluded');
    assert.strictEqual(baseline.isPreliminary, true, 'Baseline must remain preliminary with only 2 valid observations');
    assert.strictEqual(baseline.avgSpeechRateWpm, 125, 'Excluded observation must not affect average WPM');
  });

  it('3. Two valid + one silence-only observation (pauseRatio >= 0.95 without words) → baseline remains preliminary', () => {
    const signals: WellnessSignal[] = [
      createSignal('33333333-3333-4333-8333-000000000001', { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.80 }),
      createSignal('33333333-3333-4333-8333-000000000002', { speechRateWpm: 140, pauseRatio: 0.24, vocalEnergy: 0.54, quality: 0.80 }),
      // Silence-only: pauseRatio 0.98, rawTokensCount 0, quality 0.50
      createSignal('33333333-3333-4333-8333-000000000003', { pauseRatio: 0.98, rawTokensCount: 0, vocalEnergy: 0.05, quality: 0.50 }),
    ];

    const baseline = computeAcousticBaseline(testUserId, signals);
    assert.ok(baseline);
    assert.strictEqual(baseline.observationCount, 2, 'Silence-only observation must be excluded');
    assert.strictEqual(baseline.isPreliminary, true, 'Baseline must remain preliminary with 2 valid observations');
    assert.strictEqual(baseline.avgPauseRatio, 0.22, 'Silence pause ratio must not contaminate average pause ratio');
  });

  it('4. Five observations with two contaminated → only three valid observations contribute', () => {
    const signals: WellnessSignal[] = [
      createSignal('44444444-4444-4444-8444-000000000001', { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.80 }),
      createSignal('44444444-4444-4444-8444-000000000002', { speechRateWpm: 130, pauseRatio: 0.25, vocalEnergy: 0.55, quality: 0.85 }),
      createSignal('44444444-4444-4444-8444-000000000003', { speechRateWpm: 140, pauseRatio: 0.30, vocalEnergy: 0.60, quality: 0.90 }),
      // Contaminated 1: Low quality
      createSignal('44444444-4444-4444-8444-000000000004', { speechRateWpm: 300, pauseRatio: 0.05, vocalEnergy: 0.95, quality: 0.20 }),
      // Contaminated 2: Silence-only
      createSignal('44444444-4444-4444-8444-000000000005', { pauseRatio: 1.0, rawTokensCount: 0, vocalEnergy: 0.01, quality: 0.60 }),
    ];

    const baseline = computeAcousticBaseline(testUserId, signals);
    assert.ok(baseline);
    assert.strictEqual(baseline.observationCount, 3, 'Exactly 3 valid observations must contribute');
    assert.strictEqual(baseline.isPreliminary, false, '3 valid observations make baseline mature');
    assert.strictEqual(baseline.avgSpeechRateWpm, 130, 'Averaged only across the 3 valid signals');
    assert.strictEqual(baseline.avgPauseRatio, 0.25);
    assert.strictEqual(baseline.avgVocalEnergy, 0.55);
  });

  it('5. Missing quality → verify the observation does not incorrectly receive a high-quality classification', () => {
    const signals: WellnessSignal[] = [
      createSignal('55555555-5555-4555-8555-000000000001', { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.80 }),
      createSignal('55555555-5555-4555-8555-000000000002', { speechRateWpm: 130, pauseRatio: 0.25, vocalEnergy: 0.55, quality: 0.85 }),
      // Missing quality: undefined
      createSignal('55555555-5555-4555-8555-000000000003', { speechRateWpm: 140, pauseRatio: 0.30, vocalEnergy: 0.60 }),
    ];

    const baseline = computeAcousticBaseline(testUserId, signals);
    assert.ok(baseline);
    assert.strictEqual(baseline.observationCount, 2, 'Observation with missing quality must be excluded from baseline');
    assert.strictEqual(baseline.isPreliminary, true, 'Baseline must remain preliminary without 3 verified-quality observations');
  });

  it('6. NaN feature → observation cannot contaminate baseline', () => {
    const signals: WellnessSignal[] = [
      createSignal('66666666-6666-4666-8666-000000000001', { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.80 }),
      createSignal('66666666-6666-4666-8666-000000000002', { speechRateWpm: 140, pauseRatio: 0.24, vocalEnergy: 0.54, quality: 0.80 }),
      // Contaminated: NaN vocalEnergy
      createSignal('66666666-6666-4666-8666-000000000003', { speechRateWpm: 130, pauseRatio: 0.22, vocalEnergy: NaN, quality: 0.80 }),
    ];

    const baseline = computeAcousticBaseline(testUserId, signals);
    assert.ok(baseline);
    assert.strictEqual(baseline.observationCount, 2, 'Observation with NaN feature must be excluded');
    assert.ok(!Number.isNaN(baseline.avgVocalEnergy), 'Baseline vocal energy must not be NaN');
    assert.strictEqual(baseline.avgVocalEnergy, 0.52);
  });

  it('7. Infinity feature → observation cannot contaminate baseline', () => {
    const signals: WellnessSignal[] = [
      createSignal('77777777-7777-4777-8777-000000000001', { speechRateWpm: 120, pauseRatio: 0.20, vocalEnergy: 0.50, quality: 0.80 }),
      createSignal('77777777-7777-4777-8777-000000000002', { speechRateWpm: 140, pauseRatio: 0.24, vocalEnergy: 0.54, quality: 0.80 }),
      // Contaminated: Infinity pauseRatio
      createSignal('77777777-7777-4777-8777-000000000003', { speechRateWpm: 130, pauseRatio: Infinity, vocalEnergy: 0.50, quality: 0.80 }),
    ];

    const baseline = computeAcousticBaseline(testUserId, signals);
    assert.ok(baseline);
    assert.strictEqual(baseline.observationCount, 2, 'Observation with Infinity feature must be excluded');
    assert.ok(Number.isFinite(baseline.avgPauseRatio), 'Baseline pause ratio must be finite');
    assert.strictEqual(baseline.avgPauseRatio, 0.22);
  });
});
