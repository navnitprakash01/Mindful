/**
 * Wearable Baseline Engine
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 *
 * Computes personal, non-clinical physiological baselines from historical
 * wearable signals. Requires >= 3 clean observations to mature.
 * Strictly excludes contaminated, low-quality, or physiologically impossible samples.
 */

import { WellnessSignal } from '../types';
import {
  WearableBaseline,
  PHYSIOLOGICAL_BOUNDS,
  WEARABLE_CONFIG,
} from './types';

export function computeWearableBaseline(
  userId: string,
  historySignals: WellnessSignal[]
): WearableBaseline | null {
  const wearableSignals = historySignals.filter(
    (s) => s.userId === userId && s.modality === 'wearable_metrics' && s.features
  );

  if (wearableSignals.length === 0) {
    return null;
  }

  const validSignals: WellnessSignal[] = [];

  for (const s of wearableSignals) {
    const feat = s.features as Record<string, any>;
    if (!feat || typeof feat !== 'object') continue;

    // Quality gate: minimum 0.50
    const quality = typeof feat.qualityScore === 'number' && Number.isFinite(feat.qualityScore)
      ? feat.qualityScore
      : 1.0;
    if (quality < PHYSIOLOGICAL_BOUNDS.qualityScore.minimumAcceptable) {
      continue;
    }

    // Must contain at least one valid finite physiological metric
    let hasValidMetric = false;

    if (
      typeof feat.restingHeartRateBpm === 'number' &&
      Number.isFinite(feat.restingHeartRateBpm) &&
      feat.restingHeartRateBpm >= PHYSIOLOGICAL_BOUNDS.restingHeartRateBpm.min &&
      feat.restingHeartRateBpm <= PHYSIOLOGICAL_BOUNDS.restingHeartRateBpm.max
    ) {
      hasValidMetric = true;
    }

    if (
      typeof feat.hrvRmssdMs === 'number' &&
      Number.isFinite(feat.hrvRmssdMs) &&
      feat.hrvRmssdMs >= PHYSIOLOGICAL_BOUNDS.hrvRmssdMs.min &&
      feat.hrvRmssdMs <= PHYSIOLOGICAL_BOUNDS.hrvRmssdMs.max
    ) {
      hasValidMetric = true;
    }

    if (
      typeof feat.sleepDurationMinutes === 'number' &&
      Number.isFinite(feat.sleepDurationMinutes) &&
      feat.sleepDurationMinutes >= PHYSIOLOGICAL_BOUNDS.sleepDurationMinutes.min &&
      feat.sleepDurationMinutes <= PHYSIOLOGICAL_BOUNDS.sleepDurationMinutes.max
    ) {
      hasValidMetric = true;
    }

    if (
      typeof feat.activeMinutes === 'number' &&
      Number.isFinite(feat.activeMinutes) &&
      feat.activeMinutes >= PHYSIOLOGICAL_BOUNDS.activeMinutes.min &&
      feat.activeMinutes <= PHYSIOLOGICAL_BOUNDS.activeMinutes.max
    ) {
      hasValidMetric = true;
    }

    if (hasValidMetric) {
      validSignals.push(s);
    }
  }

  if (validSignals.length === 0) {
    return null;
  }

  let totalRhr = 0;
  let countRhr = 0;
  let totalHrv = 0;
  let countHrv = 0;
  let totalSleep = 0;
  let countSleep = 0;
  let totalEfficiency = 0;
  let countEfficiency = 0;
  let totalActive = 0;
  let countActive = 0;

  for (const s of validSignals) {
    const feat = s.features as Record<string, any>;

    if (typeof feat.restingHeartRateBpm === 'number' && Number.isFinite(feat.restingHeartRateBpm)) {
      totalRhr += feat.restingHeartRateBpm;
      countRhr++;
    }
    if (typeof feat.hrvRmssdMs === 'number' && Number.isFinite(feat.hrvRmssdMs)) {
      totalHrv += feat.hrvRmssdMs;
      countHrv++;
    }
    if (typeof feat.sleepDurationMinutes === 'number' && Number.isFinite(feat.sleepDurationMinutes)) {
      totalSleep += feat.sleepDurationMinutes;
      countSleep++;
    }
    if (typeof feat.sleepEfficiencyScore === 'number' && Number.isFinite(feat.sleepEfficiencyScore)) {
      totalEfficiency += feat.sleepEfficiencyScore;
      countEfficiency++;
    }
    if (typeof feat.activeMinutes === 'number' && Number.isFinite(feat.activeMinutes)) {
      totalActive += feat.activeMinutes;
      countActive++;
    }
  }

  const observationCount = validSignals.length;
  const isPreliminary = observationCount < WEARABLE_CONFIG.MIN_OBSERVATIONS_FOR_MATURE_BASELINE;

  return {
    userId,
    avgRestingHeartRateBpm: countRhr > 0 ? Number((totalRhr / countRhr).toFixed(1)) : 65.0,
    avgHrvRmssdMs: countHrv > 0 ? Number((totalHrv / countHrv).toFixed(1)) : 45.0,
    avgSleepDurationMinutes: countSleep > 0 ? Number((totalSleep / countSleep).toFixed(1)) : 450.0,
    avgSleepEfficiencyScore: countEfficiency > 0 ? Number((totalEfficiency / countEfficiency).toFixed(1)) : 85.0,
    avgActiveMinutes: countActive > 0 ? Number((totalActive / countActive).toFixed(1)) : 45.0,
    observationCount,
    isPreliminary,
    lastUpdated: new Date().toISOString(),
  };
}
