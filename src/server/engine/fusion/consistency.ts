/**
 * Cross-Modal Consistency, Consolidation & Divergence Engine
 * Mindful 2.0 — Phase 5: Multimodal State Fusion
 *
 * Implements:
 * 1. Within-modality consolidation (generating one representative estimate per modality)
 * 2. Cross-modal consistency index:
 *    S_consistency = max(0.0, 1.0 - sum(w_m * |v_m - v_mean|) / (40 * sum(w_m)))
 *    Returns null when < 2 modalities are active.
 * 3. Bounded corroboration bonus (+10% confidence, max 0.95) when modalities agree closely.
 * 4. Conflict / divergence detection (> 30 point spread) with confidence penalty.
 * 5. Strict non-diagnostic explainability evidence generation.
 */

import {
  SignalModality,
  StateDimensionKey,
  WellnessSignal,
  StateEvidenceItem,
  EvidenceContribution,
} from '../types';
import {
  CrossModalConsistency,
  ModalityEstimate,
} from './types';

export const CONSISTENCY_CONFIG = {
  DIVERGENCE_THRESHOLD: 30,         // Discrepancy > 30 points triggers divergence
  CORROBORATION_MAX_DELTA: 12,      // Max discrepancy <= 12 qualifies for corroboration
  CORROBORATION_MIN_SCORE: 0.85,    // Consistency score >= 0.85 qualifies for corroboration
  CORROBORATION_BOOST: 1.10,        // +10% confidence boost
  SINGLE_MODALITY_MAX_CONF: 0.80,   // Single modality confidence ceiling
  MULTIMODAL_MAX_CONF: 0.95,        // Maximum multi-signal confidence ceiling
};

/**
 * Consolidates multiple signals of the SAME modality for a specific dimension
 */
export function consolidateModalitySignals(
  modality: SignalModality,
  dimension: StateDimensionKey,
  signalsWithWeights: Array<{ signal: WellnessSignal; effectiveWeight: number }>
): ModalityEstimate | null {
  const matching = signalsWithWeights.filter(({ signal }) => {
    const est = signal.estimates[dimension];
    return signal.modality === modality && est && typeof est.value === 'number' && !isNaN(est.value);
  });

  if (matching.length === 0) {
    return null;
  }

  let totalWeightedVal = 0;
  let totalWeight = 0;
  let totalConfidence = 0;
  const signalIds: string[] = [];

  for (const { signal, effectiveWeight } of matching) {
    const est = signal.estimates[dimension]!;
    const clampedVal = Math.max(0, Math.min(100, est.value));
    const estConf = typeof est.confidence === 'number' && !isNaN(est.confidence)
      ? Math.max(0.1, Math.min(1.0, est.confidence))
      : 0.8;

    const w = effectiveWeight * estConf;
    totalWeightedVal += clampedVal * w;
    totalWeight += w;
    totalConfidence += estConf;
    signalIds.push(signal.id);
  }

  if (totalWeight <= 0) {
    return null;
  }

  const consolidatedValue = totalWeightedVal / totalWeight;
  const avgEstConf = totalConfidence / matching.length;
  const boundedConf = Math.min(CONSISTENCY_CONFIG.SINGLE_MODALITY_MAX_CONF, avgEstConf);

  return {
    modality,
    dimension,
    value: Math.round(consolidatedValue),
    confidence: Number(boundedConf.toFixed(3)),
    effectiveWeight: totalWeight,
    signalIds,
    epoch: 'immediate',
  };
}

/**
 * Computes the Cross-Modal Consistency Score and identifies divergence or corroboration
 */
export function evaluateCrossModalConsistency(
  dimension: StateDimensionKey,
  estimates: ModalityEstimate[]
): CrossModalConsistency {
  // If fewer than 2 distinct modalities, consistency cannot be computed
  if (estimates.length < 2) {
    return {
      dimension,
      consistencyScore: null,
      divergenceDetected: false,
      maxDiscrepancy: 0,
      participatingModalities: estimates.map((e) => e.modality),
      divergencePairs: [],
    };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  for (const est of estimates) {
    totalWeight += est.effectiveWeight;
    weightedSum += est.value * est.effectiveWeight;
  }

  const meanVal = totalWeight > 0 ? weightedSum / totalWeight : 50;

  // Formula: S_consistency = max(0.0, 1.0 - sum(w_m * |v_m - mean|) / (40 * sum(w_m)))
  let dispersionSum = 0;
  for (const est of estimates) {
    dispersionSum += est.effectiveWeight * Math.abs(est.value - meanVal);
  }

  const dispersionTerm = totalWeight > 0 ? dispersionSum / (40.0 * totalWeight) : 0;
  const rawScore = Math.max(0.0, Math.min(1.0, 1.0 - dispersionTerm));
  const consistencyScore = Number(rawScore.toFixed(3));

  // Check pairwise discrepancies
  let maxDiscrepancy = 0;
  const divergencePairs: Array<{
    modalityA: SignalModality;
    modalityB: SignalModality;
    delta: number;
  }> = [];

  for (let i = 0; i < estimates.length; i++) {
    for (let j = i + 1; j < estimates.length; j++) {
      const delta = Math.abs(estimates[i].value - estimates[j].value);
      if (delta > maxDiscrepancy) {
        maxDiscrepancy = delta;
      }
      if (delta > CONSISTENCY_CONFIG.DIVERGENCE_THRESHOLD) {
        divergencePairs.push({
          modalityA: estimates[i].modality,
          modalityB: estimates[j].modality,
          delta,
        });
      }
    }
  }

  const divergenceDetected = maxDiscrepancy > CONSISTENCY_CONFIG.DIVERGENCE_THRESHOLD;

  return {
    dimension,
    consistencyScore,
    divergenceDetected,
    maxDiscrepancy,
    participatingModalities: estimates.map((e) => e.modality),
    divergencePairs,
  };
}

/**
 * Formulates neutral, strictly non-diagnostic explainability evidence for cross-modal consistency
 */
export function generateCrossModalEvidence(
  dimension: StateDimensionKey,
  consistency: CrossModalConsistency,
  estimates: ModalityEstimate[],
  fusedValue: number,
  baselineValue: number
): StateEvidenceItem[] {
  const evidence: StateEvidenceItem[] = [];
  const nowIso = new Date().toISOString();

  // 1. Divergence Evidence (if max discrepancy > 30)
  if (consistency.divergenceDetected && consistency.divergencePairs.length > 0) {
    for (const pair of consistency.divergencePairs) {
      const estA = estimates.find((e) => e.modality === pair.modalityA);
      const estB = estimates.find((e) => e.modality === pair.modalityB);
      const valA = estA ? estA.value : 'N/A';
      const valB = estB ? estB.value : 'N/A';

      const labelA = formatModalityLabel(pair.modalityA);
      const labelB = formatModalityLabel(pair.modalityB);

      // STRICT NON-DIAGNOSTIC PHRASING:
      // No "masking", "subconscious suppression", "alexithymia", "psychiatric distress"
      const observation = `Divergence noted between ${labelA} (${valA}) and ${labelB} (${valB}); reporting ${dimension} with lower confidence.`;

      evidence.push({
        id: `ev-div-${dimension}-${pair.modalityA}-${pair.modalityB}`,
        source: pair.modalityA,
        observation,
        dimension,
        contribution: 'neutral',
        directionText: `Delta: ${pair.delta} pts`,
        weight: 0.9,
        confidence: 0.85,
        timestamp: nowIso,
      });
    }
  }

  // 2. Corroboration Evidence (if >= 2 independent modalities agree closely)
  const isCorroborated =
    consistency.consistencyScore !== null &&
    consistency.consistencyScore >= CONSISTENCY_CONFIG.CORROBORATION_MIN_SCORE &&
    consistency.maxDiscrepancy <= CONSISTENCY_CONFIG.CORROBORATION_MAX_DELTA &&
    estimates.length >= 2;

  if (isCorroborated) {
    const labels = estimates.map((e) => formatModalityLabel(e.modality)).join(' and ');
    const observation = `Multiple modalities (${labels}) corroborate consistent ${dimension} indicators near ${Math.round(fusedValue)}.`;

    const delta = fusedValue - baselineValue;
    let contribution: EvidenceContribution = 'reinforcing';
    if (delta > 4) contribution = 'elevating';
    else if (delta < -4) contribution = 'lowering';

    evidence.push({
      id: `ev-corrob-${dimension}`,
      source: estimates[0].modality,
      observation,
      dimension,
      contribution,
      directionText: `${delta >= 0 ? '+' : ''}${Math.round(delta)} vs baseline`,
      weight: 1.0,
      confidence: 0.95,
      timestamp: nowIso,
    });
  }

  return evidence;
}

function formatModalityLabel(modality: SignalModality): string {
  switch (modality) {
    case 'mood_checkin':
      return 'self-report check-in';
    case 'text_journal':
      return 'journal reflection';
    case 'voice_transcript':
      return 'acoustic voice analysis';
    case 'companion_session':
      return 'companion dialogue';
    case 'camera_behavior':
      return 'camera behavioral analysis';
    case 'intervention_outcome':
      return 'intervention response';
    default:
      return modality.replace(/_/g, ' ');
  }
}
