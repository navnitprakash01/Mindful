import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStateConstellation,
  buildHistoricalPath,
  buildCurrentStateSummary,
  buildDimensionSummary,
  DIMENSION_METADATA,
} from '../src/lib/observatoryHelpers';
import { PersonalState, MoodLog } from '../src/types';
import { calculateSevenDaySlots } from '../src/lib/emotionalRhythm';

describe('Inner Observatory - Pure Layout & Data Helpers', () => {
  const mockColdState: PersonalState = {
    id: 'cold-1',
    userId: 'user-cold',
    timestamp: '2026-09-12T00:00:00Z',
    mood: 50,
    stress: 50,
    fatigue: 50,
    energy: 50,
    focus: 50,
    cognitiveLoad: 50,
    confidence: 0,
    dimensions: {
      mood: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
      stress: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
      fatigue: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
      energy: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
      focus: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
      cognitiveLoad: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
    },
    evidence: [],
    sourceSummary: {},
    overallConfidence: 0,
    somaticMarkers: [],
    contextualTriggers: [],
    activeSignalsCount: 0,
    decayHalfLifeHours: 12.0,
  };

  const mockActiveState: PersonalState = {
    id: 'active-1',
    userId: 'user-active',
    timestamp: '2026-09-12T00:00:00Z',
    mood: 80,
    stress: 25,
    fatigue: 30,
    energy: 77,
    focus: 84,
    cognitiveLoad: 35,
    confidence: 0.82,
    dimensions: {
      mood: { value: 80, confidence: 0.85, baselineDeviation: 10, trend: 'improving', contributingSignalIds: ['sig-1'] },
      stress: { value: 25, confidence: 0.78, baselineDeviation: -15, trend: 'improving', contributingSignalIds: ['sig-1'] },
      fatigue: { value: 30, confidence: 0.70, baselineDeviation: -5, trend: 'stable', contributingSignalIds: ['sig-1'] },
      energy: { value: 77, confidence: 0.82, baselineDeviation: 12, trend: 'improving', contributingSignalIds: ['sig-1'] },
      focus: { value: 84, confidence: 0.80, baselineDeviation: 14, trend: 'improving', contributingSignalIds: ['sig-1'] },
      cognitiveLoad: { value: 35, confidence: 0.65, baselineDeviation: -5, trend: 'stable', contributingSignalIds: ['sig-1'] },
    },
    evidence: [],
    sourceSummary: { mood_checkin: 1 },
    overallConfidence: 0.82,
    somaticMarkers: ['Relaxed shoulders', 'Steady breath'],
    contextualTriggers: ['Creative Work', 'Morning Routine'],
    activeSignalsCount: 2,
    decayHalfLifeHours: 12.0,
  };

  it('buildStateConstellation handles cold state with 0 confidence and returns valid nodes without NaN', () => {
    const constellation = buildStateConstellation(mockColdState);

    assert.strictEqual(constellation.center.isCold, true);
    assert.strictEqual(constellation.center.overallConfidence, 0);
    assert.strictEqual(constellation.center.statusLabel, 'Establishing Baseline');

    assert.strictEqual(constellation.nodes.length, 6);
    constellation.nodes.forEach((node) => {
      assert.ok(!Number.isNaN(node.x), `Node ${node.key} x must not be NaN`);
      assert.ok(!Number.isNaN(node.y), `Node ${node.key} y must not be NaN`);
      assert.ok(!Number.isNaN(node.z), `Node ${node.key} z must not be NaN`);
      assert.strictEqual(node.isKnown, false);
      assert.strictEqual(node.confidence, 0);
    });

    assert.ok(constellation.connections.length >= 6);
  });

  it('buildStateConstellation maps active confidence and values to spatial nodes accurately', () => {
    const constellation = buildStateConstellation(mockActiveState);

    assert.strictEqual(constellation.center.isCold, false);
    assert.strictEqual(constellation.center.overallConfidence, 0.82);
    assert.strictEqual(constellation.center.statusLabel, 'Radiant Vitality');

    const energyNode = constellation.nodes.find((n) => n.key === 'energy')!;
    assert.ok(energyNode);
    assert.strictEqual(energyNode.value, 77);
    assert.strictEqual(energyNode.confidence, 0.82);
    assert.strictEqual(energyNode.isKnown, true);
    assert.strictEqual(energyNode.color, DIMENSION_METADATA.energy.color);
    assert.ok(energyNode.opacity > 0.7, 'Active high confidence node should have high opacity');
    assert.ok(energyNode.scale > 1.0, 'Active high confidence node should have scale > 1.0');
  });

  it('buildHistoricalPath preserves ZERO-FABRICATION principle when data is empty', () => {
    const baseDate = new Date('2026-09-12T12:00:00Z');
    const slots = calculateSevenDaySlots([], baseDate);
    const rhythm = buildHistoricalPath(slots);

    assert.strictEqual(rhythm.isEmpty, true);
    assert.strictEqual(rhythm.recordedCount, 0);
    assert.strictEqual(rhythm.points.length, 0);
    assert.strictEqual(rhythm.pathD, '');
    assert.strictEqual(rhythm.averageEnergy, null);
  });

  it('buildHistoricalPath plots only real observations and does NOT interpolate missing days', () => {
    const baseDate = new Date('2026-09-12T12:00:00Z');
    const sparseLogs: MoodLog[] = [
      {
        id: 'log-1',
        timestamp: new Date(baseDate.getTime() - 5 * 86400000).toISOString(),
        energyLevel: 8,
        moodType: 'Calm',
        notes: 'Quiet focus',
        triggers: ['Creative Work'],
        physicalSensations: ['Deep breathing'],
      },
      {
        id: 'log-2',
        timestamp: baseDate.toISOString(),
        energyLevel: 7,
        moodType: 'Joy',
        notes: 'Great day',
        triggers: ['Nature'],
        physicalSensations: ['Warmth'],
      },
    ];

    const slots = calculateSevenDaySlots(sparseLogs, baseDate);
    const rhythm = buildHistoricalPath(slots);

    assert.strictEqual(rhythm.isEmpty, false);
    assert.strictEqual(rhythm.recordedCount, 2);
    assert.strictEqual(rhythm.points.length, 2);
    assert.strictEqual(rhythm.averageEnergy, 7.5);

    // Verify first point corresponds strictly to log-1
    assert.strictEqual(rhythm.points[0].moodType, 'Calm');
    assert.strictEqual(rhythm.points[0].energyLevel, 8);
    assert.deepStrictEqual(rhythm.points[0].triggers, ['Creative Work']);

    // Verify second point corresponds strictly to log-2
    assert.strictEqual(rhythm.points[1].moodType, 'Joy');
    assert.strictEqual(rhythm.points[1].energyLevel, 7);
    assert.deepStrictEqual(rhythm.points[1].triggers, ['Nature']);
  });

  it('buildCurrentStateSummary formats titles and respects confidence thresholds', () => {
    const coldSummary = buildCurrentStateSummary(mockColdState);
    assert.strictEqual(coldSummary.isCold, true);
    assert.strictEqual(coldSummary.confidencePct, 0);
    assert.strictEqual(coldSummary.confidenceLabel, 'Establishing baseline');
    assert.strictEqual(coldSummary.title, 'Establishing Baseline');

    const activeSummary = buildCurrentStateSummary(mockActiveState);
    assert.strictEqual(activeSummary.isCold, false);
    assert.strictEqual(activeSummary.confidencePct, 82);
    assert.strictEqual(activeSummary.confidenceLabel, 'High');
    assert.strictEqual(activeSummary.title, 'Radiant Vitality');
    assert.strictEqual(activeSummary.primaryDimensions.length, 3);
  });

  it('buildDimensionSummary returns all 6 dimensions with proper metadata and flags', () => {
    const summary = buildDimensionSummary(mockActiveState);
    assert.strictEqual(summary.length, 6);

    const mood = summary.find((d) => d.key === 'mood')!;
    assert.strictEqual(mood.value, 80);
    assert.strictEqual(mood.confidencePct, 85);
    assert.strictEqual(mood.isKnown, true);
    assert.strictEqual(mood.trend, 'improving');
    assert.strictEqual(mood.isPrimary, true);
  });

  it('deriveStateSentence and deriveStateTheme create empathetic and state-responsive descriptors', async () => {
    const { deriveStateSentence, deriveStateTheme } = await import('../src/lib/observatoryHelpers');

    const coldSentence = deriveStateSentence(mockColdState);
    assert.strictEqual(coldSentence, 'Establishing your baseline rhythm.');

    const activeSentence = deriveStateSentence(mockActiveState);
    assert.strictEqual(activeSentence, 'Calm, energized, and focused.');

    const coldTheme = deriveStateTheme(mockColdState);
    assert.strictEqual(coldTheme.ambientVibe, 'baseline');
    assert.strictEqual(coldTheme.breathingDuration, 4.2);

    const activeTheme = deriveStateTheme(mockActiveState);
    assert.strictEqual(activeTheme.ambientVibe, 'radiant');
    assert.strictEqual(activeTheme.breathingDuration, 2.8);
  });

  it('deriveWhatsHappeningInsight creates factual, evidence-based statements without causal claims', async () => {
    const { deriveWhatsHappeningInsight } = await import('../src/lib/observatoryHelpers');
    const baseDate = new Date('2026-09-12T12:00:00Z');

    // 0 check-ins
    const emptySlots = calculateSevenDaySlots([], baseDate);
    const emptyRhythm = buildHistoricalPath(emptySlots);
    const emptyInsight = deriveWhatsHappeningInsight(mockColdState, 0, emptyRhythm);
    assert.strictEqual(emptyInsight.hasData, false);
    assert.strictEqual(emptyInsight.headline, 'Mindful is still learning your rhythm.');

    // 3 check-ins with steady energy
    const logs: MoodLog[] = [
      { id: '1', timestamp: new Date(baseDate.getTime() - 2 * 86400000).toISOString(), energyLevel: 7, moodType: 'Calm', notes: '', triggers: [], physicalSensations: [] },
      { id: '2', timestamp: new Date(baseDate.getTime() - 1 * 86400000).toISOString(), energyLevel: 7, moodType: 'Calm', notes: '', triggers: [], physicalSensations: [] },
      { id: '3', timestamp: baseDate.toISOString(), energyLevel: 7, moodType: 'Calm', notes: '', triggers: [], physicalSensations: [] },
    ];
    const slots = calculateSevenDaySlots(logs, baseDate);
    const rhythm = buildHistoricalPath(slots);
    const insight = deriveWhatsHappeningInsight(mockActiveState, 3, rhythm);
    assert.strictEqual(insight.hasData, true);
    assert.ok(insight.headline.includes('calm') || insight.headline.includes('steady'));
    assert.ok(!insight.headline.includes('cause'));
    assert.ok(!insight.detail.includes('cause'));
  });
});
