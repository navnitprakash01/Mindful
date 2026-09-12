/**
 * Pattern Engine Types & Domain Models
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 */

import { StateDimensionKey } from '../types';

export type PatternType =
  | 'temporal_rhythm'
  | 'trigger_association'
  | 'mood_frequency'
  | 'energy_trajectory'
  | 'context_somatic_cooccurrence';

export type PatternStrength = 'mild' | 'moderate' | 'strong';

export type PatternStatus = 'candidate' | 'validated' | 'weakening' | 'inactive';

export interface PatternEvidence {
  observationCount: number;
  supportingCount: number;
  comparisonCount: number;
  supportingTimestamps: string[];
  metricKey: string;
  supportingAvg: number;
  comparisonAvg?: number;
  triggerName?: string;
  temporalContext?: string;
  sampleContexts: string[];
}

export interface PersonalPattern {
  id: string; // UUID
  userId: string;
  type: PatternType;
  patternKey: string; // Deterministic unique identifier (e.g. 'trigger_academic_work', 'energy_trajectory')
  title: string;
  description: string;
  confidence: number; // 0.00 to 1.00
  strength: PatternStrength;
  status: PatternStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  observationCount: number;
  evidence: PatternEvidence;
  deterministicTitle: string;
  deterministicDescription: string;
  aiExplanation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedObservation {
  id: string;
  timestamp: string; // ISO string
  dateKey: string; // YYYY-MM-DD
  hourOfDay: number; // 0-23
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
  moodType?: string;
  energyLevel?: number; // 1-10
  dimensions: Partial<Record<StateDimensionKey, number>>; // 0-100
  triggers: string[];
  physicalSensations: string[];
  modality: string;
  sourceId?: string;
}

export interface ThresholdConfig {
  minObservationsForAnyPattern: number;
  minObservationsForFrequency: number;
  minObservationsForTrajectory: number;
  minObservationsForTriggerAssociation: number;
  minTriggerSupportingCount: number;
  minObservationsForTemporalRhythm: number;
  minTemporalSupportingCount: number;
  minObservationsForHighConfidence: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  minObservationsForAnyPattern: 3,
  minObservationsForFrequency: 3,
  minObservationsForTrajectory: 4,
  minObservationsForTriggerAssociation: 5,
  minTriggerSupportingCount: 3,
  minObservationsForTemporalRhythm: 5,
  minTemporalSupportingCount: 3,
  minObservationsForHighConfidence: 8,
};
