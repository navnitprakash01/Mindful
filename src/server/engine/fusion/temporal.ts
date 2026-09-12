/**
 * Temporal Epoch Stratification & Decay Engine
 * Mindful 2.0 — Phase 5: Multimodal State Fusion
 *
 * Implements deterministic temporal epoch categorization and decay weighting:
 * - IMMEDIATE: <= 45 minutes (0.75h) - Peak weight, freshest user state
 * - RECENT: 45m to 6.0 hours - Active contextual state
 * - HISTORICAL: 6.0h to 48.0 hours - Contextual baseline and gentle trajectory
 * - EXPIRED: > 48.0 hours - 0.0 weight
 */

import { WellnessSignal } from '../types';
import { TemporalEpoch, TemporalSignal } from './types';

export const TEMPORAL_CONFIG = {
  IMMEDIATE_THRESHOLD_HOURS: 0.75, // 45 minutes
  RECENT_THRESHOLD_HOURS: 6.0,     // 6 hours
  MAX_SIGNAL_AGE_HOURS: 48.0,      // 48 hours
  HALF_LIFE_HOURS: 12.0,           // Standard 12-hour exponential half-life
};

/**
 * Calculate elapsed age in fractional hours from signal timestamp to reference time
 */
export function getSignalAgeHours(signalTimestamp: string, referenceTime: Date = new Date()): number {
  const signalTime = new Date(signalTimestamp).getTime();
  const refTime = referenceTime.getTime();
  if (isNaN(signalTime) || isNaN(refTime)) {
    return 0;
  }
  const diffMs = Math.max(0, refTime - signalTime);
  return diffMs / (1000 * 60 * 60);
}

/**
 * Classify a signal's age into deterministic temporal epochs
 */
export function classifyTemporalEpoch(ageHours: number): TemporalEpoch | 'expired' {
  if (ageHours > TEMPORAL_CONFIG.MAX_SIGNAL_AGE_HOURS) {
    return 'expired';
  }
  if (ageHours <= TEMPORAL_CONFIG.IMMEDIATE_THRESHOLD_HOURS) {
    return 'immediate';
  }
  if (ageHours <= TEMPORAL_CONFIG.RECENT_THRESHOLD_HOURS) {
    return 'recent';
  }
  return 'historical';
}

/**
 * Compute exponential time-decay weight and assign temporal epoch
 */
export function computeTemporalDecay(
  signal: WellnessSignal,
  referenceTime: Date = new Date(),
  halfLifeHours: number = TEMPORAL_CONFIG.HALF_LIFE_HOURS,
  maxAgeHours: number = TEMPORAL_CONFIG.MAX_SIGNAL_AGE_HOURS
): TemporalSignal | null {
  const ageHours = getSignalAgeHours(signal.timestamp, referenceTime);

  if (ageHours >= maxAgeHours) {
    return null;
  }

  const epoch = classifyTemporalEpoch(ageHours);
  if (epoch === 'expired') {
    return null;
  }

  // Base reliability weight
  const reliability = typeof signal.reliabilityWeight === 'number' && !isNaN(signal.reliabilityWeight)
    ? Math.max(0, Math.min(1.0, signal.reliabilityWeight))
    : 1.0;

  // Standard exponential decay factor: 2^(-age / halfLife)
  const decayFactor = Math.pow(0.5, ageHours / halfLifeHours);
  const decayWeight = Math.max(0, reliability * decayFactor);

  if (decayWeight <= 0.01) {
    return null;
  }

  return {
    signal,
    decayWeight,
    epoch,
    ageHours,
  };
}

/**
 * Filter and stratify an array of signals by temporal epoch
 */
export function stratifySignals(
  signals: WellnessSignal[],
  referenceTime: Date = new Date(),
  halfLifeHours: number = TEMPORAL_CONFIG.HALF_LIFE_HOURS,
  maxAgeHours: number = TEMPORAL_CONFIG.MAX_SIGNAL_AGE_HOURS
): TemporalSignal[] {
  const result: TemporalSignal[] = [];
  for (const signal of signals) {
    const temporalSignal = computeTemporalDecay(signal, referenceTime, halfLifeHours, maxAgeHours);
    if (temporalSignal) {
      result.push(temporalSignal);
    }
  }
  return result;
}
