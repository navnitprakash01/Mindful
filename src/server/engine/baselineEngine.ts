/**
 * Personal Baseline Engine
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 * 
 * Computes deterministic, individual-specific wellness baselines from historical observations.
 * Adheres strictly to the principle: "What is normal for THIS user?"
 * Does not compare users to global populations or fabricate historical points.
 */

import {
  PersonalState,
  PersonalBaseline,
  BaselineDimension,
  StateDimensionKey,
  STATE_DIMENSION_CONFIG,
  NeutralBaseline,
} from './types';

export const BASELINE_CONFIG = {
  MIN_OBSERVATIONS_FOR_BASELINE: 5,
  FULL_CONFIDENCE_OBSERVATIONS: 14,
  MAX_HISTORY_DAYS: 30,
};

export class BaselineEngine {
  private minObservations: number;
  private fullObservations: number;

  constructor(options?: { minObservations?: number; fullObservations?: number }) {
    this.minObservations = options?.minObservations ?? BASELINE_CONFIG.MIN_OBSERVATIONS_FOR_BASELINE;
    this.fullObservations = options?.fullObservations ?? BASELINE_CONFIG.FULL_CONFIDENCE_OBSERVATIONS;
  }

  /**
   * Calculate personal baseline from real recorded historical states.
   * If history is empty or insufficient, flags isPreliminary: true and scales confidence proportionally.
   */
  public calculateBaseline(userId: string, history: PersonalState[]): PersonalBaseline {
    const nowIso = new Date().toISOString();
    const count = history.length;
    const isPreliminary = count < this.minObservations;

    // Confidence scales asymptotically from 0 up to 1.0 based on real observation density
    let overallConfidence = 0.0;
    if (count > 0) {
      const rawConf = Math.min(1.0, count / this.fullObservations);
      // If below minimum threshold, penalize confidence to indicate preliminary status
      overallConfidence = Number((isPreliminary ? rawConf * 0.5 : rawConf).toFixed(2));
    }

    const dimensionKeys: StateDimensionKey[] = [
      'mood',
      'stress',
      'fatigue',
      'energy',
      'focus',
      'cognitiveLoad',
    ];

    const dimensions = {} as Record<StateDimensionKey, BaselineDimension>;

    for (const key of dimensionKeys) {
      const values: number[] = [];

      for (const state of history) {
        // Support both direct accessor state[key] and state.dimensions[key].value
        const val = typeof state[key] === 'number'
          ? state[key]
          : state.dimensions?.[key]?.value;

        if (typeof val === 'number' && !isNaN(val)) {
          values.push(Math.max(0, Math.min(100, val)));
        }
      }

      if (values.length === 0) {
        // Zero observations: return domain default baseline with 0 confidence
        const defaultVal = STATE_DIMENSION_CONFIG[key].neutralDefault;
        dimensions[key] = {
          mean: defaultVal,
          median: defaultVal,
          stdDev: 0,
          observationCount: 0,
          confidence: 0.0,
          isPreliminary: true,
          lastUpdated: nowIso,
        };
      } else {
        const sum = values.reduce((acc, curr) => acc + curr, 0);
        const mean = Number((sum / values.length).toFixed(1));

        // Median calculation
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 !== 0
          ? sorted[mid]
          : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));

        // Standard deviation calculation
        const variance = values.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / values.length;
        const stdDev = Number(Math.sqrt(variance).toFixed(1));

        dimensions[key] = {
          mean,
          median,
          stdDev,
          observationCount: values.length,
          confidence: overallConfidence,
          isPreliminary,
          lastUpdated: nowIso,
        };
      }
    }

    return {
      userId,
      observationCount: count,
      overallConfidence,
      isPreliminary,
      dimensions,
      lastUpdated: nowIso,
    };
  }

  /**
   * Derive a NeutralBaseline numeric vector from a PersonalBaseline
   */
  public toNeutralBaseline(baseline: PersonalBaseline): NeutralBaseline {
    return {
      mood: baseline.dimensions.mood.mean,
      stress: baseline.dimensions.stress.mean,
      fatigue: baseline.dimensions.fatigue.mean,
      energy: baseline.dimensions.energy.mean,
      focus: baseline.dimensions.focus.mean,
      cognitiveLoad: baseline.dimensions.cognitiveLoad.mean,
    };
  }

  /**
   * Calculate deviation and z-score for a current score against a personal baseline dimension
   */
  public calculateDeviation(
    currentValue: number,
    baselineDim: BaselineDimension
  ): { delta: number; zScore: number; significance: 'normal' | 'notable' | 'significant' } {
    const delta = Math.round(currentValue - baselineDim.mean);
    let zScore = 0;
    if (baselineDim.stdDev > 0) {
      zScore = Number(((currentValue - baselineDim.mean) / baselineDim.stdDev).toFixed(2));
    }

    let significance: 'normal' | 'notable' | 'significant' = 'normal';
    if (Math.abs(zScore) >= 2.0 || Math.abs(delta) >= 25) {
      significance = 'significant';
    } else if (Math.abs(zScore) >= 1.0 || Math.abs(delta) >= 12) {
      significance = 'notable';
    }

    return { delta, zScore, significance };
  }
}

export const defaultBaselineEngine = new BaselineEngine();
