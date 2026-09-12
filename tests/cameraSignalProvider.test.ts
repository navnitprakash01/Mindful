/**
 * Camera Signal Provider & Behavioral Baseline Tests
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  computeCameraBaseline,
  CameraSignalProvider,
  CameraObservationInput,
} from '../src/server/engine/cameraSignalProvider';
import { WellnessSignal } from '../src/server/engine/types';

describe('Camera Signal Provider & Behavioral Baseline Tests', () => {
  const userId = randomUUID();

  function makeCameraSignal(overrides: {
    userId?: string;
    sessionDurationSeconds?: number;
    facePresenceRatio?: number;
    multipleFacesDetected?: boolean;
    trackingQuality?: number;
    headMovementVelocity?: number;
    headPoseVariance?: number;
    facialActivityIndex?: number;
    blinkRatePerMinute?: number;
  }): WellnessSignal {
    return {
      id: randomUUID(),
      userId: overrides.userId || userId,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      modality: 'camera_behavior',
      reliabilityWeight: 0.65,
      estimates: {
        fatigue: { value: 35, confidence: 0.65 },
        stress: { value: 30, confidence: 0.65 },
      },
      features: {
        sessionDurationSeconds: overrides.sessionDurationSeconds ?? 35,
        facePresenceRatio: overrides.facePresenceRatio ?? 0.95,
        multipleFacesDetected: overrides.multipleFacesDetected ?? false,
        trackingQuality: overrides.trackingQuality ?? 0.85,
        headMovementVelocity: overrides.headMovementVelocity ?? 12.0,
        headPoseVariance: overrides.headPoseVariance ?? 15.0,
        facialActivityIndex: overrides.facialActivityIndex ?? 0.30,
        blinkRatePerMinute: overrides.blinkRatePerMinute ?? 18.0,
        sentimentSummary: 'Observed motor dynamics consistent with recent baseline.',
      } as any,
    };
  }

  describe('computeCameraBaseline Lifecycle & Contamination Filtering', () => {
    it('returns null when user has 0 historical camera signals', () => {
      const baseline = computeCameraBaseline(userId, []);
      assert.strictEqual(baseline, null);
    });

    it('returns preliminary baseline when user has 1 or 2 valid observations', () => {
      const signals = [makeCameraSignal({})];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 1);
      assert.strictEqual(baseline.isPreliminary, true);

      // Add a second observation
      signals.push(makeCameraSignal({}));
      const baseline2 = computeCameraBaseline(userId, signals);
      assert.ok(baseline2);
      assert.strictEqual(baseline2.observationCount, 2);
      assert.strictEqual(baseline2.isPreliminary, true);
    });

    it('transitions to mature baseline when user has >= 3 valid observations', () => {
      const signals = [
        makeCameraSignal({ blinkRatePerMinute: 16.0, headMovementVelocity: 10.0 }),
        makeCameraSignal({ blinkRatePerMinute: 18.0, headMovementVelocity: 12.0 }),
        makeCameraSignal({ blinkRatePerMinute: 20.0, headMovementVelocity: 14.0 }),
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 3);
      assert.strictEqual(baseline.isPreliminary, false);
      assert.strictEqual(baseline.avgBlinkRatePerMinute, 18.0);
      assert.strictEqual(baseline.avgHeadMovementVelocity, 12.0);
    });

    it('excludes observations with sessionDurationSeconds < 30', () => {
      const signals = [
        makeCameraSignal({}),
        makeCameraSignal({}),
        makeCameraSignal({ sessionDurationSeconds: 20 }), // contaminated: too short
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 2);
      assert.strictEqual(baseline.isPreliminary, true);
    });

    it('excludes observations with trackingQuality < 0.40', () => {
      const signals = [
        makeCameraSignal({}),
        makeCameraSignal({}),
        makeCameraSignal({ trackingQuality: 0.35 }), // contaminated: poor quality
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 2);
      assert.strictEqual(baseline.isPreliminary, true);
    });

    it('excludes observations with facePresenceRatio < 0.80', () => {
      const signals = [
        makeCameraSignal({}),
        makeCameraSignal({}),
        makeCameraSignal({ facePresenceRatio: 0.70 }), // contaminated: low face presence
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 2);
      assert.strictEqual(baseline.isPreliminary, true);
    });

    it('excludes observations where multipleFacesDetected is true', () => {
      const signals = [
        makeCameraSignal({}),
        makeCameraSignal({}),
        makeCameraSignal({ multipleFacesDetected: true }), // contaminated: multiple faces
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 2);
      assert.strictEqual(baseline.isPreliminary, true);
    });

    it('excludes observations with NaN or Infinity features', () => {
      const signals = [
        makeCameraSignal({}),
        makeCameraSignal({}),
        makeCameraSignal({ blinkRatePerMinute: NaN }), // contaminated: NaN
        makeCameraSignal({ headMovementVelocity: Infinity }), // contaminated: Infinity
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 2);
      assert.strictEqual(baseline.isPreliminary, true);
    });

    it('correctly filters contaminated signals out of a larger pool', () => {
      const signals = [
        makeCameraSignal({ blinkRatePerMinute: 15.0 }), // Valid 1
        makeCameraSignal({ trackingQuality: 0.20 }), // Contaminated
        makeCameraSignal({ blinkRatePerMinute: 17.0 }), // Valid 2
        makeCameraSignal({ multipleFacesDetected: true }), // Contaminated
        makeCameraSignal({ blinkRatePerMinute: 19.0 }), // Valid 3
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline);
      assert.strictEqual(baseline.observationCount, 3);
      assert.strictEqual(baseline.isPreliminary, false);
      assert.strictEqual(baseline.avgBlinkRatePerMinute, 17.0);
    });
  });

  describe('CameraSignalProvider Extraction & Inference', () => {
    const provider = new CameraSignalProvider();

    it('has modality "camera_behavior" and reliability weight 0.65', () => {
      assert.strictEqual(provider.modality, 'camera_behavior');
      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 35,
          facePresenceRatio: 0.95,
          multipleFacesDetected: false,
          trackingQuality: 0.85,
          headMovementVelocity: 12.0,
          headPoseVariance: 15.0,
          facialActivityIndex: 0.30,
          blinkRatePerMinute: 18.0,
        },
      });
      assert.strictEqual(signals[0].modality, 'camera_behavior');
      assert.strictEqual(signals[0].reliabilityWeight, 0.65);
    });

    it('strictly avoids direct mappings for mood or cognitiveLoad', () => {
      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 35,
          facePresenceRatio: 0.95,
          multipleFacesDetected: false,
          trackingQuality: 0.85,
          headMovementVelocity: 12.0,
          headPoseVariance: 15.0,
          facialActivityIndex: 0.30,
          blinkRatePerMinute: 18.0,
        },
      });
      const estimates = signals[0].estimates;
      assert.strictEqual(estimates.mood, undefined);
      assert.strictEqual(estimates.cognitiveLoad, undefined);
      assert.ok(estimates.fatigue);
      assert.ok(estimates.stress);
      assert.ok(estimates.energy);
      assert.ok(estimates.focus);
    });

    it('detects elevated blink rate and quiet facial dynamics relative to mature baseline', () => {
      const matureBaseline = {
        userId,
        avgBlinkRatePerMinute: 16.0,
        avgHeadMovementVelocity: 12.0,
        avgHeadPoseVariance: 15.0,
        avgFacialActivityIndex: 0.35,
        observationCount: 5,
        isPreliminary: false,
        lastUpdated: new Date().toISOString(),
      };

      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 35,
          facePresenceRatio: 0.95,
          multipleFacesDetected: false,
          trackingQuality: 0.85,
          headMovementVelocity: 11.5,
          headPoseVariance: 14.0,
          facialActivityIndex: 0.18, // Reduced facial motion
          blinkRatePerMinute: 28.0, // +12 above baseline
        },
        cameraBaseline: matureBaseline,
      });

      const signal = signals[0];
      assert.ok(signal.estimates.fatigue!.value > 35, 'Fatigue should increase above neutral default');
      assert.ok(signal.estimates.energy!.value < 65, 'Energy should decrease below neutral default');
      assert.match(
        signal.features?.sentimentSummary!,
        /Elevated blink frequency and quiet facial dynamics/
      );
    });

    it('detects elevated movement velocity and pose variance relative to mature baseline', () => {
      const matureBaseline = {
        userId,
        avgBlinkRatePerMinute: 16.0,
        avgHeadMovementVelocity: 10.0,
        avgHeadPoseVariance: 12.0,
        avgFacialActivityIndex: 0.30,
        observationCount: 4,
        isPreliminary: false,
        lastUpdated: new Date().toISOString(),
      };

      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 35,
          facePresenceRatio: 0.95,
          multipleFacesDetected: false,
          trackingQuality: 0.85,
          headMovementVelocity: 22.0, // +12 above baseline
          headPoseVariance: 28.0, // +16 above baseline
          facialActivityIndex: 0.32,
          blinkRatePerMinute: 17.0,
        },
        cameraBaseline: matureBaseline,
      });

      const signal = signals[0];
      assert.ok(signal.estimates.stress!.value > 30, 'Stress should increase above neutral default');
      assert.match(
        signal.features?.sentimentSummary!,
        /Elevated head movement velocity and postural variability/
      );
    });

    it('detects high postural stability and steady gaze orientation', () => {
      const matureBaseline = {
        userId,
        avgBlinkRatePerMinute: 16.0,
        avgHeadMovementVelocity: 12.0,
        avgHeadPoseVariance: 16.0,
        avgFacialActivityIndex: 0.30,
        observationCount: 4,
        isPreliminary: false,
        lastUpdated: new Date().toISOString(),
      };

      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 35,
          facePresenceRatio: 0.98,
          multipleFacesDetected: false,
          trackingQuality: 0.90,
          headMovementVelocity: 8.0, // -4 below baseline (calm/stable)
          headPoseVariance: 8.0, // -8 below baseline
          facialActivityIndex: 0.30,
          blinkRatePerMinute: 16.0,
        },
        cameraBaseline: matureBaseline,
      });

      const signal = signals[0];
      assert.ok(signal.estimates.focus!.value > 70, 'Focus should increase');
      assert.match(
        signal.features?.sentimentSummary!,
        /High head pose stability and steady gaze orientation/
      );
    });

    it('falls back conservatively when baseline is preliminary or missing', () => {
      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 35,
          facePresenceRatio: 0.95,
          multipleFacesDetected: false,
          trackingQuality: 0.85,
          headMovementVelocity: 12.0,
          headPoseVariance: 15.0,
          facialActivityIndex: 0.30,
          blinkRatePerMinute: 18.0,
        },
        cameraBaseline: null,
      });

      const signal = signals[0];
      assert.strictEqual(signal.estimates.stress!.value, 30);
      assert.strictEqual(signal.estimates.fatigue!.value, 35);
      assert.match(signal.features?.sentimentSummary!, /calibrating with initial camera baseline/);
    });

    it('strictly enforces confidence cap at <= 0.80', () => {
      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 60,
          facePresenceRatio: 1.0,
          multipleFacesDetected: false,
          trackingQuality: 1.0,
          headMovementVelocity: 10.0,
          headPoseVariance: 12.0,
          facialActivityIndex: 0.30,
          blinkRatePerMinute: 16.0,
          confidence: 1.0, // Perfect input confidence
        },
        cameraBaseline: {
          userId,
          avgBlinkRatePerMinute: 16.0,
          avgHeadMovementVelocity: 10.0,
          avgHeadPoseVariance: 12.0,
          avgFacialActivityIndex: 0.30,
          observationCount: 10,
          isPreliminary: false,
          lastUpdated: new Date().toISOString(),
        },
      });

      const conf = signals[0].estimates.stress!.confidence;
      assert.ok(conf <= 0.80, `Confidence must not exceed single-modality cap 0.80, got ${conf}`);
      assert.ok(conf >= 0.20, `Confidence must be at least 0.20, got ${conf}`);
    });

    it('strictly enforces non-causal, non-diagnostic phrasing', () => {
      const signals = provider.extractSignals({
        userId,
        metrics: {
          sessionDurationSeconds: 35,
          facePresenceRatio: 0.95,
          multipleFacesDetected: false,
          trackingQuality: 0.85,
          headMovementVelocity: 25.0,
          headPoseVariance: 35.0,
          facialActivityIndex: 0.15,
          blinkRatePerMinute: 35.0,
        },
      });

      const summary = signals[0].features?.sentimentSummary || '';
      assert.doesNotMatch(summary, /depressed|depression/i);
      assert.doesNotMatch(summary, /anxious|anxiety/i);
      assert.doesNotMatch(summary, /pathological|disorder|diagnosis|diagnosed/i);
      assert.doesNotMatch(summary, /proves|causes|determines/i);
    });
  });

  // ─── Phase 7 Hardening Regression Tests ────────────────────────────────────

  describe('F02 — Focus Proportional Scaling (Case C)', () => {
    const provider = new CameraSignalProvider();

    // Mature baseline used across all Case C tests
    const matureBaseline = {
      userId,
      avgBlinkRatePerMinute: 16.0,
      avgHeadMovementVelocity: 12.0,
      avgHeadPoseVariance: 50.0,
      avgFacialActivityIndex: 0.30,
      observationCount: 4,
      isPreliminary: false,
      lastUpdated: new Date().toISOString(),
    };

    // Helper for Case C: stability below baseline
    function makeCaseCMetrics(velDelta: number, varDelta: number) {
      return {
        sessionDurationSeconds: 35,
        facePresenceRatio: 0.95,
        multipleFacesDetected: false,
        trackingQuality: 0.85,
        headMovementVelocity: matureBaseline.avgHeadMovementVelocity + velDelta,
        headPoseVariance: matureBaseline.avgHeadPoseVariance + varDelta,
        facialActivityIndex: 0.30,
        blinkRatePerMinute: 16.0, // blinkDelta = 0 → satisfies |blinkDelta| <= 5
      };
    }

    it('small stability deviation produces minimum focus adjustment (focusAdj = 2)', () => {
      // velDelta=-2.5, varDelta=-5
      // stabilityIndex = 2.5*0.5 + 5*0.1 = 1.75 → round(1.75)=2 → clamp(2,2,12)=2
      // focusScore = min(85, 70+2) = 72
      const signals = provider.extractSignals({
        userId,
        metrics: makeCaseCMetrics(-2.5, -5),
        cameraBaseline: matureBaseline,
      });
      const focus = signals[0].estimates.focus!.value;
      assert.ok(focus > 70, 'Focus should increase above neutral default (70)');
      assert.ok(focus <= 73, `Small deviation should produce small adjustment; expected ≤73, got ${focus}`);
    });

    it('medium stability deviation produces medium focus adjustment', () => {
      // velDelta=-5, varDelta=-10
      // stabilityIndex = 5*0.5 + 10*0.1 = 3.5 → round=4 → focusScore = 74
      const signals = provider.extractSignals({
        userId,
        metrics: makeCaseCMetrics(-5, -10),
        cameraBaseline: matureBaseline,
      });
      const focus = signals[0].estimates.focus!.value;
      assert.ok(focus > 72, `Medium deviation should produce larger adjustment than small; got ${focus}`);
      assert.ok(focus <= 76, `Medium deviation should stay below large; got ${focus}`);
    });

    it('large stability deviation produces larger focus adjustment', () => {
      // velDelta=-10, varDelta=-20
      // stabilityIndex = 10*0.5 + 20*0.1 = 7 → focusScore = 77
      const signals = provider.extractSignals({
        userId,
        metrics: makeCaseCMetrics(-10, -20),
        cameraBaseline: matureBaseline,
      });
      const focus = signals[0].estimates.focus!.value;
      assert.ok(focus > 74, `Large deviation should produce larger adjustment than medium; got ${focus}`);
      assert.ok(focus <= 79, `Large deviation should stay below extreme; got ${focus}`);
    });

    it('extreme stability deviation is capped at bounded maximum (focusAdj ≤ 12, focusScore ≤ 85)', () => {
      // velDelta=-15, varDelta=-40
      // stabilityIndex = 15*0.5 + 40*0.1 = 11.5 → round=12 → capped at 12
      // focusScore = min(85, 70+12) = 82
      const signals = provider.extractSignals({
        userId,
        metrics: makeCaseCMetrics(-15, -40),
        cameraBaseline: matureBaseline,
      });
      const focus = signals[0].estimates.focus!.value;
      assert.ok(focus >= 80, `Extreme deviation should produce near-maximum focus; got ${focus}`);
      assert.ok(focus <= 85, `Focus must not exceed hard cap of 85; got ${focus}`);
    });

    it('focus adjustments are monotonically increasing with deviation magnitude', () => {
      const small  = provider.extractSignals({ userId, metrics: makeCaseCMetrics(-2.5, -5),   cameraBaseline: matureBaseline })[0].estimates.focus!.value;
      const medium = provider.extractSignals({ userId, metrics: makeCaseCMetrics(-5,   -10),  cameraBaseline: matureBaseline })[0].estimates.focus!.value;
      const large  = provider.extractSignals({ userId, metrics: makeCaseCMetrics(-10,  -20),  cameraBaseline: matureBaseline })[0].estimates.focus!.value;
      const extreme= provider.extractSignals({ userId, metrics: makeCaseCMetrics(-15,  -40),  cameraBaseline: matureBaseline })[0].estimates.focus!.value;

      assert.ok(small <= medium,  `small(${small}) must be ≤ medium(${medium})`);
      assert.ok(medium <= large,  `medium(${medium}) must be ≤ large(${large})`);
      assert.ok(large <= extreme, `large(${large}) must be ≤ extreme(${extreme})`);
    });

    it('no adjustment produced when no mature baseline exists (no fabricated deviation)', () => {
      // Without a mature baseline, Case C logic does not run → focus stays at 70
      const signals = provider.extractSignals({
        userId,
        metrics: makeCaseCMetrics(-10, -20),
        cameraBaseline: null, // no baseline
      });
      // With no baseline, we fall into the preliminary path
      // Focus is not elevated by stability because there's nothing to compare against
      const focus = signals[0].estimates.focus!.value;
      assert.strictEqual(focus, 70, 'Focus must remain at neutral default (70) when no baseline exists');
    });

    it('no arbitrary fixed +8 constant appears in any output value', () => {
      // Regression guard: verify that no single-step output consistently equals 70+8=78
      // by testing that different deviation magnitudes produce different adjustments.
      const s1 = provider.extractSignals({ userId, metrics: makeCaseCMetrics(-2.5, -5),  cameraBaseline: matureBaseline })[0].estimates.focus!.value;
      const s2 = provider.extractSignals({ userId, metrics: makeCaseCMetrics(-10,  -20), cameraBaseline: matureBaseline })[0].estimates.focus!.value;
      // If both were using a fixed +8, they'd both equal 78. They must differ.
      assert.notStrictEqual(s1, s2, 'Different deviations must produce different focus adjustments (no fixed constant)');
    });
  });

  describe('F05 — Confidence Finiteness Guard (direct extractSignals call)', () => {
    const provider = new CameraSignalProvider();
    const baseMetrics = {
      sessionDurationSeconds: 35,
      facePresenceRatio: 0.95,
      multipleFacesDetected: false,
      trackingQuality: 0.85,
      headMovementVelocity: 12.0,
      headPoseVariance: 15.0,
      facialActivityIndex: 0.30,
      blinkRatePerMinute: 18.0,
    };

    it('NaN confidence input is defensively clamped — confidence remains finite and in [0.20, 0.80]', () => {
      const signals = provider.extractSignals({
        userId,
        metrics: { ...baseMetrics, confidence: NaN },
      });
      const conf = signals[0].estimates.stress!.confidence!;
      assert.ok(Number.isFinite(conf), `Confidence must be finite even with NaN input, got ${conf}`);
      assert.ok(conf >= 0.20 && conf <= 0.80, `Confidence ${conf} must be in [0.20, 0.80]`);
    });

    it('Infinity confidence input is defensively clamped — confidence remains in [0.20, 0.80]', () => {
      const signals = provider.extractSignals({
        userId,
        metrics: { ...baseMetrics, confidence: Infinity },
      });
      const conf = signals[0].estimates.stress!.confidence!;
      assert.ok(Number.isFinite(conf), `Confidence must be finite even with Infinity input, got ${conf}`);
      assert.ok(conf >= 0.20 && conf <= 0.80, `Confidence ${conf} must be in [0.20, 0.80]`);
    });

    it('-Infinity confidence input is defensively clamped — confidence remains in [0.20, 0.80]', () => {
      const signals = provider.extractSignals({
        userId,
        metrics: { ...baseMetrics, confidence: -Infinity },
      });
      const conf = signals[0].estimates.stress!.confidence!;
      assert.ok(Number.isFinite(conf), `Confidence must be finite even with -Infinity input, got ${conf}`);
      assert.ok(conf >= 0.20 && conf <= 0.80, `Confidence ${conf} must be in [0.20, 0.80]`);
    });

    it('NaN trackingQuality and facePresenceRatio product — confidence clamped defensively', () => {
      // When confidence is undefined, rawBaseConf = trackingQuality * facePresenceRatio
      // If trackingQuality = NaN, product is NaN → guard must still produce finite result
      const signals = provider.extractSignals({
        userId,
        metrics: { ...baseMetrics, trackingQuality: NaN as any },
        // no explicit confidence → falls back to trackingQuality * facePresenceRatio
      });
      const conf = signals[0].estimates.stress!.confidence!;
      assert.ok(Number.isFinite(conf), `Confidence must be finite even when trackingQuality is NaN, got ${conf}`);
      assert.ok(conf >= 0.20, `Confidence must be at least 0.20, got ${conf}`);
    });
  });

  describe('F07 — Baseline Max Session Duration Filter (computeCameraBaseline)', () => {
    it('excludes observations with sessionDurationSeconds > 300 from baseline', () => {
      const signals = [
        makeCameraSignal({}),                              // Valid: 35s
        makeCameraSignal({}),                              // Valid: 35s
        makeCameraSignal({ sessionDurationSeconds: 301 }), // Invalid: > 300s
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline, 'Baseline should exist from 2 valid signals');
      assert.strictEqual(baseline.observationCount, 2, 'Observation with 301s duration must be excluded');
      assert.strictEqual(baseline.isPreliminary, true, '2 valid observations → preliminary');
    });

    it('includes observations with sessionDurationSeconds exactly = 300 (boundary inclusive)', () => {
      const signals = [
        makeCameraSignal({ sessionDurationSeconds: 300 }), // Valid: exactly at cap
        makeCameraSignal({ sessionDurationSeconds: 300 }),
        makeCameraSignal({ sessionDurationSeconds: 300 }),
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline, 'Baseline should exist from 3 valid signals at 300s');
      assert.strictEqual(baseline.observationCount, 3);
      assert.strictEqual(baseline.isPreliminary, false, '3 valid observations → mature');
    });

    it('absurdly large session durations (e.g. 9999s) are excluded from baseline', () => {
      const signals = [
        makeCameraSignal({}),
        makeCameraSignal({ sessionDurationSeconds: 9999 }), // should be excluded
        makeCameraSignal({ sessionDurationSeconds: 86400 }), // should be excluded
      ];
      const baseline = computeCameraBaseline(userId, signals);
      assert.ok(baseline, 'Baseline should exist from 1 valid signal');
      assert.strictEqual(baseline.observationCount, 1);
      assert.strictEqual(baseline.isPreliminary, true);
    });

    it('baseline max duration filter operates independently of HTTP controller validation', () => {
      // This test exercises computeCameraBaseline() directly with fabricated signals
      // that bypass controller validation, confirming the baseline itself is protected.
      const fabricatedSignal = makeCameraSignal({ sessionDurationSeconds: 500 });
      const baseline = computeCameraBaseline(userId, [fabricatedSignal]);
      assert.strictEqual(baseline, null, 'Fabricated 500s signal must not produce a baseline');
    });
  });
});
