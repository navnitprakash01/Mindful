/**
 * Evidence Graph Domain Types & Contracts
 * Mindful 2.0 — Phase 6: Explainable AI / Evidence Graph
 *
 * Defines the Typed Provenance DAG structures connecting:
 * Signal -> Evidence -> State -> Pattern -> Recommendation -> Action -> Outcome -> Learning
 */

import { StateDimensionKey, SignalModality } from '../types';

export type NodeType =
  | 'raw_signal'
  | 'modality_estimate'
  | 'fusion_state'
  | 'pattern'
  | 'recommendation'
  | 'session_action'
  | 'outcome_delta'
  | 'learning_summary'
  | 'crisis';

export type EdgeType =
  | 'extracted_from'
  | 'consolidated_into'
  | 'fused_into'
  | 'associates_with'
  | 'justifies'
  | 'executed_as'
  | 'resulted_in'
  | 'informs'
  | 'overrides';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  summary: string;
  timestamp?: string;
  confidence?: number;
  modality?: SignalModality | string;
  userId: string;
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  sourceNodeId: string;
  targetNodeId: string;
  type: EdgeType;
  label?: string;
  weight?: number;
}

export type UncertaintyFactorType =
  | 'sample_scarcity'
  | 'temporal_decay'
  | 'modal_divergence'
  | 'preliminary_baseline'
  | 'high_variance';

export interface UncertaintyExplanation {
  factor: UncertaintyFactorType;
  impact: 'minor' | 'moderate' | 'significant';
  explanation: string;
}

export interface DimensionExplanation {
  dimension: StateDimensionKey;
  value: number;
  confidence: number;
  trend: 'improving' | 'stable' | 'declining';
  headline: string;
  detailedExplanation: string;
  contributingSources: string[];
  crossModalSummary?: string;
  uncertaintyFactors: UncertaintyExplanation[];
}

export interface PatternExplanation {
  patternId: string;
  title: string;
  summary: string;
  supportingDates: string[];
  supportingCount: number;
  observationCount: number;
  supportingObservationIds?: string[];
  confidence: number;
  isCausalClaim: false; // strictly non-causal invariant
}

export interface RecommendationExplanation {
  interventionId: string;
  title: string;
  suitabilityScore: number;
  primaryRationale: string;
  stateFactors: string[];
  patternFactors: string[];
  historyFactors: string[];
}

export interface OutcomeExplanation {
  sessionId: string;
  interventionId: string;
  measuredDeltas: Partial<Record<StateDimensionKey, number>>;
  measuredSummary: string;
  userRating?: number;
  userRatingSummary?: string;
  inferredSummary: string;
}

export interface ExplanationTree {
  userId: string;
  generatedAt: string;
  dimensions: Record<StateDimensionKey, DimensionExplanation>;
  patterns: PatternExplanation[];
  recommendation?: RecommendationExplanation;
  recentOutcomes: OutcomeExplanation[];
  crisisNotice?: string;
  isCrisisDetected: boolean;
}

export interface EvidenceGraph {
  userId: string;
  generatedAt: string;
  rootNodeId: string;
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  uncertaintyDecomposition: Record<string, UncertaintyExplanation[]>;
}

export interface EvidenceGraphResponse {
  graph: EvidenceGraph;
  explanations: ExplanationTree;
}
