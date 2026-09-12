export type ViewTab =
  | 'landing'
  | 'dashboard'
  | 'journal'
  | 'mood'
  | 'companion'
  | 'habits'
  | 'analytics'
  | 'settings'
  | 'profile';

export type CompanionMode =
  | 'Empathetic Listener'
  | 'Mindful Coach'
  | 'Stoic Philosopher'
  | 'CBT Reframer';

export interface JournalEntry {
  id: string;
  createdAt: string; // ISO date string
  title: string;
  content: string;
  tags: string[];
  mood: string;
  moodScore: number; // 0 - 100
  emotion?: string;
  aiSummary?: string;
  aiAnalysis?: string;
  favorite: boolean;
  wordCount: number;
  aiEmotions?: { name: string; score: number }[];
  aiThemes?: string[];
  aiSuggestedAction?: string;
  aiReflectionPrompt?: string;
}

export interface MoodLog {
  id: string;
  timestamp: string;
  energyLevel: number; // 1 - 10
  moodType: 'Joy' | 'Anxiety' | 'Calm' | 'Focus' | 'Melancholy' | 'Gratitude' | 'Restless';
  notes: string;
  triggers: string[];
  physicalSensations: string[];
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  category: 'mindfulness' | 'movement' | 'reflection' | 'rest' | 'gratitude';
  streak: number;
  targetFrequency: number; // e.g. 7 days a week
  completedDates: string[]; // ISO date strings (YYYY-MM-DD)
  iconName: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  plan: 'Free Sanctuary' | 'Mindful Pro';
  joinedDate: string;
  dailyGoalMinutes: number;
  streakCount: number;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  selectedSoundscape?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'streak' | 'reminder' | 'insight' | 'system';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'companion';
  text: string;
  timestamp: string;
  mode?: CompanionMode;
  suggestedPathways?: string[];
}

export interface SoundscapeTrack {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
}

export type StateDimensionKey =
  | 'mood'
  | 'stress'
  | 'fatigue'
  | 'energy'
  | 'focus'
  | 'cognitiveLoad';

export interface StateEvidenceItem {
  id: string;
  source: string;
  observation: string;
  dimension: StateDimensionKey;
  contribution: 'elevating' | 'lowering' | 'reinforcing' | 'neutral';
  directionText?: string;
  weight: number;
  confidence: number;
  timestamp: string;
  referenceId?: string;
}

export interface WellnessDimension {
  value: number;             // 0 - 100
  confidence: number;        // 0.00 - 1.00
  baselineDeviation: number; // Delta from baseline
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
  timestamp: string;
  createdAt?: string;

  // Flat dimension accessors for fast access
  mood: number;
  stress: number;
  fatigue: number;
  energy: number;
  focus: number;
  cognitiveLoad: number;
  confidence: number;

  dimensions: Record<StateDimensionKey, WellnessDimension>;
  evidence: StateEvidenceItem[];
  sourceSummary: Record<string, number>;
  overallConfidence: number;
  somaticMarkers: string[];
  contextualTriggers: string[];
  activeSignalsCount: number;
  decayHalfLifeHours: number;
}

// ── Phase 2: Longitudinal Pattern Engine Types ──────────────────────────────

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
  supportingObservationIds?: string[];
}

export interface PersonalPattern {
  id: string;
  userId: string;
  type: PatternType;
  patternKey: string;
  title: string;
  description: string;
  confidence: number;
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

// ── Phase 3: Personalized Intervention + Outcome Tracking Types ─────────────

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

export interface RecommendationFactorContribution {
  factor: 'state_fit' | 'pattern_fit' | 'history_fit' | 'cooldown';
  contribution: number;
  explanation: string;
}

export interface RecommendationEvidence {
  stateSnapshotId?: string;
  stateDimensions: Array<{
    dimension: StateDimensionKey;
    value: number;
    contribution: number;
  }>;
  patternKeys: string[];
  sessionIds: string[];
  factors: RecommendationFactorContribution[];
}

export interface InterventionRecommendation {
  intervention: InterventionDefinition;
  suitabilityScore: number; // 0.00 - 1.00
  reasons: string[];
  confidence: number;
  isColdOrLowConfidence: boolean;
  alternativeInterventions?: InterventionDefinition[];
  safetyNotice?: string;
  evidence?: RecommendationEvidence;
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

