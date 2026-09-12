/**
 * Camera Signal Provider & Behavioral Baseline Engine
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 *
 * Translates client-computed, privacy-preserved camera behavioral metrics
 * into standardized WellnessSignal records for ingestion by the Personal State Engine.
 *
 * STRICT PRIVACY & NON-DIAGNOSTIC PRINCIPLES:
 * - 100% on-device client extraction: No raw frames, video, images, or face embeddings
 *   are ever transmitted to the server or stored.
 * - Zero emotion taxonomy: Strictly avoids pseudo-scientific facial emotion classification
 *   (e.g., "happy", "sad", "angry", "fear", "anxiety", "depression").
 * - Observable motor dynamics only: Evaluates measurable physical behavioral correlates
 *   such as head movement velocity, head pose variance, facial activity index, and blink rate.
 * - Non-causal, probabilistic language:
 *   "Observed motor dynamics and head movement velocity are consistent with recent baseline."
 *   "Elevated blink frequency and quiet facial dynamics observed relative to baseline."
 * - No direct mapping to mood or cognitiveLoad. StateEngine remains the sole authority.
 * - Single-modality confidence strictly capped at <= 0.80.
 * - Reliability weight calibrated at 0.65.
 */

import { randomUUID } from 'node:crypto';
import {
  SignalProvider,
  WellnessSignal,
  SignalModality,
  DimensionEstimate,
  StateDimensionKey,
} from './types';
import { isValidUuid } from './providers';

export interface CameraBehavioralMetrics {
  sessionDurationSeconds: number; // Duration of the observation window in seconds (>= 30)
  facePresenceRatio: number; // Ratio of sampled frames containing a detected face [0.0, 1.0]
  multipleFacesDetected: boolean; // Flag if multiple face clusters were detected
  trackingQuality: number; // Optical tracking confidence and illumination adequacy [0.0, 1.0]
  headMovementVelocity: number; // Normalized rotational / translational velocity (>= 0)
  headPoseVariance: number; // Postural variability from 2D motion centroid position variance across the session (>= 0)
  facialActivityIndex: number; // Normalized frame-to-frame facial landmark/intensity dynamics [0.0, 1.0]
  blinkRatePerMinute: number; // Eye blink cadence extrapolated to per-minute rate (>= 0)
  confidence?: number; // Engineering tracking confidence [0.0, 1.0]
}

export interface CameraBehavioralBaseline {
  userId: string;
  avgBlinkRatePerMinute: number;
  avgHeadMovementVelocity: number;
  avgHeadPoseVariance: number;
  avgFacialActivityIndex: number;
  observationCount: number;
  isPreliminary: boolean; // true if 1-2 sessions, false if >= 3 valid sessions (Mature)
  lastUpdated: string;
}

export interface CameraObservationInput {
  id?: string;
  userId: string;
  timestamp?: string;
  metrics: CameraBehavioralMetrics;
  sourceId?: string;
  cameraBaseline?: CameraBehavioralBaseline | null;
}

/**
 * Computes the user's historical camera behavioral baseline from past signals.
 * Requires at least 3 valid historical observations to transition from preliminary to mature.
 *
 * CONSERVATIVE CONTAMINATION FILTERING RULES:
 * 1. Exclude if feat.trackingQuality < 0.40 or non-finite / missing.
 * 2. Exclude if feat.facePresenceRatio < 0.80 or non-finite / missing.
 * 3. Exclude if feat.multipleFacesDetected === true (multi-user frame contamination).
 * 4. Exclude if feat.sessionDurationSeconds < 30 or non-finite / missing.
 * 5. Exclude if any core metric contains NaN, Infinity, or negative values.
 * 6. Exclude extreme statistical outliers outside physiological bounds.
 *
 * FILTER FIRST, THEN COUNT:
 * Only clean sessions meeting all criteria count toward the maturity threshold.
 */
export function computeCameraBaseline(
  userId: string,
  historySignals: WellnessSignal[]
): CameraBehavioralBaseline | null {
  const cameraSignals = historySignals.filter(
    (s) => s.userId === userId && s.modality === 'camera_behavior' && s.features
  );

  if (cameraSignals.length === 0) {
    return null;
  }

  const validSignals: WellnessSignal[] = [];

  for (const s of cameraSignals) {
    const feat = s.features as Record<string, any>;
    if (!feat || typeof feat !== 'object' || Object.keys(feat).length === 0) {
      continue;
    }

    // 1. Tracking quality gate: minimum 0.40
    if (
      typeof feat.trackingQuality !== 'number' ||
      !Number.isFinite(feat.trackingQuality) ||
      feat.trackingQuality < 0.40 ||
      feat.trackingQuality > 1.0
    ) {
      continue;
    }

    // 2. Face presence ratio gate: minimum 0.80
    if (
      typeof feat.facePresenceRatio !== 'number' ||
      !Number.isFinite(feat.facePresenceRatio) ||
      feat.facePresenceRatio < 0.80 ||
      feat.facePresenceRatio > 1.0
    ) {
      continue;
    }

    // 3. Multi-face exclusion
    if (feat.multipleFacesDetected === true) {
      continue;
    }

    // 4. Session duration gate: minimum 30 seconds, maximum 300 seconds
    if (
      typeof feat.sessionDurationSeconds !== 'number' ||
      !Number.isFinite(feat.sessionDurationSeconds) ||
      feat.sessionDurationSeconds < 30 ||
      feat.sessionDurationSeconds > 300
    ) {
      continue;
    }

    // 5. Finiteness & physiological bounds on contributing features:
    // blinkRatePerMinute [2, 100]
    if (
      typeof feat.blinkRatePerMinute !== 'number' ||
      !Number.isFinite(feat.blinkRatePerMinute) ||
      feat.blinkRatePerMinute < 2 ||
      feat.blinkRatePerMinute > 100
    ) {
      continue;
    }

    // headMovementVelocity [0, 80]
    if (
      typeof feat.headMovementVelocity !== 'number' ||
      !Number.isFinite(feat.headMovementVelocity) ||
      feat.headMovementVelocity < 0 ||
      feat.headMovementVelocity > 80
    ) {
      continue;
    }

    // headPoseVariance [0, 400]
    if (
      typeof feat.headPoseVariance !== 'number' ||
      !Number.isFinite(feat.headPoseVariance) ||
      feat.headPoseVariance < 0 ||
      feat.headPoseVariance > 400
    ) {
      continue;
    }

    // facialActivityIndex [0.0, 1.0]
    if (
      typeof feat.facialActivityIndex !== 'number' ||
      !Number.isFinite(feat.facialActivityIndex) ||
      feat.facialActivityIndex < 0.0 ||
      feat.facialActivityIndex > 1.0
    ) {
      continue;
    }

    validSignals.push(s);
  }

  const observationCount = validSignals.length;
  if (observationCount === 0) {
    return null;
  }

  let totalBlink = 0;
  let totalVelocity = 0;
  let totalPoseVar = 0;
  let totalActivity = 0;

  for (const s of validSignals) {
    const feat = s.features as Record<string, any>;
    totalBlink += feat.blinkRatePerMinute;
    totalVelocity += feat.headMovementVelocity;
    totalPoseVar += feat.headPoseVariance;
    totalActivity += feat.facialActivityIndex;
  }

  const isPreliminary = observationCount < 3;

  return {
    userId,
    avgBlinkRatePerMinute: Number((totalBlink / observationCount).toFixed(1)),
    avgHeadMovementVelocity: Number((totalVelocity / observationCount).toFixed(2)),
    avgHeadPoseVariance: Number((totalPoseVar / observationCount).toFixed(2)),
    avgFacialActivityIndex: Number((totalActivity / observationCount).toFixed(2)),
    observationCount,
    isPreliminary,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Camera Signal Provider implementing the standardized SignalProvider contract.
 */
export class CameraSignalProvider implements SignalProvider<CameraObservationInput> {
  public readonly modality: SignalModality = 'camera_behavior';

  public extractSignals(input: CameraObservationInput): WellnessSignal[] {
    const timestamp = input.timestamp || new Date().toISOString();
    const { metrics, cameraBaseline } = input;

    // Calibrated neutral equilibrium across motor-responsive dimensions
    let stressScore = 30;
    let fatigueScore = 35;
    let energyScore = 65;
    let focusScore = 70;

    const reasons: string[] = [];

    // 1. Behavioral Baseline Comparison
    if (cameraBaseline && !cameraBaseline.isPreliminary) {
      const blinkDelta = metrics.blinkRatePerMinute - cameraBaseline.avgBlinkRatePerMinute;
      const velDelta = metrics.headMovementVelocity - cameraBaseline.avgHeadMovementVelocity;
      const varDelta = metrics.headPoseVariance - cameraBaseline.avgHeadPoseVariance;
      const actDelta = metrics.facialActivityIndex - cameraBaseline.avgFacialActivityIndex;

      // Case A: High blink rate elevation or marked drop in facial activity -> Somatic fatigue
      if (blinkDelta >= 6 || (blinkDelta >= 3 && actDelta <= -0.12)) {
        const fatigueAdj = Math.min(12, Math.max(4, Math.round(blinkDelta * 0.75)));
        fatigueScore = Math.min(75, fatigueScore + fatigueAdj);
        energyScore = Math.max(30, energyScore - fatigueAdj);
        reasons.push('Elevated blink frequency and quiet facial dynamics observed relative to baseline');
      }
      // Case B: High movement velocity or high pose variance -> Somatic restlessness / stress arousal
      else if (velDelta >= 5 || (velDelta >= 2.5 && varDelta >= 8)) {
        const stressAdj = Math.min(12, Math.max(4, Math.round(velDelta * 0.8)));
        stressScore = Math.min(75, stressScore + stressAdj);
        reasons.push('Elevated head movement velocity and postural variability observed relative to baseline');
      }
      // Case C: High postural stability & measured gaze -> Sustained focus
      // Proportional adjustment: stronger baseline-relative stability deviation produces
      // stronger focus evidence. No fixed-point jumps.
      //   stabilityIndex = |velDelta| × 0.5 + |varDelta| × 0.1
      //   focusAdj       = clamp(round(stabilityIndex), min=2, max=12)
      // Weaker deviation → smaller adjustment; larger deviation → larger, bounded adjustment.
      else if (velDelta <= -1.5 && varDelta <= -4 && Math.abs(blinkDelta) <= 5) {
        const stabilityIndex = Math.abs(velDelta) * 0.5 + Math.abs(varDelta) * 0.1;
        const focusAdj = Math.min(12, Math.max(2, Math.round(stabilityIndex)));
        focusScore = Math.min(85, focusScore + focusAdj);
        reasons.push('High head pose stability and steady gaze orientation observed relative to baseline');
      }
      // Case D: Consistent with personal baseline
      else {
        reasons.push('Observed motor dynamics and head movement velocity are consistent with recent baseline');
      }
    } else {
      // Preliminary or absent baseline: conservative mild physiological heuristic bounds
      if (metrics.blinkRatePerMinute >= 30 && metrics.facialActivityIndex <= 0.20) {
        fatigueScore = Math.min(48, fatigueScore + 6);
        energyScore = Math.max(50, energyScore - 6);
        reasons.push('Elevated blink frequency and quiet facial dynamics observed');
      } else if (metrics.headMovementVelocity >= 16 && metrics.headPoseVariance >= 28) {
        stressScore = Math.min(48, stressScore + 6);
        reasons.push('Elevated motor activity and variable head orientation observed');
      } else {
        reasons.push('Behavioral metrics calibrating with initial camera baseline');
      }
    }

    // 2. Engineering Confidence Computation
    // Bound strictly between 0.20 and 0.80 (Single-modality cap = 0.80)
    // Defensive finiteness guard: NaN or Infinity in confidence inputs must not propagate,
    // even when extractSignals() is called directly (bypassing the HTTP controller).
    const rawBaseConf = metrics.confidence ?? (metrics.trackingQuality * metrics.facePresenceRatio);
    const safeBaseConf = Number.isFinite(rawBaseConf) ? rawBaseConf : 0.0;
    const baselineBonus = cameraBaseline && !cameraBaseline.isPreliminary ? 0.08 : 0.0;
    const finalConfidence = Number(
      Math.max(0.20, Math.min(0.80, safeBaseConf * 0.75 + baselineBonus)).toFixed(2)
    );

    // 3. Structured Observation Summary (Probabilistic, strictly non-causal)
    const observationSummary =
      reasons[0] || 'Camera behavioral metrics contribute moderate evidence toward current state balance.';

    // Motor dynamics inform fatigue, stress, energy, and focus.
    // Strictly NO direct mapping for mood or cognitiveLoad.
    const estimates: Partial<Record<StateDimensionKey, DimensionEstimate>> = {
      stress: { value: Math.round(stressScore), confidence: finalConfidence },
      fatigue: { value: Math.round(fatigueScore), confidence: finalConfidence },
      energy: { value: Math.round(energyScore), confidence: finalConfidence },
      focus: { value: Math.round(focusScore), confidence: Number((finalConfidence * 0.90).toFixed(2)) },
    };

    const expiresAt = new Date(new Date(timestamp).getTime() + 24 * 60 * 60 * 1000).toISOString();

    const signal: WellnessSignal = {
      id: randomUUID(),
      userId: input.userId,
      timestamp,
      modality: this.modality,
      sourceId: isValidUuid(input.sourceId) ? input.sourceId : undefined,
      estimates,
      features: {
        sessionDurationSeconds: metrics.sessionDurationSeconds,
        facePresenceRatio: metrics.facePresenceRatio,
        multipleFacesDetected: metrics.multipleFacesDetected,
        trackingQuality: metrics.trackingQuality,
        headMovementVelocity: metrics.headMovementVelocity,
        headPoseVariance: metrics.headPoseVariance,
        facialActivityIndex: metrics.facialActivityIndex,
        blinkRatePerMinute: metrics.blinkRatePerMinute,
        sentimentSummary: observationSummary,
      } as any,
      reliabilityWeight: 0.65, // Calibrated behavioral camera sensor inference weight
      expiresAt,
    };

    return [signal];
  }
}
