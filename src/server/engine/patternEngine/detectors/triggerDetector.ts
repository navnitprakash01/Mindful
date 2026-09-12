/**
 * Trigger Association Pattern Detector
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 *
 * Detects associations between contextual triggers and metric shifts.
 * Strictly observational language — correlation, never causation.
 */

import { randomUUID } from 'node:crypto';
import { NormalizedObservation, PersonalPattern, ThresholdConfig } from '../types';
import { PatternConfidence } from '../confidence';

export function detectTriggerAssociations(
  userId: string,
  observations: NormalizedObservation[],
  thresholds: ThresholdConfig
): PersonalPattern[] {
  const patterns: PersonalPattern[] = [];
  const validObservations = observations.filter((o) => typeof o.energyLevel === 'number');

  if (validObservations.length < thresholds.minObservationsForTriggerAssociation) {
    return patterns;
  }

  // Aggregate observations by trigger
  const triggerMap = new Map<string, NormalizedObservation[]>();
  for (const obs of validObservations) {
    for (const trigger of obs.triggers) {
      const clean = trigger.trim();
      if (!clean) continue;
      const list = triggerMap.get(clean) || [];
      list.push(obs);
      triggerMap.set(clean, list);
    }
  }

  for (const [triggerName, matchingObs] of triggerMap.entries()) {
    // Must meet minimum trigger observation count
    if (matchingObs.length < thresholds.minTriggerSupportingCount) {
      continue;
    }

    const otherObs = validObservations.filter((o) => !o.triggers.includes(triggerName));
    if (otherObs.length < 2) {
      continue;
    }

    const triggerEnergies = matchingObs.map((o) => o.energyLevel!);
    const otherEnergies = otherObs.map((o) => o.energyLevel!);

    const triggerAvg = PatternConfidence.mean(triggerEnergies);
    const otherAvg = PatternConfidence.mean(otherEnergies);
    const diff = otherAvg - triggerAvg;

    // Meaningful difference: >= 1.5 points on 1-10 energy scale
    if (Math.abs(diff) >= 1.5) {
      const isLower = diff > 0;
      const effectMagnitude = Math.abs(diff);
      const supportingCount = matchingObs.length;
      const sampleSize = validObservations.length;
      const stdDev = PatternConfidence.stdDev(triggerEnergies);

      const { confidence, strength } = PatternConfidence.calculate({
        sampleSize,
        supportingCount,
        stdDev,
        effectMagnitude,
        targetThreshold: thresholds.minObservationsForHighConfidence,
      });

      const title = isLower
        ? `Lower energy associated with '${triggerName}'`
        : `Higher energy associated with '${triggerName}'`;

      const description = isLower
        ? `Lower energy has frequently coincided with check-ins where '${triggerName}' was selected (averaging ${triggerAvg.toFixed(
            1
          )}/10 vs ${otherAvg.toFixed(1)}/10 in other check-ins).`
        : `Elevated energy has frequently coincided with check-ins where '${triggerName}' was selected (averaging ${triggerAvg.toFixed(
            1
          )}/10 vs ${otherAvg.toFixed(1)}/10 in other check-ins).`;

      const timestamps = matchingObs.map((o) => o.timestamp);
      const dates = matchingObs
        .slice(-3)
        .map((o) =>
          new Date(o.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        );

      const patternKey = `trigger_${triggerName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      patterns.push({
        id: randomUUID(),
        userId,
        type: 'trigger_association',
        patternKey,
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
          comparisonCount: otherObs.length,
          supportingTimestamps: timestamps,
          supportingObservationIds: matchingObs.map((o) => o.id),
          metricKey: 'energyLevel',
          supportingAvg: Math.round(triggerAvg * 10) / 10,
          comparisonAvg: Math.round(otherAvg * 10) / 10,
          triggerName,
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
