/**
 * Personal State Engine Core Types
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 */

export type SignalModality = 
  | 'text_journal'
  | 'voice_transcript'
  | 'companion_session'
  | 'mood_checkin'
  | 'habit_action'
  | 'future_behavior'
  | 'future_wearable'
  | 'intervention_outcome';

export type StateDimensionKey =
  | 'mood'
  | 'stress'
  | 'fatigue'
  | 'energy'
  | 'focus'
  | 'cognitiveLoad';

export interface DimensionMetadata {
  key: StateDimensionKey;
  label: string;
  description: string;
  higherIsPositive: boolean;
  neutralDefault: number;
  lowLabel: string;
  highLabel: string;
}

export const STATE_DIMENSION_CONFIG: Record<StateDimensionKey, DimensionMetadata> = {
  mood: {
    key: 'mood',
    label: 'Mood Valence',
    description: 'Emotional valence and overall felt psychological well-being',
    higherIsPositive: true,
    neutralDefault: 70,
    lowLabel: 'Very Negative',
    highLabel: 'Very Positive',
  },
  stress: {
    key: 'stress',
    label: 'Stress Load',
    description: 'Autonomic distress, tension, and overwhelm load',
    higherIsPositive: false,
    neutralDefault: 30,
    lowLabel: 'Relaxed',
    highLabel: 'Acute Tension',
  },
  fatigue: {
    key: 'fatigue',
    label: 'Fatigue / Depletion',
    description: 'Physical exhaustion and somatic energy deficit',
    higherIsPositive: false,
    neutralDefault: 35,
    lowLabel: 'Fully Rested',
    highLabel: 'Exhausted',
  },
  energy: {
    key: 'energy',
    label: 'Vitality & Energy',
    description: 'Felt biological and motivational drive',
    higherIsPositive: true,
    neutralDefault: 65,
    lowLabel: 'Depleted',
    highLabel: 'Vibrant',
  },
  focus: {
    key: 'focus',
    label: 'Cognitive Focus',
    description: 'Attentional clarity, presence, and task engagement',
    higherIsPositive: true,
    neutralDefault: 70,
    lowLabel: 'Scattered / Foggy',
    highLabel: 'Deep Flow',
  },
  cognitiveLoad: {
    key: 'cognitiveLoad',
    label: 'Cognitive Load',
    description: 'Mental task density, context switching, and cognitive clutter',
    higherIsPositive: false,
    neutralDefault: 35,
    lowLabel: 'Unburdened',
    highLabel: 'Mental Overload',
  },
};

export interface DimensionEstimate {
  value: number;      // 0 - 100 normalized score
  confidence: number; // 0.00 - 1.00 bounded engineering confidence
}

export interface WellnessSignal {
  id: string;
  userId: string;
  timestamp: string;  // ISO 8601 UTC
  modality: SignalModality;
  sourceId?: string;
  estimates: Partial<Record<StateDimensionKey, DimensionEstimate>>;
  features: {
    valence?: number;            // -1.0 to 1.0
    arousal?: number;            // 0.0 to 1.0
    energy?: number;             // 1 to 10 (explicit check-in)
    somaticSensations?: string[];
    triggers?: string[];
    themes?: string[];
    sentimentSummary?: string;
    rawTokensCount?: number;
  };
  reliabilityWeight: number;     // 0.0 - 1.0 (e.g., self-report = 1.0, AI inference = 0.75)
  expiresAt: string;             // ISO 8601 UTC
}

export type EvidenceContribution = 
  | 'elevating'
  | 'lowering'
  | 'reinforcing'
  | 'neutral';

export interface StateEvidenceItem {
  id: string;
  source: SignalModality | 'baseline' | 'history';
  observation: string;
  dimension: StateDimensionKey;
  contribution: EvidenceContribution;
  directionText?: string;
  weight: number;
  confidence: number;
  timestamp: string;
  referenceId?: string;
}

export interface WellnessDimension {
  value: number;                 // 0 - 100 normalized score
  confidence: number;            // 0.00 - 1.00 bounded engineering confidence
  baselineDeviation: number;     // Signed delta from user's neutral baseline (value - baseline)
  trend: 'improving' | 'stable' | 'declining';
  contributingSignalIds: string[];
}

export interface BaselineDimension {
  mean: number;
  median: number;
  stdDev: number;
  observationCount: number;
  confidence: number;
  isPreliminary: boolean;
  lastUpdated: string;
}

export interface PersonalBaseline {
  userId: string;
  observationCount: number;
  overallConfidence: number;
  isPreliminary: boolean;
  dimensions: Record<StateDimensionKey, BaselineDimension>;
  lastUpdated: string;
}

export interface PersonalState {
  id: string;
  userId: string;
  timestamp: string;             // ISO 8601 UTC
  createdAt: string;             // ISO 8601 UTC

  // Flat dimension accessors for fast consumption and domain API contracts
  mood: number;
  stress: number;
  fatigue: number;
  energy: number;
  focus: number;
  cognitiveLoad: number;
  confidence: number;            // 0.00 - 1.00 engineering confidence

  // Granular dimension breakdown with trend and baseline deviations
  dimensions: Record<StateDimensionKey, WellnessDimension>;

  // Explainability: structured evidence supporting every dimension
  evidence: StateEvidenceItem[];

  // Modality attribution summary
  sourceSummary: Record<string, number>;

  overallConfidence: number;     // Alias to confidence
  somaticMarkers: string[];      // Unified list of active physical sensations
  contextualTriggers: string[];  // Unified list of active contextual factors
  activeSignalsCount: number;
  decayHalfLifeHours: number;    // Standard: 12.0 hours
}

export type NeutralBaseline = Record<StateDimensionKey, number>;

export interface SignalProvider<TInput = any> {
  readonly modality: SignalModality;
  extractSignals(input: TInput): Promise<WellnessSignal[]> | WellnessSignal[];
}
