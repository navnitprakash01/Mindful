/**
 * Wearable & Behavioral Signal Integration & Security Tests
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { wearableController } from '../src/server/controllers/wearableController';
import { wearableService } from '../src/server/services/wearableService';
import { MockWearableProvider } from '../src/server/engine/wearable/mockProvider';
import { WearableSignalProvider } from '../src/server/engine/wearable/wearableProvider';
import { computeWearableBaseline } from '../src/server/engine/wearable/wearableBaseline';
import { WearableObservation } from '../src/server/engine/wearable/types';
import { stateService } from '../src/server/services/stateService';
import { memoryService } from '../src/server/services/memoryService';
import { GraphBuilder } from '../src/server/engine/evidenceGraph/graphBuilder';
import { ObservationNormalizer } from '../src/server/engine/patternEngine/normalizer';
import { defaultPatternEngine } from '../src/server/engine/patternEngine/patternEngine';
import { computeSessionDeltas } from '../src/server/engine/interventionEngine/effectivenessEngine';
import { ProactiveDecisionEngine } from '../src/server/engine/proactiveEngine/proactiveEngine';
import { AuthenticatedRequest } from '../src/server/middleware/auth';
import { WellnessSignal, PersonalState } from '../src/server/engine/types';

process.env.NODE_ENV = 'test';

const USER_A = '33333333-3333-4333-8333-333333333333';
const USER_B = '44444444-4444-4444-8444-444444444444';

function createMockReqRes(
  user: { id: string } | null,
  body: any = {},
  query: any = {},
  params: any = {}
) {
  const req = {
    user,
    body,
    query,
    params,
  } as unknown as AuthenticatedRequest;

  let statusCode = 200;
  let responseData: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

describe('Phase 9: Wearable & Behavioral Signal Model', () => {
  const provider = new WearableSignalProvider();

  beforeEach(async () => {
    await wearableService.purgeWearableSignals(USER_A);
    await wearableService.purgeWearableSignals(USER_B);
  });

  describe('A. Domain Validation & Quality Gates', () => {
    it('accepts valid recovered daily recovery observation', () => {
      const fixture = MockWearableProvider.getFixture('healthy_recovered');
      const validation = provider.validateObservation(fixture);
      assert.strictEqual(validation.isValid, true);
    });

    it('rejects observation with qualityScore below 0.50', () => {
      const fixture = MockWearableProvider.getFixture('poor_quality');
      const validation = provider.validateObservation(fixture);
      assert.strictEqual(validation.isValid, false);
      assert.match(validation.reason!, /below minimum acceptable threshold/);
    });

    it('rejects observation when observationPeriod end is earlier than start', () => {
      const fixture = MockWearableProvider.getFixture('healthy_recovered', {
        observationPeriod: {
          start: '2026-09-13T10:00:00.000Z',
          end: '2026-09-13T09:00:00.000Z', // earlier than start
        },
      });
      const validation = provider.validateObservation(fixture);
      assert.strictEqual(validation.isValid, false);
      assert.match(validation.reason!, /cannot be earlier than start/);
    });

    it('rejects non-finite values (NaN / Infinity) in physiological metrics', () => {
      const nanFixture = MockWearableProvider.getFixture('healthy_recovered', {
        metrics: { restingHeartRateBpm: NaN },
      });
      assert.strictEqual(provider.validateObservation(nanFixture).isValid, false);

      const infFixture = MockWearableProvider.getFixture('healthy_recovered', {
        metrics: { hrvRmssdMs: Infinity },
      });
      assert.strictEqual(provider.validateObservation(infFixture).isValid, false);
    });

    it('rejects extreme physiologically impossible values', () => {
      const fixture = MockWearableProvider.getFixture('malformed_extreme');
      const validation = provider.validateObservation(fixture);
      assert.strictEqual(validation.isValid, false);
      assert.match(validation.reason!, /restingHeartRateBpm must be between 30 and 220/);
    });

    it('handles missing optional metrics gracefully without fabricating defaults', () => {
      const fixture = MockWearableProvider.getFixture('missing_metrics');
      const validation = provider.validateObservation(fixture);
      assert.strictEqual(validation.isValid, true);

      const signals = provider.extractSignals(USER_A, fixture);
      assert.strictEqual(signals.length, 1);
      // Heart rate and HRV are absent, so stress is not artificially altered
      assert.strictEqual((signals[0].features as any).restingHeartRateBpm, undefined);
      assert.strictEqual((signals[0].features as any).hrvRmssdMs, undefined);
    });
  });

  describe('B. Physiological Baseline Engine', () => {
    it('returns null when no historical wearable signals exist', () => {
      const baseline = computeWearableBaseline(USER_A, []);
      assert.strictEqual(baseline, null);
    });

    it('remains preliminary when fewer than 3 clean observations exist', () => {
      const signal1: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        modality: 'wearable_metrics',
        estimates: {},
        features: {
          restingHeartRateBpm: 65,
          hrvRmssdMs: 45,
          sleepDurationMinutes: 450,
          qualityScore: 0.90,
        } as any,
        reliabilityWeight: 0.65,
        expiresAt: new Date().toISOString(),
      };
      const signal2: WellnessSignal = {
        ...signal1,
        id: randomUUID(),
        features: { ...signal1.features, restingHeartRateBpm: 67 } as any,
      };

      const baseline = computeWearableBaseline(USER_A, [signal1, signal2]);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 2);
      assert.strictEqual(baseline.isPreliminary, true);
    });

    it('transitions to mature baseline upon 3 clean observations', () => {
      const signals: WellnessSignal[] = [60, 62, 64].map((rhr) => ({
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        modality: 'wearable_metrics',
        estimates: {},
        features: {
          restingHeartRateBpm: rhr,
          hrvRmssdMs: 50,
          sleepDurationMinutes: 460,
          qualityScore: 0.90,
        } as any,
        reliabilityWeight: 0.65,
        expiresAt: new Date().toISOString(),
      }));

      const baseline = computeWearableBaseline(USER_A, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 3);
      assert.strictEqual(baseline.isPreliminary, false);
      assert.strictEqual(baseline.avgRestingHeartRateBpm, 62.0);
    });

    it('ignores low-quality or contaminated samples from baseline calculation', () => {
      const cleanSignals: WellnessSignal[] = [60, 62, 64].map((rhr) => ({
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        modality: 'wearable_metrics',
        estimates: {},
        features: {
          restingHeartRateBpm: rhr,
          hrvRmssdMs: 50,
          sleepDurationMinutes: 460,
          qualityScore: 0.85,
        } as any,
        reliabilityWeight: 0.65,
        expiresAt: new Date().toISOString(),
      }));

      // Contaminated sample with quality < 0.50
      const lowQualitySignal: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        modality: 'wearable_metrics',
        estimates: {},
        features: {
          restingHeartRateBpm: 120, // would corrupt average
          qualityScore: 0.30,
        } as any,
        reliabilityWeight: 0.65,
        expiresAt: new Date().toISOString(),
      };

      const baseline = computeWearableBaseline(USER_A, [...cleanSignals, lowQualitySignal]);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 3);
      assert.strictEqual(baseline.avgRestingHeartRateBpm, 62.0);
    });
  });

  describe('C. Signal Extraction & Dimensional Bounding', () => {
    it('maps sleep deficit to fatigue and energy without touching mood or cognitiveLoad', () => {
      const fixture = MockWearableProvider.getFixture('reduced_sleep');
      const signals = provider.extractSignals(USER_A, fixture);
      assert.strictEqual(signals.length, 1);
      const signal = signals[0];

      assert.ok(signal.estimates.fatigue!.value > 35);
      assert.ok(signal.estimates.energy!.value < 65);
      assert.strictEqual(signal.estimates.mood, undefined, 'Mood must NOT be directly set');
      assert.strictEqual(signal.estimates.cognitiveLoad, undefined, 'CognitiveLoad must NOT be directly set');
      assert.ok(signal.estimates.fatigue!.confidence <= 0.80);
      assert.strictEqual(signal.reliabilityWeight, 0.65);
      assert.match(signal.features.sentimentSummary!, /Sleep duration was below your recent personal baseline/);
    });

    it('maps autonomic tension (elevated HR / low HRV) to stress and energy without touching mood', () => {
      const fixture = MockWearableProvider.getFixture('reduced_hrv');
      const signals = provider.extractSignals(USER_A, fixture);
      const signal = signals[0];

      assert.ok(signal.estimates.stress!.value > 30);
      assert.strictEqual(signal.estimates.mood, undefined, 'Mood must NOT be directly set by heart rate');
      assert.strictEqual(signal.estimates.cognitiveLoad, undefined);
      assert.ok(signal.estimates.stress!.confidence <= 0.80);
    });

    it('maps high activity to energy and focus', () => {
      const fixture = MockWearableProvider.getFixture('high_activity');
      const signals = provider.extractSignals(USER_A, fixture);
      const signal = signals[0];

      assert.ok(signal.estimates.energy!.value > 65);
      assert.ok(signal.estimates.focus!.value >= 70);
      assert.strictEqual(signal.estimates.mood, undefined);
    });
  });

  describe('D. Deduplication & Damping', () => {
    it('discards duplicate observation with matching sampleId or within 5m window', async () => {
      await wearableService.updateSettings(USER_A, { enabled: true });
      const fixture1 = MockWearableProvider.getFixture('healthy_recovered');
      const fixture2 = MockWearableProvider.getFixture('duplicate');

      const res = await wearableService.ingestObservations(USER_A, [fixture1, fixture2]);
      assert.strictEqual(res.processedCount, 1);
      assert.strictEqual(res.deduplicatedCount, 1);
    });
  });

  describe('E. API Security & Tenant Isolation', () => {
    it('rejects unauthenticated requests to /api/wearable/sync with 401', async () => {
      const { req, res } = createMockReqRes(null, { observations: [] });
      await wearableController.sync(req, res as any);
      assert.strictEqual(res.getStatusCode(), 401);
    });

    it('rejects payload exceeding 50 KB with 400', async () => {
      const largeData = 'x'.repeat(55 * 1024);
      const { req, res } = createMockReqRes({ id: USER_A }, { largeField: largeData });
      await wearableController.sync(req, res as any);
      assert.strictEqual(res.getStatusCode(), 400);
      assert.match(res.getData().error, /Payload exceeds maximum allowable size/);
    });

    it('strictly isolates User A and User B wearable data', async () => {
      await wearableService.updateSettings(USER_A, { enabled: true });
      await wearableService.updateSettings(USER_B, { enabled: true });

      const fixA = MockWearableProvider.getFixture('healthy_recovered', { sampleId: randomUUID() });
      const fixB = MockWearableProvider.getFixture('reduced_sleep', { sampleId: randomUUID() });

      await wearableService.ingestObservations(USER_A, [fixA]);
      await wearableService.ingestObservations(USER_B, [fixB]);

      const baselineA = await wearableService.getBaseline(USER_A);
      const baselineB = await wearableService.getBaseline(USER_B);

      assert.notStrictEqual(baselineA?.avgSleepDurationMinutes, baselineB?.avgSleepDurationMinutes);

      // User A purging does not delete User B data
      const { req: purgeReq, res: purgeRes } = createMockReqRes({ id: USER_A });
      await wearableController.purge(purgeReq, purgeRes as any);
      assert.strictEqual(purgeRes.getStatusCode(), 200);

      const baselineBAfter = await wearableService.getBaseline(USER_B);
      assert.ok(baselineBAfter);
      assert.strictEqual(baselineBAfter.observationCount, 1);
    });
  });

  describe('F. Privacy & Anti-Exfiltration', () => {
    it('rejects raw waveforms (ECG/PPG) and location/GPS tracking', async () => {
      const { req: ecgReq, res: ecgRes } = createMockReqRes({ id: USER_A }, {
        observations: [{ sampleId: '1', ecgRaw: [1, 2, 3] }],
      });
      await wearableController.sync(ecgReq, ecgRes as any);
      assert.strictEqual(ecgRes.getStatusCode(), 400);
      assert.match(ecgRes.getData().error, /Forbidden telemetry detected/);

      const { req: gpsReq, res: gpsRes } = createMockReqRes({ id: USER_A }, {
        observations: [{ sampleId: '2', latitude: 37.7749, longitude: -122.4194 }],
      });
      await wearableController.sync(gpsReq, gpsRes as any);
      assert.strictEqual(gpsRes.getStatusCode(), 400);
      assert.match(gpsRes.getData().error, /Forbidden telemetry detected/);
    });

    it('guarantees wearable biometrics NEVER enter Personal AI Memory', async () => {
      await wearableService.updateSettings(USER_A, { enabled: true });
      const fixture = MockWearableProvider.getFixture('healthy_recovered', { sampleId: randomUUID() });
      await wearableService.ingestObservations(USER_A, [fixture]);

      const memories = await memoryService.listMemories(USER_A);
      assert.strictEqual(memories.length, 0, 'No memory should ever be created from wearable data');
    });
  });

  describe('G. Pipeline & Engine Integration', () => {
    it('incorporates wearable observations into Evidence Graph as raw_signal nodes', () => {
      const signal: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        modality: 'wearable_metrics',
        estimates: { stress: { value: 45, confidence: 0.70 } },
        features: { sentimentSummary: 'Resting heart rate aligned with baseline.' },
        reliabilityWeight: 0.65,
        expiresAt: new Date().toISOString(),
      };

      const mockState: PersonalState = {
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        mood: 70,
        stress: 45,
        fatigue: 35,
        energy: 65,
        focus: 70,
        cognitiveLoad: 35,
        confidence: 0.75,
        dimensions: {
          mood: { value: 70, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          stress: { value: 45, confidence: 0.7, baselineDeviation: 5, trend: 'stable', contributingSignalIds: [signal.id] },
          fatigue: { value: 35, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          energy: { value: 65, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          focus: { value: 70, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
          cognitiveLoad: { value: 35, confidence: 0.8, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
        },
        evidence: [],
        sourceSummary: { wearable_metrics: 1 },
        overallConfidence: 0.75,
        somaticMarkers: [],
        contextualTriggers: [],
        activeSignalsCount: 1,
        decayHalfLifeHours: 12.0,
      };

      const graph = GraphBuilder.build({
        userId: USER_A,
        currentState: mockState,
        signals: [signal],
      });

      const signalNode = graph.nodes[`node-sig-${signal.id}`];
      assert.ok(signalNode);
      assert.strictEqual(signalNode.type, 'raw_signal');
      assert.strictEqual(signalNode.modality, 'wearable_metrics');
      assert.strictEqual(signalNode.label, 'Wearable Observation');
    });

    it('normalizes wearable signals into PatternEngine observations', () => {
      const signal: WellnessSignal = {
        id: randomUUID(),
        userId: USER_A,
        timestamp: new Date().toISOString(),
        modality: 'wearable_metrics',
        estimates: { energy: { value: 65, confidence: 0.70 } },
        features: {} as any,
        reliabilityWeight: 0.65,
        expiresAt: new Date().toISOString(),
      };

      const observations = ObservationNormalizer.fromSignals([signal]);
      assert.strictEqual(observations.length, 1);
      assert.strictEqual(observations[0].modality, 'wearable_metrics');
      assert.strictEqual(observations[0].dimensions.energy, 65);
    });

    it('computes pre/post intervention deltas without claiming medical improvement', () => {
      const pre = { mood: 60, stress: 70, fatigue: 50, energy: 40, focus: 50, cognitiveLoad: 60 };
      const post = { mood: 65, stress: 55, fatigue: 48, energy: 45, focus: 55, cognitiveLoad: 50 };

      const deltas = computeSessionDeltas(pre, post);
      assert.strictEqual(deltas.stress, -15.0);
      assert.strictEqual(deltas.energy, 5.0);
    });
  });

  describe('H. Proactive Policy & Crisis Isolation', () => {
    it('wearable stress spike alone does NOT bypass proactive gates or trigger outreach', () => {
      // Opt-in disabled default
      const decision = ProactiveDecisionEngine.evaluate({
        userId: USER_A,
        currentState: {
          id: randomUUID(),
          userId: USER_A,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          mood: 60,
          stress: 85, // spike
          fatigue: 70,
          energy: 30,
          focus: 40,
          cognitiveLoad: 60,
          confidence: 0.70,
          dimensions: {} as any,
          evidence: [],
          sourceSummary: { wearable_metrics: 1 },
          overallConfidence: 0.70,
          somaticMarkers: [],
          contextualTriggers: [],
          activeSignalsCount: 1,
          decayHalfLifeHours: 12.0,
        },
        patterns: [],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: false }, // User opt-in is false
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'opt_in_disabled');
    });

    it('crisis screening takes absolute precedence over wearable calm indicators', () => {
      const decision = ProactiveDecisionEngine.evaluate({
        userId: USER_A,
        currentState: null,
        patterns: [],
        activeMemories: [],
        recentEvents: [],
        settings: { enabled: true },
        textContext: 'I want to kill myself and end it all', // active crisis
      });

      assert.strictEqual(decision.shouldSurface, false);
      assert.strictEqual(decision.suppressionReason, 'crisis_active');
    });
  });
});
