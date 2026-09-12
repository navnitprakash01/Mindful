/**
 * Temporal Rhythm Pattern Detector
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Detects diurnal (morning vs evening) and day-of-week variations.
 * Strictly observational language — correlation, never causation.
 */

import { randomUUID } from 'node:crypto';
import { NormalizedObservation, PersonalPattern, ThresholdConfig } from '../types';
import { PatternConfidence } from '../confidence';

export function detectTemporalPatterns(
  userId: string,
  observations: NormalizedObservation[],
  thresholds: ThresholdConfig
): PersonalPattern[] {
  const patterns: PersonalPattern[] = [];
  const validObservations = observations.filter((o) => typeof o.energyLevel === 'number');

  if (validObservations.length < thresholds.minObservationsForTemporalRhythm) {
    return patterns;
  }

  // Segment observations by time of day:
  // Evening: 18:00 - 23:59 (hour >= 18)
  // Morning/Daytime: 05:00 - 17:59 (hour >= 5 && hour < 18)
  const eveningObs = validObservations.filter((o) => o.hourOfDay >= 18 || o.hourOfDay < 4);
  const dayObs = validObservations.filter((o) => o.hourOfDay >= 5 && o.hourOfDay < 18);

  if (
    eveningObs.length >= thresholds.minTemporalSupportingCount &&
    dayObs.length >= 2
  ) {
    const eveningEnergies = eveningObs.map((o) => o.energyLevel!);
    const dayEnergies = dayObs.map((o) => o.energyLevel!);

    const eveningAvg = PatternConfidence.mean(eveningEnergies);
    const dayAvg = PatternConfidence.mean(dayEnergies);
    const diff = dayAvg - eveningAvg;

    // Significant contrast: >= 1.5 points difference on a 1-10 scale
    if (Math.abs(diff) >= 1.5) {
      const isEveningLower = diff > 0;
      const effectMagnitude = Math.abs(diff);
      const supportingCount = eveningObs.length;
      const sampleSize = validObservations.length;
      const stdDev = PatternConfidence.stdDev(eveningEnergies);

      const { confidence, strength } = PatternConfidence.calculate({
        sampleSize,
        supportingCount,
        stdDev,
        effectMagnitude,
        targetThreshold: thresholds.minObservationsForHighConfidence,
      });

      const title = isEveningLower
        ? 'Lower energy observed in evening check-ins'
        : 'Higher energy observed in evening check-ins';

      const description = isEveningLower
        ? `Lower energy has been observed more often in your recent evening check-ins (averaging ${eveningAvg.toFixed(
            1
          )}/10 vs ${dayAvg.toFixed(1)}/10 during daytime).`
        : `Elevated energy has been observed more often in your recent evening check-ins (averaging ${eveningAvg.toFixed(
            1
          )}/10 vs ${dayAvg.toFixed(1)}/10 during daytime).`;

      const timestamps = eveningObs.map((o) => o.timestamp);
      const dates = eveningObs
        .slice(-3)
        .map((o) =>
          new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );

      patterns.push({
        id: randomUUID(),
        userId,
        type: 'temporal_rhythm',
        patternKey: 'temporal_evening_energy',
        title,
        description,
        confidence,
        strength,
        status: 'validated',
        firstObservedAt: timestamps[0],
        lastObservedAt: timestamps[timestamps.length - 1],
        observationCount: validObservations.length,
        evidence: {
          observationCount: validObservations.length,
          supportingCount,
          comparisonCount: dayObs.length,
          supportingTimestamps: timestamps,
          metricKey: 'energyLevel',
          supportingAvg: Math.round(eveningAvg * 10) / 10,
          comparisonAvg: Math.round(dayAvg * 10) / 10,
          temporalContext: 'Evening (6:00 PM – Midnight)',
          sampleContexts: dates,
        },
        deterministicTitle: title,
        deterministicDescription: description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return patterns;
}
