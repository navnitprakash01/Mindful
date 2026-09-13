/**
 * Weekly Digest Builder
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting & Weekly Digest
 *
 * Implements the authoritative retrospective synthesis pipeline.
 * - Aggregates weekly state metrics, deltas, and mood histograms
 * - Synthesizes retrospective effectiveness summaries ("What Helped")
 * - Synthesizes retrospective habit consistency ("Habit Continuity")
 * - Embeds current forecast snapshot from ForecastEngine
 * - Non-clinical, non-diagnostic framing with deterministic fallback
 * - Reuses existing geminiClient with 3000ms timeout and context firewall
 */

import { randomUUID } from 'node:crypto';
import { geminiClient } from '../../services/geminiClient';
import { ForecastDimension } from '../forecastEngine/types';
import {
  WeeklyDigest,
  WeeklyRetrospective,
  DigestGenerationInput,
  HelpfulInterventionSummary,
  HabitContinuitySummary,
  MoodFrequencyItem,
} from './types';
import { INTERVENTION_LIBRARY } from '../interventionEngine/library';

const LIMITATIONS_NOTICE =
  'Weekly digest observations reflect aggregated self-report, somatic, and behavioral telemetry. ' +
  'They do not constitute a clinical diagnosis, medical evaluation, or psychological prediction.';

function roundToOne(num: number): number {
  return Math.round(num * 10) / 10;
}

/**
 * Computes average of dimension across states.
 */
function computeAverage(states: any[], dim: ForecastDimension, defaultVal: number): number {
  if (!states || states.length === 0) return defaultVal;
  const values = states
    .map((s) => s[dim])
    .filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (values.length === 0) return defaultVal;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return roundToOne(sum / values.length);
}

/**
 * Builds retrospective mood frequency distribution from states or check-ins.
 */
function buildMoodDistribution(states: any[]): MoodFrequencyItem[] {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const s of states) {
    let moodName: string | undefined;
    if (typeof s.moodName === 'string') {
      moodName = s.moodName;
    } else if (s.features && typeof s.features.sentimentSummary === 'string') {
      moodName = s.features.sentimentSummary;
    } else if (typeof s.mood === 'number') {
      if (s.mood >= 75) moodName = 'Elevated';
      else if (s.mood >= 60) moodName = 'Balanced';
      else if (s.mood >= 45) moodName = 'Subdued';
      else moodName = 'Depleted';
    }

    if (moodName) {
      counts[moodName] = (counts[moodName] || 0) + 1;
      total++;
    }
  }

  if (total === 0) {
    return [];
  }

  return Object.entries(counts)
    .map(([mood, frequency]) => ({
      mood,
      frequency,
      percentage: Math.round((frequency / total) * 100),
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

/**
 * Summarizes completed interventions retrospectively ("What Helped").
 */
function buildWhatHelped(sessions: any[]): HelpfulInterventionSummary[] {
  if (!sessions || sessions.length === 0) return [];

  const completed = sessions.filter((s) => s.status === 'completed');
  const grouped: Record<string, { count: number; deltas: number[] }> = {};

  for (const s of completed) {
    const intId = s.interventionId || 'somatic_breathing';
    if (!grouped[intId]) {
      grouped[intId] = { count: 0, deltas: [] };
    }
    grouped[intId].count++;

    // Calculate recovery delta (pre - post for stress, post - pre for energy/focus)
    if (s.dimensionDeltas) {
      if (typeof s.dimensionDeltas.stress === 'number') {
        grouped[intId].deltas.push(-s.dimensionDeltas.stress); // Negative delta in stress is positive recovery
      } else if (typeof s.dimensionDeltas.energy === 'number') {
        grouped[intId].deltas.push(s.dimensionDeltas.energy);
      }
    }
  }

  const results: HelpfulInterventionSummary[] = [];

  for (const [intId, data] of Object.entries(grouped)) {
    const libEntry = INTERVENTION_LIBRARY[intId];
    const title = libEntry?.title || intId.replace(/_/g, ' ');
    const avgDelta = data.deltas.length > 0
      ? roundToOne(data.deltas.reduce((a, b) => a + b, 0) / data.deltas.length)
      : 0.0;

    results.push({
      interventionType: intId,
      title,
      sessionCount: data.count,
      averageRecoveryDelta: avgDelta,
      primaryDimension: libEntry?.targetDimensions?.[0] || 'stress',
    });
  }

  return results.sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * Summarizes habit continuity retrospectively.
 */
function buildHabitContinuity(habits: any[]): HabitContinuitySummary {
  if (!habits || habits.length === 0) {
    return {
      totalScheduled: 0,
      totalCompleted: 0,
      overallConsistencyScore: 0.0,
      activeHabitsCount: 0,
      longestStreak: 0,
      restDaysRespected: 0,
    };
  }

  let totalCompleted = 0;
  let totalScheduled = 0;
  let longestStreak = 0;

  for (const h of habits) {
    const completedCount = Array.isArray(h.completedDates) ? h.completedDates.length : 0;
    totalCompleted += completedCount;
    totalScheduled += h.targetFrequency || 7;
    if (typeof h.bestStreak === 'number' && h.bestStreak > longestStreak) {
      longestStreak = h.bestStreak;
    } else if (typeof h.streak === 'number' && h.streak > longestStreak) {
      longestStreak = h.streak;
    }
  }

  const score = totalScheduled > 0 ? roundToOne(Math.min(1.0, totalCompleted / totalScheduled)) : 0.0;

  return {
    totalScheduled,
    totalCompleted,
    overallConsistencyScore: score,
    activeHabitsCount: habits.filter((h) => h.status === 'active').length,
    longestStreak,
    restDaysRespected: habits.filter((h) => h.preferredTimeWindow === 'rest_day').length,
  };
}

/**
 * Builds deterministic retrospective narrative.
 */
function buildDeterministicNarrative(
  averages: Record<ForecastDimension, number>,
  deltas: Record<ForecastDimension, number>,
  whatHelped: HelpfulInterventionSummary[],
  habitSummary: HabitContinuitySummary
): string {
  const energyDeltaStr = deltas.energy !== 0 ? ` (${deltas.energy > 0 ? '+' : ''}${deltas.energy} pts vs prior week)` : '';
  const stressDeltaStr = deltas.stress !== 0 ? ` (${deltas.stress > 0 ? '+' : ''}${deltas.stress} pts vs prior week)` : '';

  let narrative = `This week, your energy averaged ${averages.energy}${energyDeltaStr}, while stress averaged ${averages.stress}${stressDeltaStr}, and focus remained at ${averages.focus}. `;

  if (whatHelped.length > 0) {
    const topHelper = whatHelped[0];
    narrative += `Your ${topHelper.sessionCount} completed ${topHelper.title} session(s) correlated with positive state stabilization. `;
  }

  if (habitSummary.activeHabitsCount > 0) {
    narrative += `You maintained ${habitSummary.totalCompleted} completed ritual actions across ${habitSummary.activeHabitsCount} active habits.`;
  }

  return narrative.trim();
}

export const weeklyDigestBuilder = {
  /**
   * Constructs a complete WeeklyDigest object.
   */
  async buildWeeklyDigest(input: DigestGenerationInput): Promise<WeeklyDigest> {
    const evalTime = input.evaluationTime || new Date();
    const states = input.currentWeekStates || [];
    const priorStates = input.priorWeekStates || [];

    // 1. Calculate continuous dimension averages
    const currentAverages: Record<ForecastDimension, number> = {
      energy: computeAverage(states, 'energy', 65.0),
      stress: computeAverage(states, 'stress', 30.0),
      focus: computeAverage(states, 'focus', 70.0),
    };

    // 2. Calculate deltas vs prior week
    const hasPrior = priorStates.length > 0;
    const stateDeltasVsPriorWeek: Record<ForecastDimension, number> = {
      energy: hasPrior ? roundToOne(currentAverages.energy - computeAverage(priorStates, 'energy', 65.0)) : 0.0,
      stress: hasPrior ? roundToOne(currentAverages.stress - computeAverage(priorStates, 'stress', 30.0)) : 0.0,
      focus: hasPrior ? roundToOne(currentAverages.focus - computeAverage(priorStates, 'focus', 70.0)) : 0.0,
    };

    // 3. Retrospective mood distribution
    const dominantMoods = buildMoodDistribution(states);

    // 4. Retrospective "What Helped" from intervention outcomes
    const whatHelpedInterventions = buildWhatHelped(input.interventionSessions || []);

    // 5. Retrospective Habit Continuity
    const habitContinuity = buildHabitContinuity(input.completedHabits || []);

    // 6. Narrative verbalization
    const deterministicNarrative = buildDeterministicNarrative(
      currentAverages,
      stateDeltasVsPriorWeek,
      whatHelpedInterventions,
      habitContinuity
    );

    let whatChangedNarrative = deterministicNarrative;
    let isAiEnhanced = false;

    // 7. Optional Gemini verbalization through existing provider
    if (input.allowAiEnhancement !== false && process.env.GEMINI_API_KEY) {
      try {
        const factualSummary = {
          week: `${input.weekStartDate} to ${input.weekEndDate}`,
          averages: currentAverages,
          deltas: stateDeltasVsPriorWeek,
          topInterventions: whatHelpedInterventions.slice(0, 2).map((i) => ({ title: i.title, count: i.sessionCount })),
          habitsCompleted: habitContinuity.totalCompleted,
          consistencyRate: `${Math.round(habitContinuity.overallConsistencyScore * 100)}%`,
        };

        const aiText = await geminiClient.verbalizeDigest(factualSummary, 3000);
        if (aiText && aiText.trim().length > 10) {
          whatChangedNarrative = aiText.trim();
          isAiEnhanced = true;
        }
      } catch {
        // Fall back gracefully to deterministic narrative
        whatChangedNarrative = deterministicNarrative;
        isAiEnhanced = false;
      }
    }

    const retrospective: WeeklyRetrospective = {
      stateAverages: currentAverages,
      stateDeltasVsPriorWeek,
      dominantMoods,
      whatChangedNarrative,
      whatHelpedInterventions,
      habitContinuity,
      limitationsNotice: LIMITATIONS_NOTICE,
    };

    return {
      id: randomUUID(),
      userId: input.userId,
      weekStartDate: input.weekStartDate,
      weekEndDate: input.weekEndDate,
      timezone: input.timezone || 'UTC',
      retrospective,
      forecastSnapshot: input.forecastSnapshot,
      isAiEnhanced,
      createdAt: evalTime.toISOString(),
      updatedAt: evalTime.toISOString(),
    };
  },
};
