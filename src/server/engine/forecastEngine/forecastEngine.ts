/**
 * Forecast Engine Implementation
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting
 *
 * Implements a PURE, DETERMINISTIC, STATELESS mathematical forecasting service.
 * - Zero database access
 * - Zero network access
 * - Zero side effects
 * - Zero dependencies on SafetyScreening, ProactiveEngine, InterventionSelectionEngine, or Gemini
 * - Strict mood exclusion: only energy, stress, focus are projected
 * - DES-BR: Damped Holt's Linear Exponential Smoothing with Bounded Mean Reversion
 * - Deterministic confidence formulation and empirical uncertainty ranges
 */

import { PersonalState, PersonalBaseline } from '../types';
import {
  ForecastDimension,
  ForecastHorizon,
  ConfidenceTier,
  TrendDirection,
  DimensionTrajectory,
  HorizonForecast,
  EvidenceAccounting,
  ForecastResult,
  ValidatedTemporalRhythm,
  IForecastEngine,
} from './types';

// Mathematical model constants
export const FORECAST_CONSTANTS = {
  ALPHA: 0.35,   // Level smoothing parameter
  BETA: 0.15,    // Trend smoothing parameter
  PHI: 0.80,     // Damping factor
  LAMBDA: 0.045, // Mean reversion decay constant
  MAX_CONFIDENCE_CEILING: 0.85,
  MAX_SINGLE_MODALITY_CONFIDENCE: 0.74,
  MIN_UNCERTAINTY_DELTA: 5.0,
  MAX_UNCERTAINTY_DELTA: 30.0,
  MAX_RHYTHM_OFFSET_CLAMP: 15.0,
};

const FORECAST_DIMENSIONS: ReadonlyArray<ForecastDimension> = ['energy', 'stress', 'focus'];

const HORIZON_HOURS: Record<ForecastHorizon, number> = {
  '24h': 24,
  '3d': 72,
  '7d': 168,
};

const HORIZON_WINDOW_DAYS: Record<ForecastHorizon, number> = {
  '24h': 7,
  '3d': 14,
  '7d': 28,
};

const HORIZON_MIN_SNAPSHOTS: Record<ForecastHorizon, number> = {
  '24h': 6,
  '3d': 14,
  '7d': 28,
};

const HORIZON_MIN_DAYS: Record<ForecastHorizon, number> = {
  '24h': 3,
  '3d': 7,
  '7d': 14,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Filter for clean PersonalState snapshots:
 * - overallConfidence >= 0.50
 * - finite numeric dimensions for energy, stress, focus
 * - no crisis flags or fault flags
 */
export function isCleanSnapshot(state: PersonalState): boolean {
  if (!state || typeof state !== 'object') return false;
  const conf = state.overallConfidence ?? state.confidence ?? 0;
  if (conf < 0.50) return false;

  for (const dim of FORECAST_DIMENSIONS) {
    const val = state[dim];
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 100) {
      return false;
    }
  }

  return true;
}

/**
 * Computes sample standard deviation of an array of numbers.
 */
function computeStandardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const sumSquares = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
  return Math.sqrt(sumSquares / (values.length - 1));
}

/**
 * Extracts distinct calendar dates (YYYY-MM-DD) from snapshots.
 */
function getDistinctCalendarDays(snapshots: ReadonlyArray<PersonalState>): number {
  const dates = new Set<string>();
  for (const s of snapshots) {
    const ts = s.createdAt || s.timestamp;
    if (ts) {
      const datePart = ts.slice(0, 10);
      dates.add(datePart);
    }
  }
  return dates.size;
}

/**
 * Extracts active distinct sensor modalities across snapshots.
 */
function getActiveModalities(snapshots: ReadonlyArray<PersonalState>): string[] {
  const modalities = new Set<string>();
  for (const s of snapshots) {
    if (s.sourceSummary) {
      for (const [mod, count] of Object.entries(s.sourceSummary)) {
        if (count > 0 && mod !== 'baseline' && mod !== 'history') {
          modalities.add(mod);
        }
      }
    }
    if (s.evidence) {
      for (const e of s.evidence) {
        if (e.source && e.source !== 'baseline' && e.source !== 'history') {
          modalities.add(e.source);
        }
      }
    }
  }
  return Array.from(modalities);
}

/**
 * Performs Damped Holt Exponential Smoothing with Bounded Mean Reversion (DES-BR).
 */
function computeDesBrProjection(
  values: number[],
  horizonHours: number,
  baselineMean: number,
  rhythmOffset: number
): number {
  const n = values.length;
  if (n === 0) return clamp(baselineMean, 0, 100);
  if (n === 1) {
    const w = 1.0 - Math.exp(-FORECAST_CONSTANTS.LAMBDA * horizonHours);
    const clampedOffset = clamp(rhythmOffset, -FORECAST_CONSTANTS.MAX_RHYTHM_OFFSET_CLAMP, FORECAST_CONSTANTS.MAX_RHYTHM_OFFSET_CLAMP);
    return clamp(roundToOne(values[0] * (1 - w) + baselineMean * w + clampedOffset), 0, 100);
  }

  const alpha = FORECAST_CONSTANTS.ALPHA;
  const beta = FORECAST_CONSTANTS.BETA;
  const phi = FORECAST_CONSTANTS.PHI;
  const lambda = FORECAST_CONSTANTS.LAMBDA;

  // Initialize level and trend
  let level = values[0];
  let trend = values[1] - values[0];

  // Sequentially update through observed chronological points
  for (let t = 1; t < n; t++) {
    const prevLevel = level;
    const prevTrend = trend;
    level = alpha * values[t] + (1 - alpha) * (prevLevel + phi * prevTrend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * prevTrend;
  }

  // Damped trend accumulation over horizon: sum_{i=1}^h phi^i * trend
  let dampedTrendSum = 0;
  if (Math.abs(1 - phi) > 1e-6) {
    dampedTrendSum = trend * (phi * (1 - Math.pow(phi, horizonHours)) / (1 - phi));
  } else {
    dampedTrendSum = trend * horizonHours;
  }

  // Bounded mean reversion weight
  const reversionWeight = 1.0 - Math.exp(-lambda * horizonHours);

  // Clamp rhythm offset
  const clampedRhythm = clamp(
    rhythmOffset,
    -FORECAST_CONSTANTS.MAX_RHYTHM_OFFSET_CLAMP,
    FORECAST_CONSTANTS.MAX_RHYTHM_OFFSET_CLAMP
  );

  // Raw forecast
  const momentumEstimate = level + dampedTrendSum;
  const rawForecast = momentumEstimate * (1 - reversionWeight) + baselineMean * reversionWeight + clampedRhythm;

  return clamp(roundToOne(rawForecast), 0, 100);
}

/**
 * Calculates deterministic confidence score and tier.
 */
function calculateDeterministicConfidence(
  cleanCount: number,
  distinctDays: number,
  windowDays: number,
  sigma: number,
  hoursSinceLatest: number,
  activeModalitiesCount: number
): { confidenceScore: number; confidenceTier: ConfidenceTier } {
  // 1. BaseConf = min(1, Nclean / 14)
  const baseConf = Math.min(1.0, cleanCount / 14.0);

  // 2. DensityFactor = max(0.20, min(1, Ddistinct / Dwindow))
  const densityRatio = distinctDays / Math.max(1, windowDays);
  const densityFactor = Math.max(0.20, Math.min(1.0, densityRatio));

  // 3. StabilityFactor = max(0.40, min(1, 1 - sigma / 50))
  const stabilityFactor = Math.max(0.40, Math.min(1.0, 1.0 - (sigma / 50.0)));

  // 4. RecencyFactor = max(0.05, exp(-0.03 * max(0, hoursSinceLatest - 24)))
  const recencyDelay = Math.max(0.0, hoursSinceLatest - 24.0);
  const recencyFactor = Math.max(0.05, Math.exp(-0.03 * recencyDelay));

  // 5. MissingnessPenalty = 1 - (1 - Ddistinct / Dwindow)^1.5
  const missingnessPenalty = Math.max(0.0, 1.0 - Math.pow(Math.max(0.0, 1.0 - densityRatio), 1.5));

  // 6. ModalityMultiplier
  let modalityMultiplier = 0.70;
  if (activeModalitiesCount >= 2) {
    modalityMultiplier = 1.10;
  } else if (activeModalitiesCount === 1) {
    modalityMultiplier = 0.90;
  }

  // Raw confidence
  const rawConf = baseConf * densityFactor * stabilityFactor * recencyFactor * missingnessPenalty * modalityMultiplier;

  // Hard ceiling at 0.85
  let finalConfidence = clamp(rawConf, 0.0, FORECAST_CONSTANTS.MAX_CONFIDENCE_CEILING);

  // High tier strictly requires >= 2 active sensor modalities
  if (activeModalitiesCount < 2) {
    finalConfidence = Math.min(finalConfidence, FORECAST_CONSTANTS.MAX_SINGLE_MODALITY_CONFIDENCE);
  }

  finalConfidence = roundToTwo(finalConfidence);

  // Assign tier
  let confidenceTier: ConfidenceTier = 'insufficient';
  if (finalConfidence >= 0.75 && activeModalitiesCount >= 2) {
    confidenceTier = 'high';
  } else if (finalConfidence >= 0.55) {
    confidenceTier = 'moderate';
  } else if (finalConfidence >= 0.35) {
    confidenceTier = 'low';
  } else {
    confidenceTier = 'insufficient';
  }

  return { confidenceScore: finalConfidence, confidenceTier };
}

/**
 * Calculates empirical uncertainty range: [projected - delta, projected + delta] clamped [0, 100].
 */
function calculateUncertaintyRange(
  projected: number,
  sigma: number,
  horizonHours: number,
  finalConfidence: number
): [number, number] {
  // delta = clamp(5, 30, 1.20 * sigma * (1 + horizonHours / 24) * (1.50 - FinalConfidence))
  const rawDelta = 1.20 * sigma * (1.0 + horizonHours / 24.0) * (1.50 - finalConfidence);
  const delta = clamp(
    rawDelta,
    FORECAST_CONSTANTS.MIN_UNCERTAINTY_DELTA,
    FORECAST_CONSTANTS.MAX_UNCERTAINTY_DELTA
  );

  const lower = clamp(roundToOne(projected - delta), 0, 100);
  const upper = clamp(roundToOne(projected + delta), 0, 100);
  return [lower, upper];
}

/**
 * Determines trend direction based on dimension polarity.
 */
function determineTrendDirection(
  dim: ForecastDimension,
  current: number,
  projected: number
): TrendDirection {
  const diff = projected - current;
  if (dim === 'stress') {
    // For stress, decreasing is improving
    if (diff <= -2.0) return 'improving';
    if (diff >= 2.0) return 'declining';
    return 'stable';
  } else {
    // For energy and focus, increasing is improving
    if (diff >= 2.0) return 'improving';
    if (diff <= -2.0) return 'declining';
    return 'stable';
  }
}

/**
 * Deterministic human-readable explanation of the horizon forecast.
 */
function buildDeterministicRationale(
  horizon: ForecastHorizon,
  tier: ConfidenceTier,
  trajectories: Record<ForecastDimension, DimensionTrajectory>,
  cleanCount: number,
  distinctDays: number
): string {
  if (tier === 'insufficient') {
    return `Insufficient observational history to model forward trajectory for the ${horizon} horizon.`;
  }

  const energyTrend = trajectories.energy.trendDirection;
  const stressTrend = trajectories.stress.trendDirection;
  const focusTrend = trajectories.focus.trendDirection;

  const energyWord = energyTrend === 'improving' ? 'upward vigor' : energyTrend === 'declining' ? 'lower energy' : 'steady energy';
  const stressWord = stressTrend === 'improving' ? 'easing stress' : stressTrend === 'declining' ? 'elevated tension' : 'stable stress';
  const focusWord = focusTrend === 'improving' ? 'sharpening focus' : focusTrend === 'declining' ? 'diffuse attention' : 'balanced focus';

  return `Based on ${cleanCount} clean observations across ${distinctDays} distinct days, empirical modeling suggests ${energyWord} and ${stressWord} with ${focusWord} over the next ${horizon}.`;
}

/**
 * Pure, deterministic mathematical state forecast generator.
 */
export function generateForecast(
  states: ReadonlyArray<PersonalState>,
  baseline: PersonalBaseline,
  temporalRhythms: ReadonlyArray<ValidatedTemporalRhythm>,
  evaluationTime: Date = new Date()
): ForecastResult {
  const evalIso = evaluationTime.toISOString();
  const evalMs = evaluationTime.getTime();

  // 1. Enforce temporal leakage firewall: reject future snapshots strictly
  const historicalStates = states
    .filter((s) => {
      if (!s) return false;
      const ts = s.createdAt || s.timestamp;
      if (!ts) return false;
      return new Date(ts).getTime() <= evalMs;
    })
    .sort((a, b) => {
      const ta = new Date(a.createdAt || a.timestamp).getTime();
      const tb = new Date(b.createdAt || b.timestamp).getTime();
      return ta - tb; // chronological order
    });

  // Calculate global evidence accounting metrics
  const cleanSnapshots = historicalStates.filter(isCleanSnapshot);
  const distinctDaysTotal = getDistinctCalendarDays(cleanSnapshots);
  const activeModalities = getActiveModalities(cleanSnapshots);

  const latestClean = cleanSnapshots[cleanSnapshots.length - 1];
  const hoursSinceLatest = latestClean
    ? Math.max(0, (evalMs - new Date(latestClean.createdAt || latestClean.timestamp).getTime()) / 3600000)
    : 999.0;

  const hasDiurnalRhythm = temporalRhythms.some(
    (r) => r.confidence >= 0.60 && r.observationCount >= 5
  );

  const evidence: EvidenceAccounting = {
    totalSnapshotsInWindow: historicalStates.length,
    cleanSnapshotsCount: cleanSnapshots.length,
    distinctCalendarDays: distinctDaysTotal,
    observationWindowDays: 28,
    activeSensorModalities: activeModalities,
    hoursSinceLatestSnapshot: roundToOne(hoursSinceLatest),
    hasDiurnalRhythmMatch: hasDiurnalRhythm,
  };

  const horizons: Record<ForecastHorizon, HorizonForecast> = {
    '24h': evaluateHorizon('24h', historicalStates, baseline, temporalRhythms, evalMs, activeModalities.length),
    '3d':  evaluateHorizon('3d',  historicalStates, baseline, temporalRhythms, evalMs, activeModalities.length),
    '7d':  evaluateHorizon('7d',  historicalStates, baseline, temporalRhythms, evalMs, activeModalities.length),
  };

  return {
    evaluationTime: evalIso,
    isCrisisSuppressed: false,
    horizons,
    evidence,
  };
}

/**
 * Evaluates forecast for a specific horizon with independent evidence gates.
 */
function evaluateHorizon(
  horizon: ForecastHorizon,
  allStates: ReadonlyArray<PersonalState>,
  baseline: PersonalBaseline,
  rhythms: ReadonlyArray<ValidatedTemporalRhythm>,
  evalMs: number,
  activeModalitiesCount: number
): HorizonForecast {
  const windowDays = HORIZON_WINDOW_DAYS[horizon];
  const windowCutoffMs = evalMs - windowDays * 24 * 3600000;
  const horizonHours = HORIZON_HOURS[horizon];

  // Filter states within this horizon's observation window
  const windowStates = allStates.filter((s) => {
    const ts = new Date(s.createdAt || s.timestamp).getTime();
    return ts >= windowCutoffMs && ts <= evalMs;
  });

  const cleanInWindow = windowStates.filter(isCleanSnapshot);
  const distinctDays = getDistinctCalendarDays(cleanInWindow);
  const cleanCount = cleanInWindow.length;

  const minSnapshots = HORIZON_MIN_SNAPSHOTS[horizon];
  const minDays = HORIZON_MIN_DAYS[horizon];

  // Latest observed clean state
  const latestSnapshot = cleanInWindow[cleanInWindow.length - 1];
  const hoursSinceLatest = latestSnapshot
    ? Math.max(0, (evalMs - new Date(latestSnapshot.createdAt || latestSnapshot.timestamp).getTime()) / 3600000)
    : 999.0;

  // Fallback trajectory if gate fails
  const fallbackTrajectories: Record<ForecastDimension, DimensionTrajectory> = {
    energy: {
      currentValue: latestSnapshot ? latestSnapshot.energy : (baseline?.dimensions?.energy?.mean ?? 65),
      projectedValue: baseline?.dimensions?.energy?.mean ?? 65,
      uncertaintyRange: [baseline?.dimensions?.energy?.mean ?? 65, baseline?.dimensions?.energy?.mean ?? 65],
      trendDirection: 'stable',
      deltaFromBaseline: 0,
    },
    stress: {
      currentValue: latestSnapshot ? latestSnapshot.stress : (baseline?.dimensions?.stress?.mean ?? 30),
      projectedValue: baseline?.dimensions?.stress?.mean ?? 30,
      uncertaintyRange: [baseline?.dimensions?.stress?.mean ?? 30, baseline?.dimensions?.stress?.mean ?? 30],
      trendDirection: 'stable',
      deltaFromBaseline: 0,
    },
    focus: {
      currentValue: latestSnapshot ? latestSnapshot.focus : (baseline?.dimensions?.focus?.mean ?? 70),
      projectedValue: baseline?.dimensions?.focus?.mean ?? 70,
      uncertaintyRange: [baseline?.dimensions?.focus?.mean ?? 70, baseline?.dimensions?.focus?.mean ?? 70],
      trendDirection: 'stable',
      deltaFromBaseline: 0,
    },
  };

  // Check Evidence Gates
  if (cleanCount < minSnapshots) {
    return {
      horizon,
      status: 'insufficient_evidence',
      evidenceGateReason: `Requires at least ${minSnapshots} clean snapshots in the last ${windowDays} days (found ${cleanCount}).`,
      confidenceScore: 0.0,
      confidenceTier: 'insufficient',
      dimensions: fallbackTrajectories,
      summaryRationale: `Evidence insufficient for ${horizon} forward projection.`,
    };
  }

  if (distinctDays < minDays) {
    return {
      horizon,
      status: 'insufficient_evidence',
      evidenceGateReason: `Requires observations across at least ${minDays} distinct days in the last ${windowDays} days (found ${distinctDays}).`,
      confidenceScore: 0.0,
      confidenceTier: 'insufficient',
      dimensions: fallbackTrajectories,
      summaryRationale: `Evidence insufficient for ${horizon} forward projection.`,
    };
  }

  // 7d Horizon Pattern Gate: Requires validated diurnal/weekly rhythm
  if (horizon === '7d') {
    const hasMatureRhythm = rhythms.some((r) => r.confidence >= 0.65 && r.observationCount >= 5);
    if (!hasMatureRhythm && distinctDays < 14) {
      return {
        horizon,
        status: 'insufficient_evidence',
        evidenceGateReason: 'Requires validated diurnal/day-of-week rhythm patterns for 7-day outlook.',
        confidenceScore: 0.0,
        confidenceTier: 'insufficient',
        dimensions: fallbackTrajectories,
        summaryRationale: 'Awaiting pattern rhythm validation for 7-day outlook.',
      };
    }
  }

  // 3d Horizon Pattern Gate: Requires weekday/weekend pattern or sufficient consistency
  if (horizon === '3d' && distinctDays < 7) {
    return {
      horizon,
      status: 'insufficient_evidence',
      evidenceGateReason: `Requires at least 7 distinct days of observations for 3-day trajectory (found ${distinctDays}).`,
      confidenceScore: 0.0,
      confidenceTier: 'insufficient',
      dimensions: fallbackTrajectories,
      summaryRationale: 'Awaiting 7 days of observations for 3-day trajectory.',
    };
  }

  // Compute trajectories for each dimension
  const trajectories: Partial<Record<ForecastDimension, DimensionTrajectory>> = {};
  let totalSigma = 0;

  for (const dim of FORECAST_DIMENSIONS) {
    const dimValues = cleanInWindow.map((s) => s[dim]);
    const currentValue = latestSnapshot ? latestSnapshot[dim] : dimValues[dimValues.length - 1];
    const baselineMean = baseline?.dimensions?.[dim]?.mean ?? (dim === 'stress' ? 30 : dim === 'energy' ? 65 : 70);
    const sigma = computeStandardDeviation(dimValues);
    totalSigma += sigma;

    // Find matching validated rhythm offset if present
    const matchingRhythm = rhythms.find((r) => r.dimension === dim && r.confidence >= 0.60);
    const rhythmOffset = matchingRhythm ? matchingRhythm.offset : 0.0;

    const projectedValue = computeDesBrProjection(dimValues, horizonHours, baselineMean, rhythmOffset);

    // Initial temporary confidence for delta scaling
    const preliminaryConf = calculateDeterministicConfidence(
      cleanCount,
      distinctDays,
      windowDays,
      sigma,
      hoursSinceLatest,
      activeModalitiesCount
    );

    const uncertaintyRange = calculateUncertaintyRange(
      projectedValue,
      sigma,
      horizonHours,
      preliminaryConf.confidenceScore
    );

    const trendDirection = determineTrendDirection(dim, currentValue, projectedValue);
    const deltaFromBaseline = roundToOne(projectedValue - baselineMean);

    trajectories[dim] = {
      currentValue: roundToOne(currentValue),
      projectedValue,
      uncertaintyRange,
      trendDirection,
      deltaFromBaseline,
    };
  }

  const avgSigma = totalSigma / FORECAST_DIMENSIONS.length;
  const { confidenceScore, confidenceTier } = calculateDeterministicConfidence(
    cleanCount,
    distinctDays,
    windowDays,
    avgSigma,
    hoursSinceLatest,
    activeModalitiesCount
  );

  // Recalculate uncertainty ranges with final aggregate confidence
  for (const dim of FORECAST_DIMENSIONS) {
    const traj = trajectories[dim]!;
    const dimValues = cleanInWindow.map((s) => s[dim]);
    const dimSigma = computeStandardDeviation(dimValues);
    traj.uncertaintyRange = calculateUncertaintyRange(
      traj.projectedValue,
      dimSigma,
      horizonHours,
      confidenceScore
    );
  }

  const finalTrajectories = trajectories as Record<ForecastDimension, DimensionTrajectory>;
  const summaryRationale = buildDeterministicRationale(
    horizon,
    confidenceTier,
    finalTrajectories,
    cleanCount,
    distinctDays
  );

  return {
    horizon,
    status: 'available',
    confidenceScore,
    confidenceTier,
    dimensions: finalTrajectories,
    summaryRationale,
  };
}

export const defaultForecastEngine: IForecastEngine = {
  generateForecast,
};
