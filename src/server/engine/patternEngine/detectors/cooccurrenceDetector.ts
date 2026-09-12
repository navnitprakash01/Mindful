/**
 * Contextual & Somatic Co-occurrence Pattern Detector
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Detects recurring co-occurrences between physical sensations and contextual triggers.
 * Strictly observational language.
 */

import { randomUUID } from 'node:crypto';
import { NormalizedObservation, PersonalPattern, ThresholdConfig } from '../types';
import { PatternConfidence } from '../confidence';

export function detectCooccurrencePatterns(
  userId: string,
  observations: NormalizedObservation[],
  thresholds: ThresholdConfig
): PersonalPattern[] {
  const patterns: PersonalPattern[] = [];

  if (observations.length < thresholds.minObservationsForTriggerAssociation) {
    return patterns;
  }

  // Count pairs of (trigger, physicalSensation)
  const pairMap = new Map<string, { trigger: string; sensation: string; obs: NormalizedObservation[] }>();

  for (const obs of observations) {
    for (const trig of obs.triggers) {
      for (const sens of obs.physicalSensations) {
        const key = `${trig.trim().toLowerCase()}__${sens.trim().toLowerCase()}`;
        const existing = pairMap.get(key) || { trigger: trig.trim(), sensation: sens.trim(), obs: [] };
        existing.obs.push(obs);
        pairMap.set(key, existing);
      }
    }
  }

  for (const [, pair] of pairMap.entries()) {
    // Requires at least 3 co-occurrences
    if (pair.obs.length >= thresholds.minTriggerSupportingCount) {
      const triggerTotal = observations.filter((o) => o.triggers.includes(pair.trigger)).length;
      const cooccurrenceRatio = pair.obs.length / Math.max(triggerTotal, 1);

      if (cooccurrenceRatio >= 0.5) {
        const { confidence, strength } = PatternConfidence.calculate({
          sampleSize: triggerTotal,
          supportingCount: pair.obs.length,
          stdDev: 0.8,
          effectMagnitude: cooccurrenceRatio * 2.5,
          targetThreshold: thresholds.minObservationsForHighConfidence,
        });

        const title = `'${pair.sensation}' frequently coincides with '${pair.trigger}'`;
        const description = `The physical sensation '${pair.sensation}' appeared in ${pair.obs.length} of ${triggerTotal} check-ins where '${pair.trigger}' was recorded.`;

        const timestamps = pair.obs.map((o) => o.timestamp);
        const dates = pair.obs
          .slice(-3)
          .map((o) =>
            new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          );

        const patternKey = `cooccur_${pair.trigger.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${pair.sensation.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        patterns.push({
          id: randomUUID(),
          userId,
          type: 'context_somatic_cooccurrence',
          patternKey,
          title,
          description,
          confidence,
          strength,
          status: 'validated',
          firstObservedAt: timestamps[0],
          lastObservedAt: timestamps[timestamps.length - 1],
          observationCount: triggerTotal,
          evidence: {
            observationCount: triggerTotal,
            supportingCount: pair.obs.length,
            comparisonCount: triggerTotal - pair.obs.length,
            supportingTimestamps: timestamps,
            supportingObservationIds: pair.obs.map((o) => o.id),
            metricKey: 'cooccurrence',
            supportingAvg: Math.round(cooccurrenceRatio * 100),
            triggerName: pair.trigger,
            sampleContexts: dates,
          },
          deterministicTitle: title,
          deterministicDescription: description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return patterns;
}
