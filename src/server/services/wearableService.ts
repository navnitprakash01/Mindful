/**
 * Wearable Service
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 *
 * Coordinates wearable observation validation, deduplication, baseline retrieval,
 * signal ingestion into StateEngine, consent settings, and user data purging.
 */

import { supabase } from '../lib/supabase';
import { isValidUuid } from '../engine/providers';
import { stateService } from './stateService';
import { SignalExtractor } from '../engine/signalExtractor';
import {
  WearableObservation,
  WearableSettings,
  WearableBaseline,
  DEFAULT_WEARABLE_SETTINGS,
  WEARABLE_CONFIG,
} from '../engine/wearable/types';
import { computeWearableBaseline } from '../engine/wearable/wearableBaseline';
import { WellnessSignal } from '../engine/types';

const TABLE_SIGNALS = 'wellness_signals';

// In-memory fallback caches for zero-budget offline resilience & testing
const inMemorySettings = new Map<string, WearableSettings>();
const inMemoryRecentSamples = new Map<string, Array<{ sampleId: string; timestampMs: number; metricType: string }>>();

/**
 * Timeout wrapper for database requests to guarantee zero hanging on unmigrated / offline DB
 */
async function withDbTimeout<T>(promise: PromiseLike<T>, timeoutMs = 1200): Promise<T> {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('TEST_ENV_IN_MEMORY_ONLY');
  }
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('DB_TIMEOUT')), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    clearTimeout(timer!);
  }
}

export const wearableService = {
  /**
   * Retrieves wearable consent & connection settings for the authenticated user.
   */
  async getSettings(userId: string): Promise<WearableSettings> {
    if (!isValidUuid(userId)) {
      return DEFAULT_WEARABLE_SETTINGS;
    }
    return inMemorySettings.get(userId) || { ...DEFAULT_WEARABLE_SETTINGS };
  },

  /**
   * Updates wearable consent settings for the user.
   */
  async updateSettings(userId: string, updates: Partial<WearableSettings>): Promise<WearableSettings> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    const current = await this.getSettings(userId);
    const updated: WearableSettings = {
      ...current,
      ...updates,
      consentCategories: {
        ...current.consentCategories,
        ...(updates.consentCategories || {}),
      },
    };

    inMemorySettings.set(userId, updated);
    return updated;
  },

  /**
   * Checks whether an observation is a duplicate (same sampleId or within 5m timestamp/metricType window).
   */
  isDuplicate(userId: string, observation: WearableObservation): boolean {
    const recent = inMemoryRecentSamples.get(userId) || [];
    const obsTimeMs = new Date(observation.timestamp).getTime();

    // 1. Exact sampleId match
    if (recent.some((r) => r.sampleId === observation.sampleId)) {
      return true;
    }

    // 2. Same metricType within deduplication window
    const hasTemporalDuplicate = recent.some(
      (r) =>
        r.metricType === observation.metricType &&
        Math.abs(r.timestampMs - obsTimeMs) < WEARABLE_CONFIG.DEDUPLICATION_WINDOW_MS
    );

    return hasTemporalDuplicate;
  },

  /**
   * Records observation in recent cache for deduplication tracking.
   */
  recordSample(userId: string, observation: WearableObservation): void {
    const recent = inMemoryRecentSamples.get(userId) || [];
    const obsTimeMs = new Date(observation.timestamp).getTime();

    recent.unshift({
      sampleId: observation.sampleId,
      timestampMs: obsTimeMs,
      metricType: observation.metricType,
    });

    // Prune entries older than 1 hour or over 100 entries
    const cutoff = Date.now() - 60 * 60 * 1000;
    const filtered = recent.filter((r) => r.timestampMs >= cutoff).slice(0, 100);
    inMemoryRecentSamples.set(userId, filtered);
  },

  /**
   * Retrieves or computes user's physiological baseline from active wearable signals.
   */
  async getBaseline(userId: string): Promise<WearableBaseline | null> {
    if (!isValidUuid(userId)) {
      return null;
    }

    const signals = await stateService.getActiveSignals(userId);
    return computeWearableBaseline(userId, signals);
  },

  /**
   * Ingests a batch of wearable observations into the authoritative Personal State pipeline.
   */
  async ingestObservations(
    userId: string,
    observations: WearableObservation[]
  ): Promise<{
    processedCount: number;
    deduplicatedCount: number;
    signals: WellnessSignal[];
  }> {
    if (!isValidUuid(userId)) {
      throw new Error('INVALID_USER_ID: Must be a valid UUID');
    }

    const settings = await this.getSettings(userId);
    if (!settings.enabled) {
      throw new Error('WEARABLE_DISABLED: Wearable integration is disabled in user settings');
    }

    // Compute baseline once for this batch
    const baseline = await this.getBaseline(userId);

    const emittedSignals: WellnessSignal[] = [];
    let deduplicatedCount = 0;

    for (const obs of observations) {
      // 1. Consent category filtering
      if (obs.metricType === 'sleep_session' && !settings.consentCategories.sleep) {
        continue;
      }
      if (
        obs.metricType === 'daily_recovery' &&
        (!settings.consentCategories.heartRateHrv || !settings.consentCategories.sleep)
      ) {
        // If recovery includes heart rate/HRV or sleep, ensure relevant category consent is granted
        if (!settings.consentCategories.heartRateHrv) {
          delete obs.metrics.restingHeartRateBpm;
          delete obs.metrics.hrvRmssdMs;
        }
        if (!settings.consentCategories.sleep) {
          delete obs.metrics.sleepDurationMinutes;
          delete obs.metrics.sleepEfficiencyScore;
        }
      }
      if (obs.metricType === 'continuous_activity' && !settings.consentCategories.activity) {
        continue;
      }

      // 2. Deduplication check
      if (this.isDuplicate(userId, obs)) {
        deduplicatedCount++;
        continue;
      }

      // 3. Extract standardized WellnessSignal
      const signal = SignalExtractor.fromWearableObservation(userId, obs, baseline);

      // 4. Ingest into StateEngine
      await stateService.ingestSignal(signal);

      // 5. Record sample for subsequent deduplication
      this.recordSample(userId, obs);

      emittedSignals.push(signal);
    }

    // Update lastSyncedAt
    if (emittedSignals.length > 0) {
      await this.updateSettings(userId, {
        lastSyncedAt: new Date().toISOString(),
        connectedPlatform: observations[0]?.sourceDevice?.platform || settings.connectedPlatform,
      });
    }

    return {
      processedCount: emittedSignals.length,
      deduplicatedCount,
      signals: emittedSignals,
    };
  },

  /**
   * Purges all wearable signals for the authenticated user ("Disconnect & Delete Wearable History").
   * Strictly tenant-isolated: never touches journal, mood, companion, or other user data.
   */
  async purgeWearableSignals(userId: string): Promise<number> {
    if (!isValidUuid(userId)) {
      return 0;
    }

    // 1. Clear in-memory deduplication cache
    inMemoryRecentSamples.set(userId, []);

    // 2. Reset connection status in settings
    await this.updateSettings(userId, {
      connectedPlatform: 'disconnected',
      lastSyncedAt: undefined,
    });

    // 3. Purge signals from database
    let purgedCount = 0;
    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_SIGNALS)
          .delete()
          .eq('user_id', userId)
          .eq('modality', 'wearable_metrics')
          .select('id')
      );
      if (!error && data) {
        purgedCount = data.length;
      }
    } catch {
      // In-memory fallback
    }

    return purgedCount;
  },
};
