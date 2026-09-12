/**
 * Energy Trajectory & Variability Pattern Detector
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Detects directional energy trends (upward/downward) and notable variability over time.
 * Strictly observational language.
 */

import { randomUUID } from 'node:crypto';
import { NormalizedObservation, PersonalPattern, ThresholdConfig } from '../types';
import { PatternConfidence } from '../confidence';

export function detectEnergyTrajectory(
  userId: string,
  observations: NormalizedObservation[],
  thresholds: ThresholdConfig
): PersonalPattern[] {
  const patterns: PersonalPattern[] = [];
  const validObservations = observations.filter((o) => typeof o.energyLevel === 'number');

  if (validObservations.length < thresholds.minObservationsForTrajectory) {
    return patterns;
  }

  const energies = validObservations.map((o) => o.energyLevel!);
  const count = energies.length;

  // 1. Directional Trajectory Analysis
  // Compare the first half of observations with the second half
  const mid = Math.floor(count / 2);
  const firstHalf = energies.slice(0, mid);
  const secondHalf = energies.slice(mid);

  const firstAvg = PatternConfidence.mean(firstHalf);
  const secondAvg = PatternConfidence.mean(secondHalf);
  const delta = secondAvg - firstAvg;

  if (Math.abs(delta) >= 1.5) {
    const isUpward = delta > 0;
    const effectMagnitude = Math.abs(delta);
    const stdDev = PatternConfidence.stdDev(energies);

    const { confidence, strength } = PatternConfidence.calculate({
      sampleSize: count,
      supportingCount: secondHalf.length,
      stdDev,
      effectMagnitude,
      targetThreshold: thresholds.minObservationsForHighConfidence,
    });

    const title = isUpward ? 'Energy is trending upward' : 'Energy is trending downward';
    const description = isUpward
      ? `Your energy levels have shown an upward trajectory across recent check-ins (averaging ${secondAvg.toFixed(
          1
        )}/10 recently compared to ${firstAvg.toFixed(1)}/10 previously).`
      : `Your energy levels have shown a downward trajectory across recent check-ins (averaging ${secondAvg.toFixed(
          1
        )}/10 recently compared to ${firstAvg.toFixed(1)}/10 previously).`;

    const timestamps = validObservations.map((o) => o.timestamp);
    const dates = validObservations
      .slice(-3)
      .map((o) =>
        new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );

    patterns.push({
      id: randomUUID(),
      userId,
      type: 'energy_trajectory',
      patternKey: 'energy_trajectory_direction',
      title,
      description,
      confidence,
      strength,
      status: 'validated',
      firstObservedAt: timestamps[0],
      lastObservedAt: timestamps[timestamps.length - 1],
      observationCount: count,
      evidence: {
        observationCount: count,
        supportingCount: secondHalf.length,
        comparisonCount: firstHalf.length,
        supportingTimestamps: timestamps,
        supportingObservationIds: validObservations.slice(mid).map((o) => o.id),
        metricKey: 'energyLevel',
        supportingAvg: Math.round(secondAvg * 10) / 10,
        comparisonAvg: Math.round(firstAvg * 10) / 10,
        sampleContexts: dates,
      },
      deterministicTitle: title,
      deterministicDescription: description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. High Energy Variability Analysis
  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);
  const variance = maxEnergy - minEnergy;

  if (variance >= 4) {
    const stdDev = PatternConfidence.stdDev(energies);
    const { confidence, strength } = PatternConfidence.calculate({
      sampleSize: count,
      supportingCount: count,
      stdDev,
      effectMagnitude: variance / 2,
      targetThreshold: thresholds.minObservationsForHighConfidence,
    });

    const title = 'High energy variability';
    const description = `Your energy has varied significantly across recent check-ins, ranging from ${minEnergy}/10 to ${maxEnergy}/10 (standard deviation ${stdDev.toFixed(
      1
    )}).`;

    const timestamps = validObservations.map((o) => o.timestamp);
    const dates = validObservations
      .slice(-3)
      .map((o) =>
        new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      );

    patterns.push({
      id: randomUUID(),
      userId,
      type: 'energy_trajectory',
      patternKey: 'energy_trajectory_variability',
      title,
      description,
      confidence,
      strength,
      status: 'validated',
      firstObservedAt: timestamps[0],
      lastObservedAt: timestamps[timestamps.length - 1],
      observationCount: count,
      evidence: {
        observationCount: count,
        supportingCount: count,
        comparisonCount: 0,
        supportingTimestamps: timestamps,
        supportingObservationIds: validObservations.map((o) => o.id),
        metricKey: 'energyLevel',
        supportingAvg: Math.round(PatternConfidence.mean(energies) * 10) / 10,
        sampleContexts: dates,
      },
      deterministicTitle: title,
      deterministicDescription: description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return patterns;
}
