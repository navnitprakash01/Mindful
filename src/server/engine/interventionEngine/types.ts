/**
 * Intervention Domain Types
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 */

import { StateDimensionKey } from '../types';

export type InterventionCategory =
  | 'breathing'
  | 'grounding'
  | 'focus'
  | 'cognitive'
  | 'recovery'
  | 'reflection'
  | 'wind_down'
  | 'activation';

export type InterventionDifficulty = 'gentle' | 'moderate' | 'deep';

export type SessionStatus = 'started' | 'completed' | 'abandoned';

export interface InterventionStep {
  stepNumber: number;
  title: string;
  instruction: string;
  durationSeconds?: number;
}

export interface StateRangeRequirement {
  dimension: StateDimensionKey;
  min?: number;
  max?: number;
  direction: 'elevate' | 'downregulate' | 'reinforce';
}

export interface InterventionDefinition {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: InterventionCategory;
  targetDimensions: StateDimensionKey[];
  suitableRanges: StateRangeRequirement[];
  minimumConfidence: number;
  durationMinutes: number;
  steps: InterventionStep[];
  contraindications?: string[];
  safetyNotes: string;
  difficulty: InterventionDifficulty;
  cooldownHours: number;
  version: string;
}

export interface InterventionSession {
  id: string;
  userId: string;
  interventionId: string;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  preStateSnapshot: Record<StateDimensionKey, number>;
  postStateSnapshot?: Record<StateDimensionKey, number>;
  dimensionDeltas?: Partial<Record<StateDimensionKey, number>>;
  perceivedUsefulness?: number; // 1 - 5
  userFeedback?: string;
  interventionVersion: string;
  createdAt: string;
}

export interface InterventionRecommendation {
  intervention: InterventionDefinition;
  suitabilityScore: number; // 0.00 - 1.00
  reasons: string[];
  confidence: number;
  isColdOrLowConfidence: boolean;
  alternativeInterventions?: InterventionDefinition[];
  safetyNotice?: string;
}

export interface DimensionEffectiveness {
  targetDimension: StateDimensionKey;
  avgDelta: number;
  positiveShiftCount: number;
  totalSessions: number;
}

export interface InterventionEffectiveness {
  interventionId: string;
  attemptsCount: number;
  completedCount: number;
  completionRate: number;
  avgUsefulness: number | null;
  dimensionStats: Partial<Record<StateDimensionKey, DimensionEffectiveness>>;
  factualSummary: string;
  hasEnoughHistory: boolean;
}

export interface CrisisScreeningResult {
  isCrisisDetected: boolean;
  matchedTrigger?: string;
  helplineNotice?: string;
}
