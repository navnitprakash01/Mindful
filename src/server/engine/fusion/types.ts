/**
 * Multimodal State Fusion Engine Types
 * Mindful 2.0 — Phase 5: Multimodal State Fusion
 *
 * Formal types for temporal stratification, correlation clustering,
 * within-modality consolidation, cross-modal consistency, and explainability.
 */

import {
  SignalModality,
  StateDimensionKey,
  WellnessSignal,
  StateEvidenceItem,
} from '../types';

export type TemporalEpoch = 'immediate' | 'recent' | 'historical';

export interface TemporalSignal {
  signal: WellnessSignal;
  decayWeight: number;
  epoch: TemporalEpoch;
  ageHours: number;
}

export interface CorrelationCluster {
  clusterId: string;
  signals: WellnessSignal[];
  primarySignal: WellnessSignal;
  dampedWeights: Map<string, number>;
  reasons: string[];
}

export interface ModalityEstimate {
  modality: SignalModality;
  dimension: StateDimensionKey;
  value: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  effectiveWeight: number;
  signalIds: string[];
  epoch: TemporalEpoch;
}

export interface CrossModalConsistency {
  dimension: StateDimensionKey;
  consistencyScore: number | null; // null if < 2 modalities active
  divergenceDetected: boolean; // true if max discrepancy > 30
  maxDiscrepancy: number; // max difference between any two modalities
  participatingModalities: SignalModality[];
  divergencePairs: Array<{
    modalityA: SignalModality;
    modalityB: SignalModality;
    delta: number;
  }>;
}

export interface DimensionFusionResult {
  dimension: StateDimensionKey;
  fusedValue: number;
  finalConfidence: number;
  baselineDeviation: number;
  trend: 'improving' | 'stable' | 'declining';
  contributingSignalIds: string[];
  consistency: CrossModalConsistency;
  modalityBreakdown: Partial<Record<SignalModality, {
    value: number;
    confidence: number;
    weight: number;
  }>>;
  evidence: StateEvidenceItem[];
}

export interface MultimodalFusionOutput {
  dimensions: Record<StateDimensionKey, DimensionFusionResult>;
  evidence: StateEvidenceItem[];
  sourceSummary: Record<string, number>;
  overallConfidence: number;
  isCrisisDetected: boolean;
  crisisNotice?: string;
  matchedCrisisTrigger?: string;
  activeSignalsCount: number;
  clustersCount: number;
}
