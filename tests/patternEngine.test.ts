/**
 * Pattern Engine Unit Tests
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Tests pure pattern detection, thresholds, deterministic confidence, evidence structures,
 * and enforces strict non-causality linguistic guardrails.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPatternEngine } from '../src/server/engine/patternEngine/patternEngine';
import { PatternConfidence } from '../src/server/engine/patternEngine/confidence';
import { NormalizedObservation, DEFAULT_THRESHOLDS } from '../src/server/engine/patternEngine/types';

process.env.NODE_ENV = 'test';

describe('PatternEngine - Deterministic Pattern Detection & Evidence Validation', () => {
  const testUserId = 'test-user-patterns-001';

  it('returns empty array when observation count is below minimum threshold (< 3)', () => {
    // 0 observations
    const result0 = defaultPatternEngine.analyze(testUserId, []);
    assert.deepStrictEqual(result0, []);

    // 1 observation
    const result1 = defaultPatternEngine.analyze(testUserId, [
      {
        id: 'obs-1',
        timestamp: new Date().toISOString(),
        dateKey: '2026-09-12',
        hourOfDay: 14,
        dayOfWeek: 6,
        moodType: 'Calm',
        energyLevel: 7,
        dimensions: { energy: 70 },
        triggers: ['Nature'],
        physicalSensations: ['Deep breathing'],
        modality: 'mood_checkin',
      },
    ]);
    assert.deepStrictEqual(result1, []);

    // 2 observations
    const result2 = defaultPatternEngine.analyze(testUserId, [
      {
        id: 'obs-1',
        timestamp: new Date().toISOString(),
        dateKey: '2026-09-11',
        hourOfDay: 10,
        dayOfWeek: 5,
        moodType: 'Calm',
        energyLevel: 7,
        dimensions: { energy: 70 },
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: new Date().toISOString(),
        dateKey: '2026-09-12',
        hourOfDay: 11,
        dayOfWeek: 6,
        moodType: 'Joy',
        energyLevel: 8,
        dimensions: { energy: 80 },
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
    ]);
    assert.deepStrictEqual(result2, []);
  });

  it('detects dominant mood frequency when a mood appears in >= 40% of observations', () => {
    const observations: NormalizedObservation[] = [
      {
        id: 'obs-1',
        timestamp: '2026-09-08T10:00:00Z',
        dateKey: '2026-09-08',
        hourOfDay: 10,
        dayOfWeek: 2,
        moodType: 'Calm',
        energyLevel: 6,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: '2026-09-09T10:00:00Z',
        dateKey: '2026-09-09',
        hourOfDay: 10,
        dayOfWeek: 3,
        moodType: 'Calm',
        energyLevel: 7,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-3',
        timestamp: '2026-09-10T10:00:00Z',
        dateKey: '2026-09-10',
        hourOfDay: 10,
        dayOfWeek: 4,
        moodType: 'Focus',
        energyLevel: 8,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-4',
        timestamp: '2026-09-11T10:00:00Z',
        dateKey: '2026-09-11',
        hourOfDay: 10,
        dayOfWeek: 5,
        moodType: 'Calm',
        energyLevel: 6,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
    ];

    const patterns = defaultPatternEngine.analyze(testUserId, observations);
    const moodPattern = patterns.find((p) => p.type === 'mood_frequency');

    assert.ok(moodPattern, 'Should detect mood_frequency pattern');
    assert.strictEqual(moodPattern.patternKey, 'mood_frequency_calm');
    assert.ok(moodPattern.title.includes('Calm is your most frequent state'));
    assert.strictEqual(moodPattern.evidence.supportingCount, 3);
    assert.strictEqual(moodPattern.evidence.observationCount, 4);
    assert.ok(moodPattern.confidence >= 0.40 && moodPattern.confidence <= 0.95);
  });

  it('detects upward energy trajectory when second half averages significantly higher than first half', () => {
    const observations: NormalizedObservation[] = [
      {
        id: 'obs-1',
        timestamp: '2026-09-08T09:00:00Z',
        dateKey: '2026-09-08',
        hourOfDay: 9,
        dayOfWeek: 2,
        energyLevel: 4,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: '2026-09-09T09:00:00Z',
        dateKey: '2026-09-09',
        hourOfDay: 9,
        dayOfWeek: 3,
        energyLevel: 5,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-3',
        timestamp: '2026-09-10T09:00:00Z',
        dateKey: '2026-09-10',
        hourOfDay: 9,
        dayOfWeek: 4,
        energyLevel: 8,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-4',
        timestamp: '2026-09-11T09:00:00Z',
        dateKey: '2026-09-11',
        hourOfDay: 9,
        dayOfWeek: 5,
        energyLevel: 9,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
    ];

    const patterns = defaultPatternEngine.analyze(testUserId, observations);
    const trajectoryPattern = patterns.find((p) => p.patternKey === 'energy_trajectory_direction');

    assert.ok(trajectoryPattern, 'Should detect directional trajectory pattern');
    assert.ok(trajectoryPattern.title.includes('trending upward'));
    assert.ok((trajectoryPattern.evidence.supportingAvg ?? 0) > (trajectoryPattern.evidence.comparisonAvg ?? 0));
  });

  it('detects high energy variability when observation range >= 4', () => {
    const observations: NormalizedObservation[] = [
      {
        id: 'obs-1',
        timestamp: '2026-09-08T09:00:00Z',
        dateKey: '2026-09-08',
        hourOfDay: 9,
        dayOfWeek: 2,
        energyLevel: 3,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: '2026-09-09T09:00:00Z',
        dateKey: '2026-09-09',
        hourOfDay: 9,
        dayOfWeek: 3,
        energyLevel: 9,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-3',
        timestamp: '2026-09-10T09:00:00Z',
        dateKey: '2026-09-10',
        hourOfDay: 9,
        dayOfWeek: 4,
        energyLevel: 4,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-4',
        timestamp: '2026-09-11T09:00:00Z',
        dateKey: '2026-09-11',
        hourOfDay: 9,
        dayOfWeek: 5,
        energyLevel: 8,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
    ];

    const patterns = defaultPatternEngine.analyze(testUserId, observations);
    const variabilityPattern = patterns.find((p) => p.patternKey === 'energy_trajectory_variability');

    assert.ok(variabilityPattern, 'Should detect high energy variability');
    assert.ok(variabilityPattern.title.includes('High energy variability'));
  });

  it('detects trigger association when contextual tag coincides with significant energy shift', () => {
    const observations: NormalizedObservation[] = [
      // 3 check-ins with 'Deadlines' and low energy (3, 4, 3)
      {
        id: 'obs-1',
        timestamp: '2026-09-07T14:00:00Z',
        dateKey: '2026-09-07',
        hourOfDay: 14,
        dayOfWeek: 1,
        energyLevel: 3,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: '2026-09-08T14:00:00Z',
        dateKey: '2026-09-08',
        hourOfDay: 14,
        dayOfWeek: 2,
        energyLevel: 4,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Shallow breathing'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-3',
        timestamp: '2026-09-09T14:00:00Z',
        dateKey: '2026-09-09',
        hourOfDay: 14,
        dayOfWeek: 3,
        energyLevel: 3,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      // 2 check-ins without 'Deadlines' having high energy (8, 8)
      {
        id: 'obs-4',
        timestamp: '2026-09-10T14:00:00Z',
        dateKey: '2026-09-10',
        hourOfDay: 14,
        dayOfWeek: 4,
        energyLevel: 8,
        dimensions: {},
        triggers: ['Nature'],
        physicalSensations: ['Deep breathing'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-5',
        timestamp: '2026-09-11T14:00:00Z',
        dateKey: '2026-09-11',
        hourOfDay: 14,
        dayOfWeek: 5,
        energyLevel: 8,
        dimensions: {},
        triggers: ['Meditation'],
        physicalSensations: ['Relaxed shoulders'],
        modality: 'mood_checkin',
      },
    ];

    const patterns = defaultPatternEngine.analyze(testUserId, observations);
    const triggerPattern = patterns.find((p) => p.type === 'trigger_association');

    assert.ok(triggerPattern, 'Should detect trigger_association pattern');
    assert.strictEqual(triggerPattern.patternKey, 'trigger_deadlines');
    assert.ok(triggerPattern.title.includes("Lower energy associated with 'Deadlines'"));
    assert.strictEqual(triggerPattern.evidence.supportingCount, 3);
    assert.strictEqual(triggerPattern.evidence.comparisonCount, 2);
    assert.strictEqual(triggerPattern.evidence.supportingAvg, 3.3);
    assert.strictEqual(triggerPattern.evidence.comparisonAvg, 8.0);
  });

  it('detects temporal diurnal pattern when evening energy differs significantly from daytime', () => {
    const observations: NormalizedObservation[] = [
      // 3 evening check-ins with lower energy (4, 4, 3)
      {
        id: 'obs-1',
        timestamp: '2026-09-07T21:00:00Z',
        dateKey: '2026-09-07',
        hourOfDay: 21,
        dayOfWeek: 1,
        energyLevel: 4,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: '2026-09-08T22:00:00Z',
        dateKey: '2026-09-08',
        hourOfDay: 22,
        dayOfWeek: 2,
        energyLevel: 4,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-3',
        timestamp: '2026-09-09T20:00:00Z',
        dateKey: '2026-09-09',
        hourOfDay: 20,
        dayOfWeek: 3,
        energyLevel: 3,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      // 2 daytime check-ins with higher energy (7, 8)
      {
        id: 'obs-4',
        timestamp: '2026-09-10T10:00:00Z',
        dateKey: '2026-09-10',
        hourOfDay: 10,
        dayOfWeek: 4,
        energyLevel: 7,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-5',
        timestamp: '2026-09-11T12:00:00Z',
        dateKey: '2026-09-11',
        hourOfDay: 12,
        dayOfWeek: 5,
        energyLevel: 8,
        dimensions: {},
        triggers: [],
        physicalSensations: [],
        modality: 'mood_checkin',
      },
    ];

    const patterns = defaultPatternEngine.analyze(testUserId, observations);
    const temporalPattern = patterns.find((p) => p.type === 'temporal_rhythm');

    assert.ok(temporalPattern, 'Should detect temporal_rhythm pattern');
    assert.strictEqual(temporalPattern.patternKey, 'temporal_evening_energy');
    assert.ok(temporalPattern.title.includes('Lower energy observed in evening check-ins'));
  });

  it('detects contextual and somatic co-occurrence when physical sensations repeatedly coincide with triggers', () => {
    const observations: NormalizedObservation[] = [
      {
        id: 'obs-1',
        timestamp: '2026-09-07T10:00:00Z',
        dateKey: '2026-09-07',
        hourOfDay: 10,
        dayOfWeek: 1,
        energyLevel: 5,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: '2026-09-08T10:00:00Z',
        dateKey: '2026-09-08',
        hourOfDay: 10,
        dayOfWeek: 2,
        energyLevel: 5,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-3',
        timestamp: '2026-09-09T10:00:00Z',
        dateKey: '2026-09-09',
        hourOfDay: 10,
        dayOfWeek: 3,
        energyLevel: 6,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-4',
        timestamp: '2026-09-10T10:00:00Z',
        dateKey: '2026-09-10',
        hourOfDay: 10,
        dayOfWeek: 4,
        energyLevel: 7,
        dimensions: {},
        triggers: ['Nature'],
        physicalSensations: ['Deep breathing'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-5',
        timestamp: '2026-09-11T10:00:00Z',
        dateKey: '2026-09-11',
        hourOfDay: 10,
        dayOfWeek: 5,
        energyLevel: 7,
        dimensions: {},
        triggers: ['Meditation'],
        physicalSensations: ['Relaxed shoulders'],
        modality: 'mood_checkin',
      },
    ];

    const patterns = defaultPatternEngine.analyze(testUserId, observations);
    const cooccurPattern = patterns.find((p) => p.type === 'context_somatic_cooccurrence');

    assert.ok(cooccurPattern, 'Should detect context_somatic_cooccurrence pattern');
    assert.ok(cooccurPattern.title.includes('frequently coincides with'));
  });

  it('clamps confidence deterministically between 0.15 and 0.95', () => {
    // Extreme high inputs (many observations, high recurrence, high magnitude, low stdDev)
    const high = PatternConfidence.calculate({
      sampleSize: 100,
      supportingCount: 100,
      stdDev: 0.1,
      effectMagnitude: 10,
      targetThreshold: 8,
    });
    assert.ok(high.confidence <= 0.95, `High confidence must not exceed 0.95, got ${high.confidence}`);
    assert.strictEqual(high.strength, 'strong');

    // Extreme low inputs
    const low = PatternConfidence.calculate({
      sampleSize: 1,
      supportingCount: 1,
      stdDev: 5,
      effectMagnitude: 0.1,
      targetThreshold: 8,
    });
    assert.ok(low.confidence >= 0.15, `Low confidence must not fall below 0.15, got ${low.confidence}`);
    assert.strictEqual(low.strength, 'mild');
  });

  it('STRICT NON-CAUSALITY LINT: asserts zero causal words in any generated pattern strings', () => {
    // Generate a comprehensive set of patterns
    const observations: NormalizedObservation[] = [
      {
        id: 'obs-1',
        timestamp: '2026-09-07T21:00:00Z',
        dateKey: '2026-09-07',
        hourOfDay: 21,
        dayOfWeek: 1,
        moodType: 'Calm',
        energyLevel: 3,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-2',
        timestamp: '2026-09-08T22:00:00Z',
        dateKey: '2026-09-08',
        hourOfDay: 22,
        dayOfWeek: 2,
        moodType: 'Calm',
        energyLevel: 3,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-3',
        timestamp: '2026-09-09T20:00:00Z',
        dateKey: '2026-09-09',
        hourOfDay: 20,
        dayOfWeek: 3,
        moodType: 'Calm',
        energyLevel: 4,
        dimensions: {},
        triggers: ['Deadlines'],
        physicalSensations: ['Tightness in neck'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-4',
        timestamp: '2026-09-10T10:00:00Z',
        dateKey: '2026-09-10',
        hourOfDay: 10,
        dayOfWeek: 4,
        moodType: 'Joy',
        energyLevel: 8,
        dimensions: {},
        triggers: ['Nature'],
        physicalSensations: ['Deep breathing'],
        modality: 'mood_checkin',
      },
      {
        id: 'obs-5',
        timestamp: '2026-09-11T11:00:00Z',
        dateKey: '2026-09-11',
        hourOfDay: 11,
        dayOfWeek: 5,
        moodType: 'Joy',
        energyLevel: 9,
        dimensions: {},
        triggers: ['Meditation'],
        physicalSensations: ['Relaxed shoulders'],
        modality: 'mood_checkin',
      },
    ];

    const patterns = defaultPatternEngine.analyze(testUserId, observations);
    assert.ok(patterns.length >= 2, 'Should discover multiple patterns');

    // Forbidden causal regex: "causes", "caused", "will cause", "because of", "leads to"
    const causalRegex = /\b(causes?|caused|causing|will\s+cause|because\s+of|leads\s+to|resulting\s+from)\b/i;

    for (const pattern of patterns) {
      assert.ok(
        !causalRegex.test(pattern.title),
        `Pattern title contains forbidden causal wording: "${pattern.title}"`
      );
      assert.ok(
        !causalRegex.test(pattern.description),
        `Pattern description contains forbidden causal wording: "${pattern.description}"`
      );
      assert.ok(
        !causalRegex.test(pattern.deterministicTitle),
        `Deterministic title contains forbidden causal wording: "${pattern.deterministicTitle}"`
      );
      assert.ok(
        !causalRegex.test(pattern.deterministicDescription),
        `Deterministic description contains forbidden causal wording: "${pattern.deterministicDescription}"`
      );
    }
  });
});
