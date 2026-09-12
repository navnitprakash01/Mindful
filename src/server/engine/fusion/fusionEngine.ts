/**
 * Multimodal Fusion Engine Orchestrator
 * Mindful 2.0 — Phase 5: Multimodal State Fusion
 *
 * Primary fusion pipeline:
 * SENSE -> SAFETY GATE -> SIGNAL EXTRACTION -> MULTIMODAL FUSION -> STATE ENGINE
 *
 * Implements deterministic temporal epoching, correlation clustering,
 * within-modality consolidation, cross-modal consistency, bounded corroboration,
 * conflict-aware divergence tracking, and universal crisis precedence.
 */

import {
  NeutralBaseline,
  SignalModality,
  StateDimensionKey,
  StateEvidenceItem,
  WellnessSignal,
  EvidenceContribution,
  STATE_DIMENSION_CONFIG,
} from '../types';
import {
  DimensionFusionResult,
  MultimodalFusionOutput,
  ModalityEstimate,
} from './types';
import { stratifySignals, TEMPORAL_CONFIG } from './temporal';
import { clusterAndDampSignals } from './correlation';
import {
  consolidateModalitySignals,
  evaluateCrossModalConsistency,
  generateCrossModalEvidence,
  CONSISTENCY_CONFIG,
} from './consistency';
import { evaluateSafetyPrecedence } from './safetyPrecedence';

export class MultimodalFusionEngine {
  private halfLifeHours: number;
  private maxAgeHours: number;

  constructor(options?: { halfLifeHours?: number; maxAgeHours?: number }) {
    this.halfLifeHours = options?.halfLifeHours ?? TEMPORAL_CONFIG.HALF_LIFE_HOURS;
    this.maxAgeHours = options?.maxAgeHours ?? TEMPORAL_CONFIG.MAX_SIGNAL_AGE_HOURS;
  }

  /**
   * Main fusion execution method
   */
  public fuse(
    userId: string,
    signals: WellnessSignal[],
    baseline: NeutralBaseline,
    referenceTime: Date = new Date()
  ): MultimodalFusionOutput {
    // 1. Universal Crisis Precedence Screening
    const safety = evaluateSafetyPrecedence(signals);

    // 2. Temporal Epoch Stratification
    const temporalSignals = stratifySignals(
      signals,
      referenceTime,
      this.halfLifeHours,
      this.maxAgeHours
    );

    // 3. Correlation Clustering & Evidence Damping
    const { clusters, effectiveWeightMap } = clusterAndDampSignals(temporalSignals);

    // Track active modalities count for source summary
    const sourceSummary: Record<string, number> = {};
    for (const ts of temporalSignals) {
      sourceSummary[ts.signal.modality] = (sourceSummary[ts.signal.modality] || 0) + 1;
    }

    const dimensionKeys: StateDimensionKey[] = [
      'mood',
      'stress',
      'fatigue',
      'energy',
      'focus',
      'cognitiveLoad',
    ];

    const dimensions = {} as Record<StateDimensionKey, DimensionFusionResult>;
    const allEvidence: StateEvidenceItem[] = [];

    // Prepend crisis evidence if detected
    if (safety.isCrisisDetected && safety.crisisEvidenceItem) {
      allEvidence.push(safety.crisisEvidenceItem);
    }

    // Signals with their effective damped weights
    const signalsWithWeights = temporalSignals.map((ts) => ({
      signal: ts.signal,
      effectiveWeight: effectiveWeightMap.get(ts.signal.id) ?? ts.decayWeight,
    }));

    // 4. Dimension-by-Dimension Multimodal Fusion
    for (const dimKey of dimensionKeys) {
      const meta = STATE_DIMENSION_CONFIG[dimKey];
      const baselineVal = baseline[dimKey] ?? meta.neutralDefault;

      const dimResult = this.fuseDimension(
        dimKey,
        signalsWithWeights,
        baselineVal,
        meta.higherIsPositive
      );

      dimensions[dimKey] = dimResult;
      allEvidence.push(...dimResult.evidence);
    }

    // 5. Compute overall confidence across dimensions
    const totalDimConf = dimensionKeys.reduce(
      (sum, k) => sum + dimensions[k].finalConfidence,
      0
    );
    const overallConfidence = Number((totalDimConf / dimensionKeys.length).toFixed(2));

    return {
      dimensions,
      evidence: allEvidence,
      sourceSummary,
      overallConfidence,
      isCrisisDetected: safety.isCrisisDetected,
      crisisNotice: safety.helplineNotice,
      matchedCrisisTrigger: safety.matchedTrigger,
      activeSignalsCount: temporalSignals.length,
      clustersCount: clusters.length,
    };
  }

  /**
   * Fuses active observations for an individual dimension
   */
  private fuseDimension(
    dimensionKey: StateDimensionKey,
    signalsWithWeights: Array<{ signal: WellnessSignal; effectiveWeight: number }>,
    baselineValue: number,
    higherIsPositive: boolean
  ): DimensionFusionResult {
    // Identify all contributing modalities
    const activeModalities = new Set<SignalModality>();
    for (const { signal } of signalsWithWeights) {
      const est = signal.estimates[dimensionKey];
      if (est && typeof est.value === 'number' && !isNaN(est.value)) {
        activeModalities.add(signal.modality);
      }
    }

    // Empty state: cold start / no active observations
    if (activeModalities.size === 0) {
      return {
        dimension: dimensionKey,
        fusedValue: baselineValue,
        finalConfidence: 0.0,
        baselineDeviation: 0,
        trend: 'stable',
        contributingSignalIds: [],
        consistency: {
          dimension: dimensionKey,
          consistencyScore: null,
          divergenceDetected: false,
          maxDiscrepancy: 0,
          participatingModalities: [],
          divergencePairs: [],
        },
        modalityBreakdown: {},
        evidence: [],
      };
    }

    // A. Consolidate within each modality
    const modalityEstimates: ModalityEstimate[] = [];
    const modalityBreakdown: Partial<Record<SignalModality, {
      value: number;
      confidence: number;
      weight: number;
    }>> = {};
    const contributingSignalIds: string[] = [];

    for (const mod of activeModalities) {
      const consolidated = consolidateModalitySignals(mod, dimensionKey, signalsWithWeights);
      if (consolidated) {
        modalityEstimates.push(consolidated);
        modalityBreakdown[mod] = {
          value: consolidated.value,
          confidence: consolidated.confidence,
          weight: Number(consolidated.effectiveWeight.toFixed(2)),
        };
        contributingSignalIds.push(...consolidated.signalIds);
      }
    }

    // B. Evaluate cross-modal consistency
    const consistency = evaluateCrossModalConsistency(dimensionKey, modalityEstimates);

    // C. Weighted average of consolidated estimates
    let totalWeight = 0;
    let weightedValSum = 0;
    let avgConfSum = 0;

    for (const est of modalityEstimates) {
      totalWeight += est.effectiveWeight;
      weightedValSum += est.value * est.effectiveWeight;
      avgConfSum += est.confidence;
    }

    const rawEstimatedValue = totalWeight > 0 ? weightedValSum / totalWeight : baselineValue;
    const avgModalityConf = modalityEstimates.length > 0 ? avgConfSum / modalityEstimates.length : 0.8;

    // D. Calibrated Confidence Calculation with Conflict Penalty & Corroboration Bonus
    let finalConfidence = 0;
    const baseConf = totalWeight / (1.0 + totalWeight);

    if (modalityEstimates.length === 1) {
      // Single modality: capped strictly at SINGLE_MODALITY_MAX_CONF (0.80)
      finalConfidence = Math.min(CONSISTENCY_CONFIG.SINGLE_MODALITY_MAX_CONF, baseConf);
    } else {
      // Multimodal: can reach up to MULTIMODAL_MAX_CONF (0.95)
      if (consistency.divergenceDetected) {
        // Conflict penalty: scale down based on excess discrepancy over threshold
        const excess = Math.max(0, consistency.maxDiscrepancy - CONSISTENCY_CONFIG.DIVERGENCE_THRESHOLD);
        const conflictFactor = Math.max(0.40, 1.0 - excess / 70.0);
        finalConfidence = baseConf * conflictFactor;
      } else if (
        consistency.consistencyScore !== null &&
        consistency.consistencyScore >= CONSISTENCY_CONFIG.CORROBORATION_MIN_SCORE &&
        consistency.maxDiscrepancy <= CONSISTENCY_CONFIG.CORROBORATION_MAX_DELTA
      ) {
        // Bounded corroboration bonus (+10%)
        finalConfidence = Math.min(CONSISTENCY_CONFIG.MULTIMODAL_MAX_CONF, baseConf * CONSISTENCY_CONFIG.CORROBORATION_BOOST);
      } else {
        finalConfidence = Math.min(CONSISTENCY_CONFIG.MULTIMODAL_MAX_CONF, baseConf);
      }
    }

    finalConfidence = Math.max(0.0, Math.min(1.0, Number(finalConfidence.toFixed(2))));

    // E. Blend raw value toward baseline as confidence decreases
    const blendedValue = Math.round(
      finalConfidence * rawEstimatedValue + (1.0 - finalConfidence) * baselineValue
    );
    const baselineDeviation = blendedValue - baselineValue;

    // F. Trend classification
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (higherIsPositive) {
      if (baselineDeviation >= 5) trend = 'improving';
      else if (baselineDeviation <= -5) trend = 'declining';
    } else {
      if (baselineDeviation <= -5) trend = 'improving';
      else if (baselineDeviation >= 5) trend = 'declining';
    }

    // G. Generate structured evidence items
    const baseEvidence: StateEvidenceItem[] = [];

    for (const { signal, effectiveWeight } of signalsWithWeights) {
      const est = signal.estimates[dimensionKey];
      if (est && typeof est.value === 'number' && !isNaN(est.value)) {
        const delta = est.value - baselineValue;
        let contribution: EvidenceContribution = 'neutral';
        if (Math.abs(delta) < 4) contribution = 'reinforcing';
        else if (delta > 0) contribution = 'elevating';
        else contribution = 'lowering';

        let observation = `Reported ${dimensionKey} of ${Math.round(est.value)}`;
        if (signal.modality === 'mood_checkin') {
          const triggers = signal.features.triggers?.join(', ');
          const sensations = signal.features.somaticSensations?.join(', ');
          if (triggers) observation += ` (Triggers: ${triggers})`;
          if (sensations) observation += ` (Sensations: ${sensations})`;
        } else if (signal.modality === 'text_journal' || signal.modality === 'voice_transcript') {
          if (signal.features.sentimentSummary) {
            observation = `${signal.modality === 'voice_transcript' ? 'Voice observation' : 'Journal reflection'}: "${signal.features.sentimentSummary}"`;
          }
        } else if (signal.modality === 'companion_session') {
          observation = signal.features.sentimentSummary || 'Companion dialogue interaction';
        }

        baseEvidence.push({
          id: `ev-${signal.id}-${dimensionKey}`,
          source: signal.modality,
          observation,
          dimension: dimensionKey,
          contribution,
          directionText: `${delta >= 0 ? '+' : ''}${Math.round(delta)} vs baseline`,
          weight: Number(effectiveWeight.toFixed(2)),
          confidence: est.confidence || 0.8,
          timestamp: signal.timestamp,
          referenceId: signal.sourceId || signal.id,
        });
      }
    }

    // H. Cross-Modal Evidence (Corroboration / Divergence)
    const crossModalEvidence = generateCrossModalEvidence(
      dimensionKey,
      consistency,
      modalityEstimates,
      blendedValue,
      baselineValue
    );

    return {
      dimension: dimensionKey,
      fusedValue: blendedValue,
      finalConfidence,
      baselineDeviation,
      trend,
      contributingSignalIds,
      consistency,
      modalityBreakdown,
      evidence: [...baseEvidence, ...crossModalEvidence],
    };
  }
}

export const defaultMultimodalFusionEngine = new MultimodalFusionEngine();
