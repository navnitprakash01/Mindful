/**
 * Voice Audio Analyzer Unit Tests
 * Mindful 2.0 — Phase 4: Advanced Voice Intelligence
 *
 * Validates deterministic acoustic metrics calculations:
 * - Empty / zero duration inputs
 * - Pure silence detection
 * - Pause detection and pause ratio calculations
 * - Speech rate WPM derivation from transcript
 * - Normalized vocal energy and confidence boundaries
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAcousticMetrics } from '../src/lib/voice/audioAnalyzer';

describe('Voice Audio Analyzer — Pure Deterministic Metrics Calculations', () => {
  const frameDuration = 0.05; // 50ms per evaluation frame

  it('handles empty frames array safely without crashing or returning NaN', () => {
    const metrics = calculateAcousticMetrics([], frameDuration);

    assert.strictEqual(metrics.audioDurationSeconds, 0);
    assert.strictEqual(metrics.speechDurationSeconds, 0);
    assert.strictEqual(metrics.pauseCount, 0);
    assert.strictEqual(metrics.pauseRatio, 0);
    assert.strictEqual(metrics.vocalEnergy, 0);
    assert.strictEqual(metrics.confidence, 0);
    assert.strictEqual(isNaN(metrics.quality), false);
  });

  it('detects pure silence and classifies entire duration as pauses', () => {
    // 40 frames of 0.005 RMS (below default 0.015 silence threshold) = 2.0s
    const silentFrames = Array(40).fill(0.005);
    const metrics = calculateAcousticMetrics(silentFrames, frameDuration, 'hello world');

    assert.strictEqual(metrics.audioDurationSeconds, 2.0);
    assert.strictEqual(metrics.speechDurationSeconds, 0);
    assert.ok(metrics.pauseDurationSeconds > 0);
    assert.strictEqual(metrics.pauseRatio, 1.0);
    assert.strictEqual(metrics.vocalEnergy < 0.1, true);
  });

  it('accurately computes pause count and pause ratio with alternating speech/silence', () => {
    // Sequence: 20 speech frames (1.0s), 10 silence frames (0.5s pause), 20 speech frames (1.0s)
    // Total: 50 frames = 2.5s
    const frames: number[] = [
      ...Array(20).fill(0.08), // Speech (above 0.015)
      ...Array(10).fill(0.002), // Pause (0.5s >= 250ms threshold)
      ...Array(20).fill(0.08), // Speech
    ];

    const metrics = calculateAcousticMetrics(frames, frameDuration);

    assert.strictEqual(metrics.audioDurationSeconds, 2.5);
    assert.strictEqual(metrics.speechDurationSeconds, 2.0);
    assert.strictEqual(metrics.pauseCount, 1);
    assert.strictEqual(metrics.pauseDurationSeconds, 0.5);
    assert.strictEqual(metrics.pauseRatio, 0.2); // 0.5 / 2.5
    assert.ok(metrics.vocalEnergy > 0.15);
  });

  it('calculates realistic speech rate (WPM) when transcript is provided', () => {
    // 60 speech frames at 50ms = 3.0 seconds of active speech = 0.05 minutes
    // 10 words in 0.05 minutes = 200 WPM
    const speechFrames = Array(60).fill(0.07);
    const transcript = 'I am reflecting on how peaceful this morning walk was';
    // 10 words

    const metrics = calculateAcousticMetrics(speechFrames, frameDuration, transcript);

    assert.ok(metrics.speechRateWpm !== undefined);
    assert.ok(metrics.speechRateWpm >= 180 && metrics.speechRateWpm <= 220);
  });

  it('clamps speech rate WPM strictly within human physiological bounds [20, 450]', () => {
    // Unrealistic 100 words in 1 second
    const shortFrames = Array(20).fill(0.07); // 1 second
    const hugeTranscript = Array(100).fill('word').join(' ');

    const metrics = calculateAcousticMetrics(shortFrames, frameDuration, hugeTranscript);

    assert.ok(metrics.speechRateWpm !== undefined);
    assert.strictEqual(metrics.speechRateWpm, 450); // Clamped at 450
  });

  it('scales engineering confidence with duration and quality', () => {
    // Short 2-second speech
    const shortFrames = Array(40).fill(0.05);
    const shortMetrics = calculateAcousticMetrics(shortFrames, frameDuration);

    // Longer 10-second speech with clear vocal energy
    const longFrames = Array(200).fill(0.08);
    const longMetrics = calculateAcousticMetrics(longFrames, frameDuration);

    assert.ok(longMetrics.confidence > shortMetrics.confidence);
    assert.ok(longMetrics.confidence <= 0.85); // Voice inference does not exceed 0.85
  });
});
