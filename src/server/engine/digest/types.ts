/**
 * Weekly Digest Types & Domain Contracts
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting & Weekly Digest
 *
 * Defines the structured retrospective weekly synthesis domain models.
 * Strictly retrospective:
 * - What Changed (longitudinal state shift)
 * - Mood distribution (observational frequency only, zero mood forecasting)
 * - What Helped (EffectivenessEngine retrospective summaries)
 * - Habit Continuity (HabitEngine consistency)
 * - Forward Trajectory Snapshot (from ForecastEngine)
 * - Limitations and non-clinical disclaimers
 */

import { ForecastDimension, ForecastResult } from '../forecastEngine/types';

export interface HelpfulInterventionSummary {
  interventionType: string;
  title: string;
  sessionCount: number;
  averageRecoveryDelta: number; // e.g. +14.2 pts stress recovery
  primaryDimension: string;
}

export interface HabitContinuitySummary {
  totalScheduled: number;
  totalCompleted: number;
  overallConsistencyScore: number; // 0.0 - 1.0
  activeHabitsCount: number;
  longestStreak: number;
  restDaysRespected: number;
}

export interface MoodFrequencyItem {
  mood: string;
  frequency: number;
  percentage: number;
}

export interface WeeklyRetrospective {
  stateAverages: Record<ForecastDimension, number>;
  stateDeltasVsPriorWeek: Record<ForecastDimension, number>;
  dominantMoods: MoodFrequencyItem[];
  whatChangedNarrative: string;
  whatHelpedInterventions: HelpfulInterventionSummary[];
  habitContinuity: HabitContinuitySummary;
  limitationsNotice: string;
}

export interface WeeklyDigest {
  id: string;
  userId: string;
  weekStartDate: string;        // YYYY-MM-DD (local calendar Monday)
  weekEndDate: string;          // YYYY-MM-DD (local calendar Sunday)
  timezone: string;             // IANA Timezone string, e.g. 'UTC' or 'America/New_York'
  retrospective: WeeklyRetrospective;
  forecastSnapshot: ForecastResult;
  isAiEnhanced: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DigestGenerationInput {
  userId: string;
  weekStartDate: string;
  weekEndDate: string;
  timezone: string;
  currentWeekStates: any[];
  priorWeekStates?: any[];
  completedHabits?: any[];
  interventionSessions?: any[];
  forecastSnapshot: ForecastResult;
  evaluationTime?: Date;
  allowAiEnhancement?: boolean;
}
