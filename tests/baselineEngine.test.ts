import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BaselineEngine, BASELINE_CONFIG } from '../src/server/engine/baselineEngine';
import { PersonalState } from '../src/server/engine/types';

describe('BaselineEngine - Individualized Historical Calibration', () => {
  const engine = new BaselineEngine();

  const createDummyState = (id: string, overrides: Partial<PersonalState> = {}): PersonalState => {
    return {
      id,
      userId: 'test-user',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      mood: 70,
      stress: 30,
      fatigue: 35,
      energy: 65,
      focus: 70,
      cognitiveLoad: 35,
      confidence: 0.8,
      overallConfidence: 0.8,
      dimensions: {
        mood: { value: 70, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        stress: { value: 30, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        fatigue: { value: 35, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        energy: { value: 65, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        focus: { value: 70, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        cognitiveLoad: { value: 35, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
      },
      evidence: [],
      sourceSummary: {},
      somaticMarkers: [],
      contextualTriggers: [],
      activeSignalsCount: 1,
      decayHalfLifeHours: 12.0,
      ...overrides,
    };
  };

  it('handles zero historical observations cleanly with 0 confidence and isPreliminary flag', () => {
    const baseline = engine.calculateBaseline('empty-user', []);

    assert.strictEqual(baseline.userId, 'empty-user');
    assert.strictEqual(baseline.observationCount, 0);
    assert.strictEqual(baseline.overallConfidence, 0.0);
    assert.strictEqual(baseline.isPreliminary, true);
    assert.strictEqual(baseline.dimensions.mood.mean, 70);
    assert.strictEqual(baseline.dimensions.stress.mean, 30);
    assert.strictEqual(baseline.dimensions.energy.mean, 65);
    assert.strictEqual(baseline.dimensions.cognitiveLoad.mean, 35);
  });

  it('flags insufficient history (< 5 observations) as preliminary with reduced confidence', () => {
    const states = [
      createDummyState('s1', { mood: 75, stress: 25 }),
      createDummyState('s2', { mood: 80, stress: 20 }),
      createDummyState('s3', { mood: 70, stress: 30 }),
    ];

    const baseline = engine.calculateBaseline('user-short', states);

    assert.strictEqual(baseline.observationCount, 3);
    assert.strictEqual(baseline.isPreliminary, true);
    // 3 observations < MIN_OBSERVATIONS_FOR_BASELINE (5)
    // rawConf = 3 / 14 = 0.21 -> preliminary penalized to ~0.11
    assert.ok(baseline.overallConfidence < 0.25);
    assert.strictEqual(baseline.dimensions.mood.mean, 75);
    assert.strictEqual(baseline.dimensions.stress.mean, 25);
  });

  it('calculates mean, median, and standard deviation accurately for mature history', () => {
    // 14 observations
    const moodScores = [60, 65, 70, 70, 72, 75, 75, 75, 78, 80, 82, 85, 88, 90];
    const states = moodScores.map((score, idx) =>
      createDummyState(`state-${idx}`, { mood: score })
    );

    const baseline = engine.calculateBaseline('user-mature', states);

    assert.strictEqual(baseline.observationCount, 14);
    assert.strictEqual(baseline.isPreliminary, false);
    assert.strictEqual(baseline.overallConfidence, 1.0);

    // Sum of 14 scores = 1065, mean = 1065 / 14 = 76.07 -> 76.1
    assert.strictEqual(baseline.dimensions.mood.mean, 76.1);

    // Median of [..., 75, 75, ...]: 75
    assert.strictEqual(baseline.dimensions.mood.median, 75);

    // Standard deviation should be positive
    assert.ok(baseline.dimensions.mood.stdDev > 5);
  });

  it('derives accurate deviations and z-scores against personal baseline', () => {
    const dim = {
      mean: 70,
      median: 70,
      stdDev: 10,
      observationCount: 20,
      confidence: 1.0,
      isPreliminary: false,
      lastUpdated: new Date().toISOString(),
    };

    // Score of 72: normal
    const devNormal = engine.calculateDeviation(72, dim);
    assert.strictEqual(devNormal.delta, 2);
    assert.strictEqual(devNormal.zScore, 0.2);
    assert.strictEqual(devNormal.significance, 'normal');

    // Score of 85: notable (delta 15 >= 12, zScore 1.5 >= 1.0)
    const devNotable = engine.calculateDeviation(85, dim);
    assert.strictEqual(devNotable.delta, 15);
    assert.strictEqual(devNotable.zScore, 1.5);
    assert.strictEqual(devNotable.significance, 'notable');

    // Score of 95: significant (delta 25 >= 25, zScore 2.5 >= 2.0)
    const devSignificant = engine.calculateDeviation(95, dim);
    assert.strictEqual(devSignificant.delta, 25);
    assert.strictEqual(devSignificant.zScore, 2.5);
    assert.strictEqual(devSignificant.significance, 'significant');
  });

  it('converts personal baseline to numeric neutral baseline vector', () => {
    const baseline = engine.calculateBaseline('u1', [
      createDummyState('s1', { mood: 80, stress: 20, fatigue: 30, energy: 75, focus: 85, cognitiveLoad: 25 }),
    ]);

    const neutral = engine.toNeutralBaseline(baseline);
    assert.strictEqual(neutral.mood, 80);
    assert.strictEqual(neutral.stress, 20);
    assert.strictEqual(neutral.fatigue, 30);
    assert.strictEqual(neutral.energy, 75);
    assert.strictEqual(neutral.focus, 85);
    assert.strictEqual(neutral.cognitiveLoad, 25);
  });
});
