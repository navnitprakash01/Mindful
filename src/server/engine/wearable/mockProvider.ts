/**
 * Mock Wearable Provider & Deterministic Fixtures
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 *
 * Provides completely deterministic, offline, zero-budget simulation datasets
 * for unit, integration, and security test suites.
 */

import {
  WearableObservation,
  WearableCapability,
} from './types';
import { WearableProvider, WearableSignalProvider } from './wearableProvider';
import { WellnessSignal } from '../types';
import { WearableBaseline } from './types';

export class MockWearableProvider implements WearableProvider {
  public readonly providerId: string = 'mock';
  public readonly displayName: string = 'Mindful Simulated Wearable';
  private signalProvider = new WearableSignalProvider();

  public getCapabilities(): WearableCapability[] {
    return ['heart_rate', 'hrv', 'sleep', 'activity'];
  }

  public validateObservation(observation: WearableObservation) {
    return this.signalProvider.validateObservation(observation);
  }

  public extractSignals(
    userId: string,
    observation: WearableObservation,
    baseline?: WearableBaseline | null
  ): WellnessSignal[] {
    return this.signalProvider.extractSignals(userId, observation, baseline);
  }

  /**
   * Deterministic test fixtures covering normal, stressed, depleted, poor-quality,
   * and malformed scenarios.
   */
  public static getFixture(
    type:
      | 'healthy_recovered'
      | 'reduced_sleep'
      | 'elevated_resting_hr'
      | 'reduced_hrv'
      | 'low_activity'
      | 'high_activity'
      | 'missing_metrics'
      | 'poor_quality'
      | 'duplicate'
      | 'malformed_extreme',
    overrides?: Partial<WearableObservation>
  ): WearableObservation {
    const now = new Date();
    const todayIso = now.toISOString();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString();

    const base: WearableObservation = {
      sampleId: '10000000-0000-4000-8000-000000000001',
      timestamp: todayIso,
      observationPeriod: {
        start: eightHoursAgo,
        end: todayIso,
      },
      metricType: 'daily_recovery',
      metrics: {
        restingHeartRateBpm: 62,
        hrvRmssdMs: 48,
        sleepDurationMinutes: 465, // ~7.75h
        deepSleepMinutes: 95,
        remSleepMinutes: 110,
        sleepEfficiencyScore: 88,
        stepCount: 8200,
        activeMinutes: 55,
      },
      qualityScore: 0.95,
      sourceDevice: {
        platform: 'mock',
        model: 'Mindful Simulation Core v1',
      },
    };

    switch (type) {
      case 'healthy_recovered':
        return { ...base, ...overrides };

      case 'reduced_sleep':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000002',
          metrics: {
            ...base.metrics,
            sleepDurationMinutes: 310, // ~5.1h (significant deficit)
            deepSleepMinutes: 35,
            remSleepMinutes: 45,
            sleepEfficiencyScore: 68,
          },
          ...overrides,
        };

      case 'elevated_resting_hr':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000003',
          metrics: {
            ...base.metrics,
            restingHeartRateBpm: 84, // elevated relative to normal 62
          },
          ...overrides,
        };

      case 'reduced_hrv':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000004',
          metrics: {
            ...base.metrics,
            hrvRmssdMs: 18, // suppressed relative to 48
            restingHeartRateBpm: 76,
          },
          ...overrides,
        };

      case 'low_activity':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000005',
          metricType: 'continuous_activity',
          metrics: {
            ...base.metrics,
            stepCount: 1400,
            activeMinutes: 10,
          },
          ...overrides,
        };

      case 'high_activity':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000006',
          metricType: 'continuous_activity',
          metrics: {
            ...base.metrics,
            stepCount: 14500,
            activeMinutes: 90,
          },
          ...overrides,
        };

      case 'missing_metrics':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000007',
          metrics: {
            sleepDurationMinutes: 450,
            // HRV and HR absent
          },
          ...overrides,
        };

      case 'poor_quality':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000008',
          qualityScore: 0.35, // Below 0.50 minimum
          ...overrides,
        };

      case 'duplicate':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000001', // Identical to base
          ...overrides,
        };

      case 'malformed_extreme':
        return {
          ...base,
          sampleId: '10000000-0000-4000-8000-000000000009',
          metrics: {
            ...base.metrics,
            restingHeartRateBpm: 999, // Impossible physiological extreme
          },
          ...overrides,
        };

      default:
        return { ...base, ...overrides };
    }
  }
}
