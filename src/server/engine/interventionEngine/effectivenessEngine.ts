/**
 * Intervention Effectiveness & Outcome Engine
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Deterministic aggregation of intervention outcomes, dimension deltas,
 * completion rates, and strictly non-causal longitudinal effectiveness summaries.
 */

import { StateDimensionKey, STATE_DIMENSION_CONFIG } from '../types';
import { INTERVENTION_LIBRARY } from './library';
import {
  DimensionEffectiveness,
  InterventionEffectiveness,
  InterventionSession,
} from './types';

/**
 * Computes exact mathematical delta for each dimension:
 * delta = post - pre
 */
export function computeSessionDeltas(
  preState: Record<StateDimensionKey, number>,
  postState: Record<StateDimensionKey, number>
): Partial<Record<StateDimensionKey, number>> {
  const deltas: Partial<Record<StateDimensionKey, number>> = {};

  const dimensions = Object.keys(STATE_DIMENSION_CONFIG) as StateDimensionKey[];
  for (const dim of dimensions) {
    if (typeof preState[dim] === 'number' && typeof postState[dim] === 'number') {
      // Rounded to 1 decimal place
      deltas[dim] = Number((postState[dim] - preState[dim]).toFixed(1));
    }
  }

  return deltas;
}

/**
 * Determines whether a delta represents a favorable / positive well-being shift
 * based on dimension polarity (higherIsPositive).
 */
export function isFavorableShift(dimension: StateDimensionKey, delta: number): boolean {
  const config = STATE_DIMENSION_CONFIG[dimension];
  if (!config) return delta > 0;

  // If higher is positive (mood, energy, focus): delta > 0 is favorable
  // If higher is negative (stress, fatigue, cognitiveLoad): delta < 0 is favorable
  return config.higherIsPositive ? delta > 0 : delta < 0;
}

/**
 * Evaluates effectiveness metrics and non-causal summary for a single intervention.
 */
export function calculateInterventionEffectiveness(
  interventionId: string,
  sessions: InterventionSession[]
): InterventionEffectiveness {
  const def = INTERVENTION_LIBRARY[interventionId];
  const interventionSessions = sessions.filter((s) => s.interventionId === interventionId);

  const attemptsCount = interventionSessions.length;
  const completedSessions = interventionSessions.filter((s) => s.status === 'completed');
  const completedCount = completedSessions.length;
  const completionRate = attemptsCount > 0 ? Number((completedCount / attemptsCount).toFixed(2)) : 0;

  // Average usefulness calculation (ratings are 1-5)
  let sumUsefulness = 0;
  let ratedCount = 0;
  for (const s of completedSessions) {
    if (typeof s.perceivedUsefulness === 'number' && s.perceivedUsefulness >= 1 && s.perceivedUsefulness <= 5) {
      sumUsefulness += s.perceivedUsefulness;
      ratedCount++;
    }
  }
  const avgUsefulness = ratedCount > 0 ? Number((sumUsefulness / ratedCount).toFixed(1)) : null;

  // Target dimension stats
  const targetDims: StateDimensionKey[] = def ? def.targetDimensions : ['stress', 'mood'];
  const dimensionStats: Partial<Record<StateDimensionKey, DimensionEffectiveness>> = {};

  for (const dim of targetDims) {
    let deltaSum = 0;
    let favorableCount = 0;
    let dimSessionsCount = 0;

    for (const s of completedSessions) {
      if (s.dimensionDeltas && typeof s.dimensionDeltas[dim] === 'number') {
        const delta = s.dimensionDeltas[dim]!;
        deltaSum += delta;
        dimSessionsCount++;
        if (isFavorableShift(dim, delta)) {
          favorableCount++;
        }
      }
    }

    if (dimSessionsCount > 0) {
      dimensionStats[dim] = {
        targetDimension: dim,
        avgDelta: Number((deltaSum / dimSessionsCount).toFixed(1)),
        positiveShiftCount: favorableCount,
        totalSessions: dimSessionsCount,
      };
    }
  }

  // Generate factual non-causal summary
  const hasEnoughHistory = completedCount >= 3;
  let factualSummary = 'Not enough completed sessions yet to evaluate individual trends.';

  if (completedCount > 0) {
    const primaryDim = targetDims[0];
    const stats = dimensionStats[primaryDim];

    if (stats && stats.totalSessions >= 2) {
      const config = STATE_DIMENSION_CONFIG[primaryDim];
      const directionWord = stats.avgDelta < 0 ? 'reduction' : 'increase';
      const absDelta = Math.abs(stats.avgDelta);

      factualSummary = `In ${stats.positiveShiftCount} of ${stats.totalSessions} sessions, this reset was followed by a ${directionWord} in ${config?.label || primaryDim} (average shift: ${stats.avgDelta > 0 ? '+' : ''}${stats.avgDelta} pts).`;
    } else if (avgUsefulness !== null) {
      factualSummary = `Completed ${completedCount} time${completedCount > 1 ? 's' : ''} with an average perceived usefulness of ${avgUsefulness}/5.`;
    } else {
      factualSummary = `Completed ${completedCount} time${completedCount > 1 ? 's' : ''}. Complete post-check-ins to view personalized shifts.`;
    }
  }

  return {
    interventionId,
    attemptsCount,
    completedCount,
    completionRate,
    avgUsefulness,
    dimensionStats,
    factualSummary,
    hasEnoughHistory,
  };
}

/**
 * Calculates effectiveness across all known interventions in the library.
 */
export function calculateAllInterventionsEffectiveness(
  sessions: InterventionSession[]
): Record<string, InterventionEffectiveness> {
  const result: Record<string, InterventionEffectiveness> = {};

  for (const id of Object.keys(INTERVENTION_LIBRARY)) {
    result[id] = calculateInterventionEffectiveness(id, sessions);
  }

  return result;
}
