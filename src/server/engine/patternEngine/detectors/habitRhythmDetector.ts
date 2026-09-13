/**
 * Habit Rhythm Pattern Detector
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 *
 * Discovers empirical longitudinal associations between habit ritual actions
 * and subsequent observed wellness dimensions.
 *
 * Strict Non-Causal Mandate:
 * - Correlation only, NEVER causation.
 * - Minimum evidence: >= 5 habit completions across >= 7 distinct days.
 * - Associative language only ("tends to coincide with", "has been observed alongside").
 */

import { randomUUID } from 'node:crypto';
import { NormalizedObservation, PersonalPattern, ThresholdConfig } from '../types';
import { PatternConfidence } from '../confidence';

export function detectHabitRhythms(
  userId: string,
  observations: NormalizedObservation[],
  _thresholds?: ThresholdConfig
): PersonalPattern[] {
  const patterns: PersonalPattern[] = [];

  // Filter habit completion observations
  const habitObs = observations.filter((o) => o.modality === 'habit_action');
  if (habitObs.length < 5) {
    return patterns;
  }

  // Group by distinct days
  const distinctDays = new Set(habitObs.map((o) => o.dateKey));
  if (distinctDays.size < 7) {
    return patterns;
  }

  // Check state observations with dimensions
  const stateObs = observations.filter(
    (o) => o.modality !== 'habit_action' && o.dimensions && Object.keys(o.dimensions).length > 0
  );

  if (stateObs.length < 4) {
    return patterns;
  }

  // Group habit actions by category (found in triggers like 'ritual_mindfulness' or features)
  const categoryMap = new Map<string, NormalizedObservation[]>();
  for (const obs of habitObs) {
    const categoryTrigger = obs.triggers.find((t) => t.startsWith('ritual_')) || 'ritual_general';
    const cleanCat = categoryTrigger.replace('ritual_', '');
    const list = categoryMap.get(cleanCat) || [];
    list.push(obs);
    categoryMap.set(cleanCat, list);
  }

  for (const [category, matchingHabitObs] of categoryMap.entries()) {
    if (matchingHabitObs.length < 5) continue;

    const habitDateKeys = new Set(matchingHabitObs.map((o) => o.dateKey));
    const sameDayStateObs = stateObs.filter((o) => habitDateKeys.has(o.dateKey));
    const otherDayStateObs = stateObs.filter((o) => !habitDateKeys.has(o.dateKey));

    if (sameDayStateObs.length < 3 || otherDayStateObs.length < 2) continue;

    // Compare stress or focus
    const habitStresses = sameDayStateObs
      .map((o) => o.dimensions.stress)
      .filter((v): v is number => typeof v === 'number');
    const otherStresses = otherDayStateObs
      .map((o) => o.dimensions.stress)
      .filter((v): v is number => typeof v === 'number');

    if (habitStresses.length >= 3 && otherStresses.length >= 2) {
      const habitStressAvg = PatternConfidence.mean(habitStresses);
      const otherStressAvg = PatternConfidence.mean(otherStresses);
      const stressDelta = otherStressAvg - habitStressAvg;

      if (stressDelta >= 8) {
        // Lower stress on habit days
        const supportingCount = matchingHabitObs.length;
        const { confidence, strength } = PatternConfidence.calculate({
          sampleSize: observations.length,
          supportingCount,
          effectMagnitude: Math.min(25, stressDelta) / 25,
          targetThreshold: 8,
        });

        const catName = category.charAt(0).toUpperCase() + category.slice(1);
        const title = `${catName} Ritual & Stress Rhythm`;
        const description = `Your ${category} rituals tend to coincide with lower tension ratings on active days (${Math.round(habitStressAvg)} vs ${Math.round(otherStressAvg)} on rest days).`;

        patterns.push({
          id: randomUUID(),
          userId,
          type: 'habit_rhythm_correlation',
          patternKey: `habit_rhythm_${category}_stress`,
          title,
          description,
          confidence,
          strength: stressDelta >= 15 ? 'strong' : strength,
          status: confidence >= 0.70 ? 'validated' : 'candidate',
          firstObservedAt: matchingHabitObs[0].timestamp,
          lastObservedAt: matchingHabitObs[matchingHabitObs.length - 1].timestamp,
          observationCount: observations.length,
          evidence: {
            observationCount: observations.length,
            supportingCount,
            comparisonCount: otherDayStateObs.length,
            supportingTimestamps: matchingHabitObs.map((o) => o.timestamp),
            supportingObservationIds: matchingHabitObs.map((o) => o.id),
            metricKey: 'stress',
            supportingAvg: Number(habitStressAvg.toFixed(1)),
            comparisonAvg: Number(otherStressAvg.toFixed(1)),
            sampleContexts: [`ritual_${category}`],
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
