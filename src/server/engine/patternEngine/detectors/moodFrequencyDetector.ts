/**
 * Mood Frequency Pattern Detector
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Detects statistically recurring and dominant emotional states over time.
 * Strictly observational language.
 */

import { randomUUID } from 'node:crypto';
import { NormalizedObservation, PersonalPattern, ThresholdConfig } from '../types';
import { PatternConfidence } from '../confidence';

export function detectMoodFrequency(
  userId: string,
  observations: NormalizedObservation[],
  thresholds: ThresholdConfig
): PersonalPattern[] {
  const patterns: PersonalPattern[] = [];
  const validObservations = observations.filter((o) => typeof o.moodType === 'string' && o.moodType.trim());

  if (validObservations.length < thresholds.minObservationsForFrequency) {
    return patterns;
  }

  // Count mood occurrences
  const moodCounts = new Map<string, NormalizedObservation[]>();
  for (const obs of validObservations) {
    const mood = obs.moodType!.trim();
    const list = moodCounts.get(mood) || [];
    list.push(obs);
    moodCounts.set(mood, list);
  }

  const total = validObservations.length;

  for (const [moodType, matchingObs] of moodCounts.entries()) {
    const count = matchingObs.length;
    const ratio = count / total;

    // A mood is considered dominant if it accounts for at least 40% of observations (minimum 2 out of 3, or 3 out of 5)
    if (ratio >= 0.40 && count >= 2) {
      const effectMagnitude = ratio * 3.0;
      const { confidence, strength } = PatternConfidence.calculate({
        sampleSize: total,
        supportingCount: count,
        stdDev: 0.5,
        effectMagnitude,
        targetThreshold: thresholds.minObservationsForHighConfidence,
      });

      const title = `${moodType} is your most frequent state`;
      const description = `${moodType} has been your most frequently logged mood recently, appearing in ${count} of ${total} recorded check-ins (${Math.round(
        ratio * 100
      )}%).`;

      const timestamps = matchingObs.map((o) => o.timestamp);
      const dates = matchingObs
        .slice(-3)
        .map((o) =>
          new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );

      patterns.push({
        id: randomUUID(),
        userId,
        type: 'mood_frequency',
        patternKey: `mood_frequency_${moodType.toLowerCase()}`,
        title,
        description,
        confidence,
        strength,
        status: 'validated',
        firstObservedAt: timestamps[0],
        lastObservedAt: timestamps[timestamps.length - 1],
        observationCount: total,
        evidence: {
          observationCount: total,
          supportingCount: count,
          comparisonCount: total - count,
          supportingTimestamps: timestamps,
          metricKey: 'moodType',
          supportingAvg: Math.round(ratio * 100),
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
