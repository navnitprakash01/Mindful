/**
 * Uncertainty Decomposition Engine
 * Mindful 2.0 — Phase 6: Explainable AI / Evidence Graph
 *
 * Decomposes existing mathematical confidence into human-interpretable
 * uncertainty reasons without altering or recomputing confidence.
 *
 * STRICT INVARIANT:
 * This module purely explains existing confidence. It does NOT generate
 * a replacement confidence score or second state authority.
 */

import {
  PersonalState,
  StateDimensionKey,
  WellnessSignal,
  PersonalBaseline,
  NeutralBaseline,
} from '../types';
import { UncertaintyExplanation } from './types';

export class UncertaintyEngine {
  /**
   * Decomposes confidence for all 6 dimensions into structured explanations
   */
  public static decompose(
    state: PersonalState,
    signals: WellnessSignal[],
    baseline?: PersonalBaseline | NeutralBaseline,
    referenceTime: Date = new Date()
  ): Record<StateDimensionKey, UncertaintyExplanation[]> {
    const dimensionKeys: StateDimensionKey[] = [
      'mood',
      'stress',
      'fatigue',
      'energy',
      'focus',
      'cognitiveLoad',
    ];

    const result = {} as Record<StateDimensionKey, UncertaintyExplanation[]>;

    for (const dimKey of dimensionKeys) {
      result[dimKey] = this.decomposeDimension(dimKey, state, signals, baseline, referenceTime);
    }

    return result;
  }

  /**
   * Decomposes confidence for a single dimension
   */
  private static decomposeDimension(
    dimensionKey: StateDimensionKey,
    state: PersonalState,
    signals: WellnessSignal[],
    baseline?: PersonalBaseline | NeutralBaseline,
    referenceTime: Date = new Date()
  ): UncertaintyExplanation[] {
    const explanations: UncertaintyExplanation[] = [];
    const dim = state.dimensions[dimensionKey];

    if (!dim) {
      return explanations;
    }

    const activeSignalIds = new Set(dim.contributingSignalIds);
    const contributingSignals = signals.filter((s) => activeSignalIds.has(s.id));
    const nowMs = referenceTime.getTime();

    // 1. Sample Scarcity
    if (contributingSignals.length === 0) {
      explanations.push({
        factor: 'sample_scarcity',
        impact: 'significant',
        explanation: 'No recent check-ins recorded for this dimension; stabilizing at baseline.',
      });
    } else if (contributingSignals.length === 1) {
      explanations.push({
        factor: 'sample_scarcity',
        impact: 'moderate',
        explanation: 'Based on a single recorded check-in; additional observations will refine calibration.',
      });
    }

    // 2. Cross-Modal Divergence
    if (dim.divergenceDetected) {
      explanations.push({
        factor: 'modal_divergence',
        impact: 'significant',
        explanation: 'Recent signals from different modalities show noticeable spread, reducing certainty.',
      });
    }

    // 3. Temporal Decay
    const olderSignals = contributingSignals.filter((s) => {
      const ageHours = Math.max(0, nowMs - new Date(s.timestamp).getTime()) / (1000 * 60 * 60);
      return ageHours >= 6.0;
    });

    if (olderSignals.length > 0 && olderSignals.length === contributingSignals.length) {
      explanations.push({
        factor: 'temporal_decay',
        impact: 'moderate',
        explanation: 'Active observations are several hours old and have gently attenuated over time.',
      });
    } else if (olderSignals.length > 0) {
      explanations.push({
        factor: 'temporal_decay',
        impact: 'minor',
        explanation: 'Some supporting observations are older, providing contextual background rather than immediate state.',
      });
    }

    // 4. Preliminary Baseline
    if (baseline && 'isPreliminary' in baseline && baseline.isPreliminary) {
      explanations.push({
        factor: 'preliminary_baseline',
        impact: 'minor',
        explanation: 'Your personal baseline is still establishing with initial observations.',
      });
    }

    return explanations;
  }
}
