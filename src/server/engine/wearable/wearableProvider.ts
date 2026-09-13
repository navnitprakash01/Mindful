/**
 * Wearable Signal Provider & Abstraction
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 *
 * Implements provider-independent normalization from WearableObservation records
 * into standardized WellnessSignal instances.
 *
 * NON-CLINICAL GUARANTEES:
 * - Direct mapping is strictly limited to: stress, fatigue, energy, focus.
 * - Under NO circumstances are mood or cognitiveLoad directly set from wearable sensors.
 * - Confidence is strictly bounded <= 0.80.
 * - Reliability weight calibrated at 0.65.
 * - Wording is probabilistic, observational, and strictly non-causal.
 */

import { randomUUID } from 'node:crypto';
import {
  WellnessSignal,
  DimensionEstimate,
  StateDimensionKey,
} from '../types';
import { isValidUuid } from '../providers';
import {
  WearableObservation,
  WearableBaseline,
  WearableCapability,
  PHYSIOLOGICAL_BOUNDS,
  WEARABLE_CONFIG,
} from './types';

export interface WearableProvider {
  readonly providerId: string;
  readonly displayName: string;
  getCapabilities(): WearableCapability[];
  validateObservation(observation: WearableObservation): { isValid: boolean; reason?: string };
  extractSignals(
    userId: string,
    observation: WearableObservation,
    baseline?: WearableBaseline | null
  ): WellnessSignal[];
}

export class WearableSignalProvider implements WearableProvider {
  public readonly providerId: string = 'generic_wearable';
  public readonly displayName: string = 'Generic Wearable Provider';

  public getCapabilities(): WearableCapability[] {
    return ['heart_rate', 'hrv', 'sleep', 'activity'];
  }

  /**
   * Validates a single observation against structural, temporal, and physiological bounds.
   */
  public validateObservation(observation: WearableObservation): { isValid: boolean; reason?: string } {
    if (!observation || typeof observation !== 'object') {
      return { isValid: false, reason: 'Observation must be a valid object' };
    }

    if (!observation.sampleId || typeof observation.sampleId !== 'string' || !observation.sampleId.trim()) {
      return { isValid: false, reason: 'sampleId is required' };
    }

    if (!observation.timestamp || isNaN(new Date(observation.timestamp).getTime())) {
      return { isValid: false, reason: 'Invalid or missing ISO 8601 timestamp' };
    }

    const { observationPeriod } = observation;
    if (!observationPeriod || typeof observationPeriod !== 'object') {
      return { isValid: false, reason: 'observationPeriod object is required' };
    }

    const startMs = new Date(observationPeriod.start).getTime();
    const endMs = new Date(observationPeriod.end).getTime();
    if (isNaN(startMs) || isNaN(endMs)) {
      return { isValid: false, reason: 'observationPeriod start and end must be valid ISO 8601 dates' };
    }

    if (endMs < startMs) {
      return { isValid: false, reason: 'observationPeriod end cannot be earlier than start' };
    }

    // Quality Score Validation
    if (
      typeof observation.qualityScore !== 'number' ||
      !Number.isFinite(observation.qualityScore) ||
      observation.qualityScore < PHYSIOLOGICAL_BOUNDS.qualityScore.min ||
      observation.qualityScore > PHYSIOLOGICAL_BOUNDS.qualityScore.max
    ) {
      return { isValid: false, reason: 'qualityScore must be a finite number between 0.0 and 1.0' };
    }

    if (observation.qualityScore < PHYSIOLOGICAL_BOUNDS.qualityScore.minimumAcceptable) {
      return {
        isValid: false,
        reason: `qualityScore (${observation.qualityScore}) is below minimum acceptable threshold (${PHYSIOLOGICAL_BOUNDS.qualityScore.minimumAcceptable})`,
      };
    }

    const { metrics } = observation;
    if (!metrics || typeof metrics !== 'object') {
      return { isValid: false, reason: 'metrics object is required' };
    }

    // Physiological bound & finiteness validations
    if (metrics.restingHeartRateBpm !== undefined) {
      if (
        typeof metrics.restingHeartRateBpm !== 'number' ||
        !Number.isFinite(metrics.restingHeartRateBpm) ||
        metrics.restingHeartRateBpm < PHYSIOLOGICAL_BOUNDS.restingHeartRateBpm.min ||
        metrics.restingHeartRateBpm > PHYSIOLOGICAL_BOUNDS.restingHeartRateBpm.max
      ) {
        return {
          isValid: false,
          reason: `restingHeartRateBpm must be between ${PHYSIOLOGICAL_BOUNDS.restingHeartRateBpm.min} and ${PHYSIOLOGICAL_BOUNDS.restingHeartRateBpm.max}`,
        };
      }
    }

    if (metrics.hrvRmssdMs !== undefined) {
      if (
        typeof metrics.hrvRmssdMs !== 'number' ||
        !Number.isFinite(metrics.hrvRmssdMs) ||
        metrics.hrvRmssdMs < PHYSIOLOGICAL_BOUNDS.hrvRmssdMs.min ||
        metrics.hrvRmssdMs > PHYSIOLOGICAL_BOUNDS.hrvRmssdMs.max
      ) {
        return {
          isValid: false,
          reason: `hrvRmssdMs must be between ${PHYSIOLOGICAL_BOUNDS.hrvRmssdMs.min} and ${PHYSIOLOGICAL_BOUNDS.hrvRmssdMs.max}`,
        };
      }
    }

    if (metrics.sleepDurationMinutes !== undefined) {
      if (
        typeof metrics.sleepDurationMinutes !== 'number' ||
        !Number.isFinite(metrics.sleepDurationMinutes) ||
        metrics.sleepDurationMinutes < PHYSIOLOGICAL_BOUNDS.sleepDurationMinutes.min ||
        metrics.sleepDurationMinutes > PHYSIOLOGICAL_BOUNDS.sleepDurationMinutes.max
      ) {
        return {
          isValid: false,
          reason: `sleepDurationMinutes must be between ${PHYSIOLOGICAL_BOUNDS.sleepDurationMinutes.min} and ${PHYSIOLOGICAL_BOUNDS.sleepDurationMinutes.max}`,
        };
      }
    }

    if (metrics.deepSleepMinutes !== undefined) {
      if (
        typeof metrics.deepSleepMinutes !== 'number' ||
        !Number.isFinite(metrics.deepSleepMinutes) ||
        metrics.deepSleepMinutes < PHYSIOLOGICAL_BOUNDS.deepSleepMinutes.min ||
        metrics.deepSleepMinutes > PHYSIOLOGICAL_BOUNDS.deepSleepMinutes.max
      ) {
        return {
          isValid: false,
          reason: `deepSleepMinutes must be between ${PHYSIOLOGICAL_BOUNDS.deepSleepMinutes.min} and ${PHYSIOLOGICAL_BOUNDS.deepSleepMinutes.max}`,
        };
      }
    }

    if (metrics.remSleepMinutes !== undefined) {
      if (
        typeof metrics.remSleepMinutes !== 'number' ||
        !Number.isFinite(metrics.remSleepMinutes) ||
        metrics.remSleepMinutes < PHYSIOLOGICAL_BOUNDS.remSleepMinutes.min ||
        metrics.remSleepMinutes > PHYSIOLOGICAL_BOUNDS.remSleepMinutes.max
      ) {
        return {
          isValid: false,
          reason: `remSleepMinutes must be between ${PHYSIOLOGICAL_BOUNDS.remSleepMinutes.min} and ${PHYSIOLOGICAL_BOUNDS.remSleepMinutes.max}`,
        };
      }
    }

    if (metrics.sleepEfficiencyScore !== undefined) {
      if (
        typeof metrics.sleepEfficiencyScore !== 'number' ||
        !Number.isFinite(metrics.sleepEfficiencyScore) ||
        metrics.sleepEfficiencyScore < PHYSIOLOGICAL_BOUNDS.sleepEfficiencyScore.min ||
        metrics.sleepEfficiencyScore > PHYSIOLOGICAL_BOUNDS.sleepEfficiencyScore.max
      ) {
        return {
          isValid: false,
          reason: `sleepEfficiencyScore must be between ${PHYSIOLOGICAL_BOUNDS.sleepEfficiencyScore.min} and ${PHYSIOLOGICAL_BOUNDS.sleepEfficiencyScore.max}`,
        };
      }
    }

    if (metrics.stepCount !== undefined) {
      if (
        typeof metrics.stepCount !== 'number' ||
        !Number.isFinite(metrics.stepCount) ||
        metrics.stepCount < PHYSIOLOGICAL_BOUNDS.stepCount.min ||
        metrics.stepCount > PHYSIOLOGICAL_BOUNDS.stepCount.max
      ) {
        return {
          isValid: false,
          reason: `stepCount must be between ${PHYSIOLOGICAL_BOUNDS.stepCount.min} and ${PHYSIOLOGICAL_BOUNDS.stepCount.max}`,
        };
      }
    }

    if (metrics.activeMinutes !== undefined) {
      if (
        typeof metrics.activeMinutes !== 'number' ||
        !Number.isFinite(metrics.activeMinutes) ||
        metrics.activeMinutes < PHYSIOLOGICAL_BOUNDS.activeMinutes.min ||
        metrics.activeMinutes > PHYSIOLOGICAL_BOUNDS.activeMinutes.max
      ) {
        return {
          isValid: false,
          reason: `activeMinutes must be between ${PHYSIOLOGICAL_BOUNDS.activeMinutes.min} and ${PHYSIOLOGICAL_BOUNDS.activeMinutes.max}`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Extracts standardized WellnessSignal from a validated WearableObservation.
   */
  public extractSignals(
    userId: string,
    observation: WearableObservation,
    baseline?: WearableBaseline | null
  ): WellnessSignal[] {
    const validation = this.validateObservation(observation);
    if (!validation.isValid) {
      throw new Error(`INVALID_WEARABLE_OBSERVATION: ${validation.reason}`);
    }

    const { metrics, qualityScore, timestamp } = observation;

    // Neutral baseline equilibrium scores
    let stressScore = 30;
    let fatigueScore = 35;
    let energyScore = 65;
    let focusScore = 70;

    const reasons: string[] = [];
    const hasMatureBaseline = Boolean(baseline && !baseline.isPreliminary);

    // 1. SLEEP MAPPING: Informs fatigue and energy
    if (typeof metrics.sleepDurationMinutes === 'number') {
      const baselineSleep = hasMatureBaseline && baseline ? baseline.avgSleepDurationMinutes : 450; // 7.5 hours
      const sleepDeltaMinutes = metrics.sleepDurationMinutes - baselineSleep;

      if (sleepDeltaMinutes <= -60) {
        // Significant sleep deficit (>= 1 hr below baseline)
        const deficitHours = Math.abs(sleepDeltaMinutes) / 60;
        const fatigueAdj = Math.min(18, Math.max(6, Math.round(deficitHours * 6)));
        fatigueScore = Math.min(80, fatigueScore + fatigueAdj);
        energyScore = Math.max(30, energyScore - fatigueAdj);
        reasons.push('Sleep duration was below your recent personal baseline');
      } else if (sleepDeltaMinutes >= 45) {
        // Restorative sleep
        fatigueScore = Math.max(20, fatigueScore - 8);
        energyScore = Math.min(85, energyScore + 8);
        reasons.push('Restorative sleep duration consistent with physical recovery');
      } else {
        reasons.push('Sleep duration aligns with your recent baseline');
      }

      // Incorporate sleep efficiency if provided
      if (typeof metrics.sleepEfficiencyScore === 'number') {
        if (metrics.sleepEfficiencyScore < 75) {
          fatigueScore = Math.min(80, fatigueScore + 6);
          energyScore = Math.max(30, energyScore - 6);
        }
      }
    }

    // 2. AUTONOMIC MAPPING: Informs stress and energy
    if (typeof metrics.hrvRmssdMs === 'number' || typeof metrics.restingHeartRateBpm === 'number') {
      const baselineHrv = hasMatureBaseline && baseline ? baseline.avgHrvRmssdMs : 45;
      const baselineRhr = hasMatureBaseline && baseline ? baseline.avgRestingHeartRateBpm : 65;

      const hrvRatio = typeof metrics.hrvRmssdMs === 'number' ? metrics.hrvRmssdMs / baselineHrv : 1.0;
      const rhrDelta = typeof metrics.restingHeartRateBpm === 'number' ? metrics.restingHeartRateBpm - baselineRhr : 0;

      if (hrvRatio <= 0.80 || rhrDelta >= 6) {
        // Autonomic tension / lower vagal tone
        const stressAdj = Math.min(16, Math.max(4, Math.round((1 - Math.min(1, hrvRatio)) * 20 + Math.max(0, rhrDelta * 0.8))));
        stressScore = Math.min(78, stressScore + stressAdj);
        energyScore = Math.max(35, energyScore - Math.round(stressAdj * 0.5));
        reasons.push('Autonomic indicators reflect elevated physiological tension relative to baseline');
      } else if (hrvRatio >= 1.15 && rhrDelta <= -2) {
        // High vagal recovery / low sympathetic tone
        stressScore = Math.max(15, stressScore - 8);
        energyScore = Math.min(85, energyScore + 6);
        reasons.push('Autonomic indicators indicate favorable physiological recovery');
      } else {
        reasons.push('Autonomic recovery markers align with your typical recent baseline');
      }
    }

    // 3. ACTIVITY MAPPING: Informs energy and focus
    if (typeof metrics.activeMinutes === 'number' || typeof metrics.stepCount === 'number') {
      const baselineActive = hasMatureBaseline && baseline ? baseline.avgActiveMinutes : 45;
      const activeDelta = typeof metrics.activeMinutes === 'number' ? metrics.activeMinutes - baselineActive : 0;

      if (activeDelta >= 20 || (metrics.stepCount && metrics.stepCount >= 10000)) {
        energyScore = Math.min(85, energyScore + 8);
        focusScore = Math.min(80, focusScore + 4);
        reasons.push('Daytime movement and active periods support biological vitality');
      } else if (activeDelta <= -30 && (metrics.stepCount && metrics.stepCount < 3000)) {
        energyScore = Math.max(40, energyScore - 6);
        reasons.push('Lower physical activity observed relative to your recent active pattern');
      }
    }

    // 4. Engineering Confidence Computation (Bounded <= 0.80)
    const baseConfidence = 0.55 * qualityScore;
    const baselineBonus = hasMatureBaseline ? 0.12 : 0.04;
    const finalConfidence = Number(
      Math.max(0.20, Math.min(WEARABLE_CONFIG.CONFIDENCE_CAP, baseConfidence + baselineBonus)).toFixed(2)
    );

    // 5. Build Dimension Estimates (Strictly NO mood or cognitiveLoad)
    const estimates: Partial<Record<StateDimensionKey, DimensionEstimate>> = {
      stress: { value: Math.round(stressScore), confidence: finalConfidence },
      fatigue: { value: Math.round(fatigueScore), confidence: finalConfidence },
      energy: { value: Math.round(energyScore), confidence: finalConfidence },
      focus: { value: Math.round(focusScore), confidence: Number((finalConfidence * 0.85).toFixed(2)) },
    };

    const ttlHours = observation.metricType === 'continuous_activity' ? 6 : 24;
    const expiresAt = new Date(new Date(timestamp).getTime() + ttlHours * 60 * 60 * 1000).toISOString();

    const summaryText = reasons.length > 0
      ? reasons[0]
      : 'Wearable physiological observation informs baseline-relative state balance.';

    const signal: WellnessSignal = {
      id: randomUUID(),
      userId,
      timestamp,
      modality: 'wearable_metrics',
      sourceId: isValidUuid(observation.sampleId) ? observation.sampleId : undefined,
      estimates,
      features: {
        restingHeartRateBpm: metrics.restingHeartRateBpm,
        hrvRmssdMs: metrics.hrvRmssdMs,
        sleepDurationMinutes: metrics.sleepDurationMinutes,
        deepSleepMinutes: metrics.deepSleepMinutes,
        remSleepMinutes: metrics.remSleepMinutes,
        sleepEfficiencyScore: metrics.sleepEfficiencyScore,
        stepCount: metrics.stepCount,
        activeMinutes: metrics.activeMinutes,
        qualityScore,
        metricType: observation.metricType,
        sourcePlatform: observation.sourceDevice?.platform || 'mock',
        sentimentSummary: summaryText,
      } as any,
      reliabilityWeight: WEARABLE_CONFIG.RELIABILITY_WEIGHT,
      expiresAt,
    };

    return [signal];
  }
}
