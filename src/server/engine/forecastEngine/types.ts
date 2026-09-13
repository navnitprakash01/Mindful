/**
 * Forecast Engine Domain Types & Contracts
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting
 *
 * Defines strictly bounded types for pure mathematical state forecasting:
 * - Dimensions: energy, stress, focus (0 - 100)
 * - Strict mood exclusion: mood is never forecasted
 * - Horizons: 24h, 3d, 7d with independent evidence gates
 * - Pure stateless mathematical contract
 */

import { PersonalState, PersonalBaseline } from '../types';

export type ForecastDimension = 'energy' | 'stress' | 'focus';
export type ForecastHorizon = '24h' | '3d' | '7d';
export type ConfidenceTier = 'insufficient' | 'low' | 'moderate' | 'high';
export type TrendDirection = 'improving' | 'stable' | 'declining';

export interface ValidatedTemporalRhythm {
  dimension: ForecastDimension;
  timeContext: string;       // e.g. 'morning', 'afternoon', 'evening', 'weekday', 'weekend'
  offset: number;            // Additive rhythm adjustment in [-15, +15]
  confidence: number;        // 0.00 - 1.00
  observationCount: number;
}

export interface DimensionTrajectory {
  currentValue: number;               // 0.0 - 100.0 (latest observed snapshot)
  projectedValue: number;             // 0.0 - 100.0 (damped trend + mean reversion)
  uncertaintyRange: [number, number]; // [lower, upper] strictly clamped to [0.0, 100.0]
  trendDirection: TrendDirection;
  deltaFromBaseline: number;          // projectedValue - baselineValue
}

export interface HorizonForecast {
  horizon: ForecastHorizon;
  status: 'available' | 'insufficient_evidence';
  evidenceGateReason?: string;
  confidenceScore: number;            // 0.00 - 0.85 (hard ceiling at 0.85)
  confidenceTier: ConfidenceTier;
  dimensions: Record<ForecastDimension, DimensionTrajectory>;
  summaryRationale: string;           // Deterministic rule-based description
}

export interface EvidenceAccounting {
  totalSnapshotsInWindow: number;
  cleanSnapshotsCount: number;
  distinctCalendarDays: number;
  observationWindowDays: number;
  activeSensorModalities: string[];
  hoursSinceLatestSnapshot: number;
  hasDiurnalRhythmMatch: boolean;
}

export interface ForecastResult {
  evaluationTime: string;             // ISO-8601 UTC
  isCrisisSuppressed: boolean;
  horizons: Record<ForecastHorizon, HorizonForecast>;
  evidence: EvidenceAccounting;
}

export interface IForecastEngine {
  generateForecast(
    states: ReadonlyArray<PersonalState>,
    baseline: PersonalBaseline,
    temporalRhythms: ReadonlyArray<ValidatedTemporalRhythm>,
    evaluationTime?: Date
  ): ForecastResult;
}
