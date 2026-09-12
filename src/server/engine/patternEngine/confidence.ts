/**
 * Pattern Confidence Calculator
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Computes transparent, deterministic confidence scores based on sample size,
 * recurrence frequency, consistency (dispersion), and effect magnitude.
 * Clamped to [0.15, 0.95] to prevent false claims of clinical certainty.
 */

import { PatternStrength } from './types';

export interface ConfidenceInput {
  sampleSize: number; // Total relevant observations (e.g. 5)
  supportingCount: number; // Observations showing the pattern (e.g. 4)
  stdDev?: number; // Standard deviation within supporting observations
  effectMagnitude?: number; // Absolute difference between target and comparison means (e.g. 2.5)
  targetThreshold?: number; // Target benchmark count for mature patterns (default 8)
}

export const PatternConfidence = {
  /**
   * Calculate deterministic confidence score between 0.15 and 0.95
   */
  calculate(input: ConfidenceInput): { confidence: number; strength: PatternStrength } {
    const {
      sampleSize,
      supportingCount,
      stdDev = 1.0,
      effectMagnitude = 1.5,
      targetThreshold = 8,
    } = input;

    if (sampleSize <= 0 || supportingCount <= 0) {
      return { confidence: 0.15, strength: 'mild' };
    }

    // 1. Sample Size Factor (0.2 to 1.0)
    const sampleFactor = Math.min(1.0, Math.max(0.2, sampleSize / targetThreshold));

    // 2. Recurrence Factor (ratio of supporting observations, weighted by sample size)
    const recurrenceRatio = supportingCount / Math.max(sampleSize, 1);
    const sampleDampener = Math.min(1.0, sampleSize / 2);
    const recurrenceFactor = Math.min(1.0, Math.max(0.1, recurrenceRatio * sampleDampener));

    // 3. Consistency Factor (inverse of dispersion, normalized)
    // Low stdDev (< 1.5) yields higher consistency
    const consistencyFactor = Math.min(1.0, Math.max(0.2, 1.0 - Math.min(1.0, stdDev / 4.0)));

    // 4. Magnitude Factor (difference magnitude between groups)
    // E.g. difference of 3+ points on a 1-10 scale represents a notable contrast
    const magnitudeFactor = Math.min(1.0, Math.max(0.2, effectMagnitude / 3.0));

    // Weighted linear combination
    const raw =
      0.35 * sampleFactor +
      0.30 * recurrenceFactor +
      0.20 * consistencyFactor +
      0.15 * magnitudeFactor;

    // Clamped strictly to [0.15, 0.95]
    const clamped = Math.min(0.95, Math.max(0.15, Math.round(raw * 100) / 100));

    let strength: PatternStrength = 'mild';
    if (clamped >= 0.70) {
      strength = 'strong';
    } else if (clamped >= 0.55) {
      strength = 'moderate';
    }

    return { confidence: clamped, strength };
  },

  /**
   * Helper: calculate mean of a number array
   */
  mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  },

  /**
   * Helper: calculate sample standard deviation of a number array
   */
  stdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const sumSquares = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0);
    return Math.sqrt(sumSquares / (values.length - 1));
  },
};
