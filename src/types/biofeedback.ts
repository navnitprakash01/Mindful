/**
 * Somatic Biofeedback & Co-Regulation Domain Contracts & Safety Bounds
 * Mindful 2.0 — Phase 12: In-Session Adaptive Biofeedback & Somatic Co-Regulation Runner
 *
 * Strict Non-Clinical Guarantees:
 * - Purely observable motor stability & somatic stillness; never cardiovascular or emotional claims.
 * - CameraAnalyzer does NOT measure heart rate, pulse, rPPG, or respiratory volume.
 * - Pacing is strictly clamped [7.0s, 12.0s], max delta <= 0.5s per 20s evaluation.
 * - 100% on-device client execution; zero video/frame streaming to backend.
 */

export type BiofeedbackStatus =
  | 'disabled'
  | 'requesting'
  | 'active'
  | 'degraded'
  | 'stopped'
  | 'unavailable';

export type PacingPhase = 'inhale' | 'hold_in' | 'exhale' | 'hold_out';

export interface SomaticMetrics {
  /** Inversely normalized head velocity & pose variance [0..100] */
  stillnessScore: number;
  /** Observable frame-to-frame pixel luminance activity [0..100] */
  facialActivityScore: number;
  /** Extrapolated blink frequency per minute */
  blinkRatePerMinute: number;
  /** Optical illumination & texture quality [0.0..1.0] */
  trackingQuality: number;
  /** Ratio of frames with detected tracking region [0.0..1.0] */
  facePresenceRatio: number;
  /** Multi-face flag to filter shared room contamination */
  multipleFacesDetected: boolean;
  /** Engineering timestamp */
  timestamp: number;
}

export interface PacingState {
  /** Full breathing cycle duration in seconds, clamped [7.0..12.0] */
  cycleSeconds: number;
  /** Inhale duration in seconds */
  inhaleSeconds: number;
  /** Inhale hold duration in seconds (strictly fixed per protocol) */
  holdInSeconds: number;
  /** Exhale duration in seconds */
  exhaleSeconds: number;
  /** Exhale hold duration in seconds (strictly fixed per protocol) */
  holdOutSeconds: number;
  /** Current active breathing phase */
  phase: PacingPhase;
  /** Progress within current phase [0.0..1.0] */
  phaseProgress: number;
  /** Whether the pacer is actively adapting to somatic feedback */
  isAdaptive: boolean;
}

export interface BiofeedbackSessionSummary {
  biofeedbackAssisted: boolean;
  somaticStillnessScore?: number;
  trackingQuality?: number;
  pacingCycleSeconds?: number;
  samplesCount?: number;
}

export const PACING_BOUNDS = {
  MIN_CYCLE_SECONDS: 7.0,
  MAX_CYCLE_SECONDS: 12.0,
  MAX_STEP_DELTA: 0.5,
  EVALUATION_INTERVAL_SECONDS: 20,
  DEAD_BAND_PERCENT: 8.0,
  EMA_ALPHA: 0.20,
  MIN_TRACKING_QUALITY: 0.40,
  MIN_FACE_PRESENCE: 0.70,
  DEGRADED_TIMEOUT_SECONDS: 15,
} as const;

/**
 * Derives a normalized Somatic Stillness Score (0..100) from observable
 * head movement velocity and 2D motion centroid variance.
 * Higher score = greater physical stillness / movement stability.
 * Does NOT diagnose nervous system or psychological state.
 */
export function calculateSomaticStillness(velocity: number, poseVariance: number): number {
  if (!Number.isFinite(velocity) || !Number.isFinite(poseVariance)) {
    return 50;
  }
  const cleanVel = Math.max(0, velocity);
  const cleanVar = Math.max(0, poseVariance);

  // Velocity above 35 units/sec reflects continuous restless movement
  const velFactor = Math.max(0, 1 - cleanVel / 35);
  // Pose variance above 50 reflects significant postural shifting
  const varFactor = Math.max(0, 1 - cleanVar / 50);

  const combined = (velFactor * 0.6 + varFactor * 0.4) * 100;
  return Number(Math.min(100, Math.max(0, combined)).toFixed(1));
}

/**
 * Exponential Moving Average (EMA) smoothing with strict non-finite sanitization.
 */
export function applyEma(
  current: number,
  previous: number | null,
  alpha: number = PACING_BOUNDS.EMA_ALPHA
): number {
  if (!Number.isFinite(current)) {
    return previous !== null && Number.isFinite(previous) ? previous : 50;
  }
  if (previous === null || !Number.isFinite(previous)) {
    return current;
  }
  const clampedAlpha = Math.max(0.01, Math.min(1.0, alpha));
  return Number((clampedAlpha * current + (1 - clampedAlpha) * previous).toFixed(2));
}

/**
 * Evaluates whether an intervention step is semantically compatible with visual breathing pacing.
 */
export function isStepPacingCompatible(
  stepTitle?: string,
  stepInstruction?: string,
  category?: string
): boolean {
  if (!stepTitle && !stepInstruction) return false;
  const text = `${stepTitle || ''} ${stepInstruction || ''}`.toLowerCase();

  // Explicit incompatible exclusion keywords
  if (
    text.includes('write') ||
    text.includes('paper') ||
    text.includes('phone') ||
    text.includes('march') ||
    text.includes('shake out') ||
    text.includes('smell') ||
    text.includes('taste') ||
    text.includes('see 5') ||
    text.includes('touch points') ||
    text.includes('blank note')
  ) {
    return false;
  }

  // Pacing compatible triggers
  if (
    category === 'breathing' ||
    text.includes('inhale') ||
    text.includes('exhale') ||
    text.includes('box breathing') ||
    text.includes('physiological sigh') ||
    text.includes('breathe') ||
    text.includes('breath')
  ) {
    return true;
  }

  return false;
}

/**
 * Deterministic Adaptive Pacing Policy
 *
 * Rules:
 * - Clamped strictly to [7.0, 12.0] seconds.
 * - Maximum step delta <= 0.5 seconds.
 * - Minimum 20 seconds between evaluations.
 * - 8% deadband hysteresis to eliminate jitter/oscillation.
 * - If quality is degraded > 15 seconds, gracefully return to baseCycleSeconds.
 */
export function evaluateAdaptivePacing(params: {
  currentCycleSeconds: number;
  baseCycleSeconds: number;
  smoothedStillness: number;
  baselineStillness: number;
  elapsedSecondsSinceLastEval: number;
  isQualityAcceptable: boolean;
  degradedDurationSeconds: number;
}): { newCycleSeconds: number; shouldUpdate: boolean; resetDegraded: boolean } {
  const {
    currentCycleSeconds,
    baseCycleSeconds,
    smoothedStillness,
    baselineStillness,
    elapsedSecondsSinceLastEval,
    isQualityAcceptable,
    degradedDurationSeconds,
  } = params;

  // 1. Check if quality has been degraded for more than 15s -> return gradually to base
  if (!isQualityAcceptable) {
    if (degradedDurationSeconds >= PACING_BOUNDS.DEGRADED_TIMEOUT_SECONDS) {
      if (Math.abs(currentCycleSeconds - baseCycleSeconds) > 0.05) {
        const step = currentCycleSeconds > baseCycleSeconds ? -0.25 : 0.25;
        const restored = Number(
          Math.min(
            PACING_BOUNDS.MAX_CYCLE_SECONDS,
            Math.max(PACING_BOUNDS.MIN_CYCLE_SECONDS, currentCycleSeconds + step)
          ).toFixed(1)
        );
        return { newCycleSeconds: restored, shouldUpdate: true, resetDegraded: false };
      }
    }
    // Freeze pacer while degraded within timeout window
    return { newCycleSeconds: currentCycleSeconds, shouldUpdate: false, resetDegraded: false };
  }

  // 2. Minimum evaluation interval constraint (20s)
  if (elapsedSecondsSinceLastEval < PACING_BOUNDS.EVALUATION_INTERVAL_SECONDS) {
    return { newCycleSeconds: currentCycleSeconds, shouldUpdate: false, resetDegraded: true };
  }

  // 3. Hysteresis check: delta must exceed 8% deadband
  const deltaPercent = Math.abs(smoothedStillness - baselineStillness);
  if (deltaPercent < PACING_BOUNDS.DEAD_BAND_PERCENT) {
    return { newCycleSeconds: currentCycleSeconds, shouldUpdate: false, resetDegraded: true };
  }

  // 4. Directional pacing adaptation
  // Stillness > baseline + 8% -> gradual deepening (+0.5s toward resonant 11-12s)
  // Stillness < baseline - 8% -> grounding / return to base (-0.5s toward base)
  let targetDelta = 0;
  if (smoothedStillness > baselineStillness + PACING_BOUNDS.DEAD_BAND_PERCENT) {
    targetDelta = PACING_BOUNDS.MAX_STEP_DELTA; // Slow down cycle to allow deeper relaxation
  } else if (smoothedStillness < baselineStillness - PACING_BOUNDS.DEAD_BAND_PERCENT) {
    targetDelta = -PACING_BOUNDS.MAX_STEP_DELTA; // Return toward baseline grounding pace
  }

  const candidate = currentCycleSeconds + targetDelta;
  const clamped = Number(
    Math.min(
      PACING_BOUNDS.MAX_CYCLE_SECONDS,
      Math.max(PACING_BOUNDS.MIN_CYCLE_SECONDS, candidate)
    ).toFixed(1)
  );

  const changed = Math.abs(clamped - currentCycleSeconds) >= 0.1;
  return {
    newCycleSeconds: clamped,
    shouldUpdate: changed,
    resetDegraded: true,
  };
}
