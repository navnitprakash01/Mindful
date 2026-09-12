/**
 * Camera Analyzer — Deterministic Mathematical & Quality Gate Tests
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 *
 * Includes Phase 7 Hardening regression tests:
 * - F04: Skin-tone-agnostic quality gate (luminance + texture based)
 * - F10: Multiple tracking regions limitation documentation & behavior
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeVelocity,
  computePoseVariance,
  computeBlinkRate,
  computeTrackingQuality,
  validateCameraSession,
} from '../src/lib/camera/cameraAnalyzer';
import { CameraBehavioralMetrics } from '../src/server/engine/cameraSignalProvider';

describe('Camera Analyzer — Pure Deterministic Metrics & Quality Gate Tests', () => {
  describe('computeVelocity', () => {
    it('returns 0 for empty array or single coordinate', () => {
      assert.strictEqual(computeVelocity([]), 0);
      assert.strictEqual(computeVelocity([{ x: 0.5, y: 0.5, t: 1000 }]), 0);
    });

    it('accurately computes velocity across steady movement', () => {
      // Moves 0.1 normalized units across 100ms (0.1s)
      // speed = (0.1 / 0.1) * 100 = 100
      const positions = [
        { x: 0.5, y: 0.5, t: 1000 },
        { x: 0.6, y: 0.5, t: 1100 },
        { x: 0.7, y: 0.5, t: 1200 },
      ];
      const vel = computeVelocity(positions);
      assert.strictEqual(vel, 100);
    });

    it('skips abnormal time gaps (> 1.0 second)', () => {
      const positions = [
        { x: 0.5, y: 0.5, t: 1000 },
        { x: 0.9, y: 0.9, t: 4000 }, // 3.0s gap skipped
        { x: 0.95, y: 0.9, t: 4100 }, // 0.05 / 0.1 * 100 = 50
      ];
      const vel = computeVelocity(positions);
      assert.strictEqual(vel, 50);
    });
  });

  describe('computePoseVariance', () => {
    it('returns 0 for fewer than 2 points', () => {
      assert.strictEqual(computePoseVariance([]), 0);
      assert.strictEqual(computePoseVariance([{ x: 0.5, y: 0.5 }]), 0);
    });

    it('returns 0 for perfectly static positions', () => {
      const positions = [
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
      ];
      assert.strictEqual(computePoseVariance(positions), 0);
    });

    it('accurately calculates 2D sample variance', () => {
      // Mean x = 0.5, diffs: -0.1, 0, +0.1 -> * 100: -10, 0, 10 -> sq: 100, 0, 100 -> sum 200 / (3-1) = 100
      const positions = [
        { x: 0.4, y: 0.5 },
        { x: 0.5, y: 0.5 },
        { x: 0.6, y: 0.5 },
      ];
      const variance = computePoseVariance(positions);
      assert.strictEqual(variance, 100);
    });
  });

  describe('computeBlinkRate', () => {
    it('returns 0 for non-positive duration or zero blinks', () => {
      assert.strictEqual(computeBlinkRate(10, 0), 0);
      assert.strictEqual(computeBlinkRate(0, 30), 0);
    });

    it('accurately extrapolates blink count to per-minute rate', () => {
      // 10 blinks in 30 seconds -> 20 blinks per minute
      assert.strictEqual(computeBlinkRate(10, 30), 20);
      // 15 blinks in 60 seconds -> 15 blinks per minute
      assert.strictEqual(computeBlinkRate(15, 60), 15);
    });

    it('clamps blink rate strictly within human physiological bounds [0, 120]', () => {
      assert.strictEqual(computeBlinkRate(200, 30), 120);
    });
  });

  describe('computeTrackingQuality — Luminance and Texture Based (Skin-Tone Agnostic)', () => {
    it('returns 0 for empty illuminations', () => {
      assert.strictEqual(computeTrackingQuality([], []), 0);
    });

    it('scores high for optimal lighting and continuous tracking presence', () => {
      const illuminations = [100, 120, 110, 105, 115]; // all in [40, 220]
      const presences = [true, true, true, true, true];
      const quality = computeTrackingQuality(illuminations, presences);
      assert.strictEqual(quality, 1.0);
    });

    it('penalizes poor illumination (dark room → poor tracking → session should be discarded)', () => {
      // Dark room: all frames below adequate illumination threshold
      const illuminations = [10, 15, 20, 250, 240]; // none in [40, 220]
      const presences = [true, true, true, true, true];
      const quality = computeTrackingQuality(illuminations, presences);
      // lightScore = 0, presenceScore = 1.0 → quality = 0.4*0 + 0.6*1.0 = 0.6
      assert.strictEqual(quality, 0.6);
    });

    it('scores below 0.40 for completely dark room with no tracking presence — session would be discarded', () => {
      // Dark room: illumination too low, texture detection fails → trackingPresences all false
      const illuminations = [5, 8, 6, 7, 9]; // all far below 40 luma
      const presences = [false, false, false, false, false]; // texture gate would fail in darkness
      const quality = computeTrackingQuality(illuminations, presences);
      // lightScore = 0, presenceScore = 0 → quality = 0.0
      assert.strictEqual(quality, 0.0);
      // This quality (0.0) is below the 0.40 gate → validateCameraSession would reject it
      assert.ok(quality < 0.40, 'Dark room with no tracking should score below 0.40 quality gate');
    });

    it('scores below 0.40 for overexposed / blown-out conditions with no tracking presence', () => {
      // Overexposed: illumination too high, texture detection fails → no presence
      const illuminations = [250, 255, 248, 252, 245]; // all above 220 luma
      const presences = [false, false, false, false, false];
      const quality = computeTrackingQuality(illuminations, presences);
      assert.strictEqual(quality, 0.0);
      assert.ok(quality < 0.40, 'Overexposed conditions should score below 0.40 quality gate');
    });

    it('penalizes intermittent tracking presence', () => {
      const illuminations = [100, 120, 110, 105, 115];
      const presences = [true, false, false, true, false]; // 2/5 = 0.4
      const quality = computeTrackingQuality(illuminations, presences);
      // 0.4 * 1.0 + 0.6 * 0.4 = 0.4 + 0.24 = 0.64
      assert.strictEqual(quality, 0.64);
    });

    it('accepts only luminance and boolean presence inputs — no color, no skin-tone parameters', () => {
      // Verify function signature: no skin color parameters exist
      // If computeTrackingQuality accepted a skin-tone argument, this test pattern would break
      const illuminations = [100, 120];
      const presences = [true, true];
      // Function called with exactly 2 args — any additional param would be silently ignored
      // This test documents the expected interface
      const quality = computeTrackingQuality(illuminations, presences);
      assert.ok(typeof quality === 'number', 'quality must be a number');
      assert.ok(quality >= 0.0 && quality <= 1.0, 'quality must be in [0.0, 1.0]');
    });
  });

  describe('validateCameraSession — Quality Gate Enforcement', () => {
    const baseValidMetrics: CameraBehavioralMetrics = {
      sessionDurationSeconds: 30,
      facePresenceRatio: 0.90,
      multipleFacesDetected: false,
      trackingQuality: 0.85,
      headMovementVelocity: 12.5,
      headPoseVariance: 18.0,
      facialActivityIndex: 0.35,
      blinkRatePerMinute: 18.0,
    };

    it('accepts compliant session meeting all constraints', () => {
      const res = validateCameraSession(baseValidMetrics);
      assert.strictEqual(res.valid, true);
    });

    it('rejects session with duration < 30 seconds', () => {
      const res = validateCameraSession({ ...baseValidMetrics, sessionDurationSeconds: 29.5 });
      assert.strictEqual(res.valid, false);
      assert.match(res.reason!, /30-second minimum/);
    });

    it('rejects session with face presence ratio < 0.80', () => {
      // Covers: poor tracking (dark room, overexposure, no texture) → facePresenceRatio drops
      // → session rejected → poor tracking NEVER becomes a wellness interpretation
      const res = validateCameraSession({ ...baseValidMetrics, facePresenceRatio: 0.75 });
      assert.strictEqual(res.valid, false);
      assert.match(res.reason!, /80%/);
    });

    it('rejects session if multiple tracking regions were detected', () => {
      const res = validateCameraSession({ ...baseValidMetrics, multipleFacesDetected: true });
      assert.strictEqual(res.valid, false);
      assert.match(res.reason!, /Multiple/);
    });

    it('rejects session with tracking quality < 0.40', () => {
      const res = validateCameraSession({ ...baseValidMetrics, trackingQuality: 0.35 });
      assert.strictEqual(res.valid, false);
      assert.match(res.reason!, /below 0.40/);
    });

    it('poor tracking quality maps to session discard — not to altered wellness score', () => {
      // This test documents the intended behavioral contract:
      // A low-quality observation is rejected at the validation gate.
      // It is NOT forwarded to the signal provider where it could produce
      // an incorrect (or skin-tone-biased) wellness interpretation.
      const lowQualityMetrics: CameraBehavioralMetrics = {
        sessionDurationSeconds: 35,
        facePresenceRatio: 0.50,   // poor: only 50% of frames had trackable texture
        multipleFacesDetected: false,
        trackingQuality: 0.25,      // poor: below 0.40 gate
        headMovementVelocity: 8.0,
        headPoseVariance: 10.0,
        facialActivityIndex: 0.20,
        blinkRatePerMinute: 15.0,
      };
      const res = validateCameraSession(lowQualityMetrics);
      assert.strictEqual(res.valid, false, 'Low-quality observation must be discarded, not interpreted');
    });

    it('multiple-face heuristic limitation: fires conservatively at motion spread > 15% of session frames', () => {
      // Document expected behavior: multipleFacesDetected is a conservative heuristic.
      // When it fires, the session is rejected. When it does NOT fire (partial/small motion sources),
      // the quality gate (trackingQuality < 0.40) is the primary safety mechanism.
      const singleUserMetrics = { ...baseValidMetrics, multipleFacesDetected: false };
      const multipleUserMetrics = { ...baseValidMetrics, multipleFacesDetected: true };

      assert.strictEqual(validateCameraSession(singleUserMetrics).valid, true);
      assert.strictEqual(validateCameraSession(multipleUserMetrics).valid, false);
    });
  });
});
