/**
 * Wearable & Behavioral Signal Domain Contracts
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 *
 * Defines strongly typed contracts, physiological boundary constraints,
 * baseline schemas, and consent settings.
 */

export type WearableMetricType =
  | 'daily_recovery'
  | 'sleep_session'
  | 'continuous_activity';

export type WearablePlatform =
  | 'mock'
  | 'apple_health'
  | 'health_connect'
  | 'fitbit'
  | 'garmin';

export type WearableCapability =
  | 'heart_rate'
  | 'hrv'
  | 'sleep'
  | 'activity';

export interface WearableMetrics {
  restingHeartRateBpm?: number;
  hrvRmssdMs?: number;
  sleepDurationMinutes?: number;
  deepSleepMinutes?: number;
  remSleepMinutes?: number;
  sleepEfficiencyScore?: number;
  stepCount?: number;
  activeMinutes?: number;
}

export interface ObservationPeriod {
  start: string; // ISO 8601 UTC
  end: string;   // ISO 8601 UTC
}

export interface SourceDeviceInfo {
  platform: WearablePlatform;
  model?: string;
}

export interface WearableObservation {
  sampleId: string;
  timestamp: string; // ISO 8601 UTC
  observationPeriod: ObservationPeriod;
  metricType: WearableMetricType;
  metrics: WearableMetrics;
  qualityScore: number; // 0.00 - 1.00
  sourceDevice?: SourceDeviceInfo;
}

export interface WearableBaseline {
  userId: string;
  avgRestingHeartRateBpm: number;
  avgHrvRmssdMs: number;
  avgSleepDurationMinutes: number;
  avgSleepEfficiencyScore: number;
  avgActiveMinutes: number;
  observationCount: number;
  isPreliminary: boolean; // true if < 3 valid observations, false if >= 3
  lastUpdated: string;
}

export interface WearableConsentCategories {
  sleep: boolean;
  heartRateHrv: boolean;
  activity: boolean;
}

export interface WearableSettings {
  enabled: boolean;
  consentCategories: WearableConsentCategories;
  connectedPlatform: WearablePlatform | 'disconnected';
  lastSyncedAt?: string;
}

export const DEFAULT_WEARABLE_SETTINGS: WearableSettings = {
  enabled: false, // Default is OFF; explicit opt-in required
  consentCategories: {
    sleep: true,
    heartRateHrv: true,
    activity: true,
  },
  connectedPlatform: 'disconnected',
};

/**
 * Strict physiological bounds for non-clinical validation.
 * Reject or exclude any values outside these human ranges.
 */
export const PHYSIOLOGICAL_BOUNDS = {
  restingHeartRateBpm: { min: 30, max: 220 },
  hrvRmssdMs: { min: 5, max: 300 },
  sleepDurationMinutes: { min: 0, max: 1440 }, // 0 to 24 hours
  deepSleepMinutes: { min: 0, max: 720 },       // 0 to 12 hours
  remSleepMinutes: { min: 0, max: 720 },        // 0 to 12 hours
  sleepEfficiencyScore: { min: 0, max: 100 },
  stepCount: { min: 0, max: 100000 },
  activeMinutes: { min: 0, max: 1440 },
  qualityScore: { min: 0.0, max: 1.0, minimumAcceptable: 0.50 },
} as const;

export const WEARABLE_CONFIG = {
  MAX_PAYLOAD_BYTES: 50 * 1024, // 50 KB max JSON payload
  CONFIDENCE_CAP: 0.80,         // Single-modality confidence strictly <= 0.80
  RELIABILITY_WEIGHT: 0.65,     // Calibrated wearable sensor reliability weight
  DEDUPLICATION_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  MIN_OBSERVATIONS_FOR_MATURE_BASELINE: 3,
};
