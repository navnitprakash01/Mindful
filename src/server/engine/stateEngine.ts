/**
 * Personal State Engine Core Algorithm
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 * 
 * Mathematical Signal Fusion with Exponential Time-Decay, Calibrated Uncertainty,
 * Structured Evidence Generation, and Dynamic Personal Baseline Reversion.
 */

import { randomUUID } from 'node:crypto';
import {
  PersonalState,
  WellnessDimension,
  WellnessSignal,
  NeutralBaseline,
  PersonalBaseline,
  StateDimensionKey,
  StateEvidenceItem,
  EvidenceContribution,
  STATE_DIMENSION_CONFIG,
} from './types';

export const STATE_ENGINE_CONFIG = {
  HALF_LIFE_HOURS: 12.0,
  MAX_SIGNAL_AGE_HOURS: 48.0,
  DEFAULT_BASELINE: {
    mood: 70,
    stress: 30,
    fatigue: 35,
    energy: 65,
    focus: 70,
    cognitiveLoad: 35,
  } as NeutralBaseline,
};

export class StateEngine {
  private halfLifeHours: number;
  private maxAgeHours: number;
  private defaultBaseline: NeutralBaseline;

  constructor(options?: {
    halfLifeHours?: number;
    maxAgeHours?: number;
    baseline?: NeutralBaseline;
  }) {
    this.halfLifeHours = options?.halfLifeHours ?? STATE_ENGINE_CONFIG.HALF_LIFE_HOURS;
    this.maxAgeHours = options?.maxAgeHours ?? STATE_ENGINE_CONFIG.MAX_SIGNAL_AGE_HOURS;
    this.defaultBaseline = options?.baseline ?? STATE_ENGINE_CONFIG.DEFAULT_BASELINE;
  }

  /**
   * Calculate elapsed age in fractional hours from signal timestamp to reference time
   */
  public getSignalAgeHours(signalTimestamp: string, referenceTime: Date = new Date()): number {
    const signalTime = new Date(signalTimestamp).getTime();
    const refTime = referenceTime.getTime();
    const diffMs = Math.max(0, refTime - signalTime);
    return diffMs / (1000 * 60 * 60);
  }

  /**
   * Exponential time-decay function: w(t) = w0 * 2^(-age / halfLife)
   */
  public computeDecayWeight(signal: WellnessSignal, referenceTime: Date = new Date()): number {
    const ageHours = this.getSignalAgeHours(signal.timestamp, referenceTime);

    // Beyond max age, signal contribution attenuates completely
    if (ageHours >= this.maxAgeHours) {
      return 0.0;
    }

    const decayFactor = Math.pow(0.5, ageHours / this.halfLifeHours);
    return Math.max(0, signal.reliabilityWeight * decayFactor);
  }

  /**
   * Unify active signals into a coherent PersonalState estimate
   */
  public computeState(
    userId: string,
    signals: WellnessSignal[],
    referenceTime: Date = new Date(),
    personalBaseline?: PersonalBaseline | NeutralBaseline
  ): PersonalState {
    const activeSignals: Array<{ signal: WellnessSignal; decayWeight: number }> = [];
    const sourceSummary: Record<string, number> = {};

    // 1. Filter and compute decay weight for each signal
    for (const signal of signals) {
      const decayWeight = this.computeDecayWeight(signal, referenceTime);
      if (decayWeight > 0.01) {
        activeSignals.push({ signal, decayWeight });
        sourceSummary[signal.modality] = (sourceSummary[signal.modality] || 0) + 1;
      }
    }

    // Resolve baseline: user's personal baseline if present, else default
    const baseline: NeutralBaseline = personalBaseline
      ? 'dimensions' in personalBaseline
        ? {
            mood: personalBaseline.dimensions.mood.mean,
            stress: personalBaseline.dimensions.stress.mean,
            fatigue: personalBaseline.dimensions.fatigue.mean,
            energy: personalBaseline.dimensions.energy.mean,
            focus: personalBaseline.dimensions.focus.mean,
            cognitiveLoad: personalBaseline.dimensions.cognitiveLoad.mean,
          }
        : personalBaseline
      : this.defaultBaseline;

    const allEvidence: StateEvidenceItem[] = [];

    // 2. Synthesize each of the 6 wellness dimensions
    const dimensionKeys: StateDimensionKey[] = [
      'mood',
      'stress',
      'fatigue',
      'energy',
      'focus',
      'cognitiveLoad',
    ];

    const dimensions = {} as Record<StateDimensionKey, WellnessDimension>;

    for (const dimKey of dimensionKeys) {
      const meta = STATE_DIMENSION_CONFIG[dimKey];
      const baselineVal = baseline[dimKey] ?? meta.neutralDefault;
      const { dimension, evidence } = this.synthesizeDimension(
        dimKey,
        activeSignals,
        baselineVal,
        meta.higherIsPositive
      );

      dimensions[dimKey] = dimension;
      allEvidence.push(...evidence);
    }

    // 3. Aggregate active somatic sensations & contextual triggers (past 24h)
    const somaticSet = new Set<string>();
    const triggerSet = new Set<string>();

    for (const { signal } of activeSignals) {
      const ageHours = this.getSignalAgeHours(signal.timestamp, referenceTime);
      if (ageHours <= 24.0) {
        signal.features.somaticSensations?.forEach((s) => somaticSet.add(s.trim()));
        signal.features.triggers?.forEach((t) => triggerSet.add(t.trim()));
      }
    }

    // 4. Compute overall state confidence (mean dimension confidence)
    const totalDimConfidence = dimensionKeys.reduce(
      (sum, k) => sum + dimensions[k].confidence,
      0
    );
    const overallConfidence = Number((totalDimConfidence / dimensionKeys.length).toFixed(2));

    const nowIso = referenceTime.toISOString();

    return {
      id: randomUUID(),
      userId,
      timestamp: nowIso,
      createdAt: nowIso,

      // Flat accessors
      mood: dimensions.mood.value,
      stress: dimensions.stress.value,
      fatigue: dimensions.fatigue.value,
      energy: dimensions.energy.value,
      focus: dimensions.focus.value,
      cognitiveLoad: dimensions.cognitiveLoad.value,
      confidence: overallConfidence,

      dimensions,
      evidence: allEvidence,
      sourceSummary,
      overallConfidence,
      somaticMarkers: Array.from(somaticSet).filter(Boolean),
      contextualTriggers: Array.from(triggerSet).filter(Boolean),
      activeSignalsCount: activeSignals.length,
      decayHalfLifeHours: this.halfLifeHours,
    };
  }

  /**
   * Synthesize an individual dimension from active signals
   */
  private synthesizeDimension(
    dimensionKey: StateDimensionKey,
    activeSignals: Array<{ signal: WellnessSignal; decayWeight: number }>,
    baselineValue: number,
    higherIsPositive: boolean
  ): { dimension: WellnessDimension; evidence: StateEvidenceItem[] } {
    const contributing: Array<{
      value: number;
      weight: number;
      signal: WellnessSignal;
    }> = [];

    for (const { signal, decayWeight } of activeSignals) {
      const estimate = signal.estimates[dimensionKey];
      if (estimate && typeof estimate.value === 'number') {
        const effectiveWeight = decayWeight * Math.max(0.1, estimate.confidence);
        contributing.push({
          value: Math.max(0, Math.min(100, estimate.value)),
          weight: effectiveWeight,
          signal,
        });
      }
    }

    // If no active signals contribute to this dimension, return baseline with 0 confidence
    if (contributing.length === 0) {
      return {
        dimension: {
          value: baselineValue,
          confidence: 0.0,
          baselineDeviation: 0,
          trend: 'stable',
          contributingSignalIds: [],
        },
        evidence: [],
      };
    }

    // 1. Weighted average calculation
    let totalWeightedValue = 0;
    let totalWeight = 0;

    for (const item of contributing) {
      totalWeightedValue += item.value * item.weight;
      totalWeight += item.weight;
    }

    const rawEstimatedValue = totalWeight > 0 ? totalWeightedValue / totalWeight : baselineValue;

    // 2. Variance & conflict penalty
    let variance = 0;
    if (contributing.length > 1 && totalWeight > 0) {
      for (const item of contributing) {
        variance += item.weight * Math.pow(item.value - rawEstimatedValue, 2);
      }
      variance /= totalWeight;
    }
    const standardDeviation = Math.sqrt(variance);

    // Conflict penalty: if signals conflict significantly (std dev > 20), discount confidence
    const conflictFactor = Math.max(0.5, 1.0 - standardDeviation / 80.0);

    // Confidence saturation: asymptotic accumulation
    const rawConfidence = (totalWeight / (1.0 + totalWeight)) * conflictFactor;
    const finalConfidence = Math.max(0.0, Math.min(1.0, Number(rawConfidence.toFixed(2))));

    // 3. Blend raw value toward baseline as confidence decreases
    const blendedValue = Math.round(
      finalConfidence * rawEstimatedValue + (1.0 - finalConfidence) * baselineValue
    );

    const baselineDeviation = blendedValue - baselineValue;

    // 4. Trend classification
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (higherIsPositive) {
      if (baselineDeviation >= 5) trend = 'improving';
      else if (baselineDeviation <= -5) trend = 'declining';
    } else {
      if (baselineDeviation <= -5) trend = 'improving';
      else if (baselineDeviation >= 5) trend = 'declining';
    }

    // 5. Generate structured evidence items
    const evidenceItems: StateEvidenceItem[] = contributing.map(({ value, weight, signal }) => {
      const delta = value - baselineValue;
      let contribution: EvidenceContribution = 'neutral';
      if (Math.abs(delta) < 4) {
        contribution = 'reinforcing';
      } else if (delta > 0) {
        contribution = 'elevating';
      } else {
        contribution = 'lowering';
      }

      let observation = `Reported ${dimensionKey} of ${value}`;
      if (signal.modality === 'mood_checkin') {
        const triggers = signal.features.triggers?.join(', ');
        const sensations = signal.features.somaticSensations?.join(', ');
        if (triggers) observation += ` (Triggers: ${triggers})`;
        if (sensations) observation += ` (Sensations: ${sensations})`;
      } else if (signal.modality === 'text_journal' || signal.modality === 'voice_transcript') {
        if (signal.features.sentimentSummary) {
          observation = `Journal reflection: "${signal.features.sentimentSummary}"`;
        }
      } else if (signal.modality === 'companion_session') {
        observation = signal.features.sentimentSummary || 'Companion dialogue interaction';
      }

      return {
        id: `ev-${signal.id}-${dimensionKey}`,
        source: signal.modality,
        observation,
        dimension: dimensionKey,
        contribution,
        directionText: `${delta >= 0 ? '+' : ''}${delta} vs baseline`,
        weight: Number(weight.toFixed(2)),
        confidence: signal.estimates[dimensionKey]?.confidence || 0.8,
        timestamp: signal.timestamp,
        referenceId: signal.sourceId || signal.id,
      };
    });

    return {
      dimension: {
        value: blendedValue,
        confidence: finalConfidence,
        baselineDeviation,
        trend,
        contributingSignalIds: contributing.map((c) => c.signal.id),
      },
      evidence: evidenceItems,
    };
  }
}

export const defaultStateEngine = new StateEngine();
