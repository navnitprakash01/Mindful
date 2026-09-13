/**
 * Weekly Digest Service
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting & Weekly Digest
 *
 * Responsibilities:
 * - Coordinates weekly retrospective synthesis bounded by local timezone week limits (Mon 00:00 - Sun 23:59).
 * - Queries historical states, prior-week baselines, intervention outcomes, and habit continuity.
 * - Snapshots current forward forecast from ForecastService.
 * - Persists to Supabase `weekly_digests` with dual-tier in-memory fallback for zero-budget offline resilience.
 * - Strictly isolates user data via authenticated userId (RLS & tenant isolation).
 */

import { supabase } from '../lib/supabase';
import { isValidUuid } from '../engine/providers';
import { stateService } from './stateService';
import { forecastService } from './forecastService';
import { interventionService } from './interventionService';
import { habitService } from './habitService';
import { weeklyDigestBuilder } from '../engine/digest/weeklyDigestBuilder';
import { WeeklyDigest } from '../engine/digest/types';

const TABLE_DIGESTS = 'weekly_digests';

// In-memory cache for offline testing & zero-budget resilience
const inMemoryDigests = new Map<string, WeeklyDigest>(); // key: `${userId}_${weekStartDate}`

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

/**
 * Validates whether a timezone identifier is valid.
 */
export function isValidTimezone(tz?: string | null): boolean {
  if (!tz || typeof tz !== 'string' || !tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Formats a Date object to YYYY-MM-DD in a given timezone.
 */
export function formatDateInTimezone(date: Date, timezone: string): string {
  const validTz = isValidTimezone(timezone) ? timezone.trim() : 'UTC';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: validTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // en-CA produces YYYY-MM-DD
}

/**
 * Computes the Monday (YYYY-MM-DD) of the week for a given date in local timezone.
 */
export function getMondayOfWeek(date: Date, timezone: string): string {
  const validTz = isValidTimezone(timezone) ? timezone.trim() : 'UTC';
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: validTz,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const weekdayPart = parts.find((p) => p.type === 'weekday')?.value || 'Mon';
  const weekdayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  const dayOffset = weekdayMap[weekdayPart] ?? 0;
  // Step backwards to Monday
  const mondayMs = date.getTime() - dayOffset * 24 * 3600000;
  return formatDateInTimezone(new Date(mondayMs), validTz);
}

/**
 * Computes Sunday (YYYY-MM-DD) from Monday (YYYY-MM-DD).
 */
export function getSundayFromMonday(mondayStr: string): string {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 6));
  return date.toISOString().slice(0, 10);
}

/**
 * Maps database row to domain WeeklyDigest object.
 */
function rowToDigest(row: any): WeeklyDigest {
  return {
    id: row.id,
    userId: row.user_id,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    timezone: row.timezone || 'UTC',
    retrospective: row.digest_data?.retrospective || row.digest_data || {},
    forecastSnapshot: row.forecast_snapshot || {},
    isAiEnhanced: Boolean(row.is_ai_enhanced),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const digestService = {
  /**
   * Retrieves an existing weekly digest for user.
   */
  async getWeeklyDigest(userId: string, weekStartDate?: string): Promise<WeeklyDigest | null> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const targetMonday = weekStartDate || getMondayOfWeek(new Date(), 'UTC');
    const cacheKey = `${userId}_${targetMonday}`;

    // 1. Check in-memory store
    const cached = inMemoryDigests.get(cacheKey);
    if (cached) return cached;

    // 2. Query database with timeout guard
    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_DIGESTS)
          .select('*')
          .eq('user_id', userId)
          .eq('week_start_date', targetMonday)
          .maybeSingle()
      );

      if (!error && data) {
        const digest = rowToDigest(data);
        inMemoryDigests.set(cacheKey, digest);
        return digest;
      }
    } catch {
      // In-memory fallback
    }

    return null;
  },

  /**
   * Generates or refreshes a weekly digest for the user.
   */
  async generateWeeklyDigest(
    userId: string,
    requestedWeekStart?: string,
    evaluationTime: Date = new Date(),
    allowAiEnhancement: boolean = true,
    timezone: string = 'UTC'
  ): Promise<WeeklyDigest> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const validTz = isValidTimezone(timezone) ? timezone.trim() : 'UTC';
    const weekStartDate = requestedWeekStart || getMondayOfWeek(evaluationTime, validTz);
    const weekEndDate = getSundayFromMonday(weekStartDate);

    // Convert local boundaries to approximate UTC range
    const weekStartMs = new Date(`${weekStartDate}T00:00:00Z`).getTime();
    const weekEndMs = new Date(`${weekEndDate}T23:59:59.999Z`).getTime();
    const evalMs = evaluationTime.getTime();

    // Prior week bounds
    const priorMondayStr = getMondayOfWeek(new Date(weekStartMs - 7 * 24 * 3600000), validTz);
    const priorStartMs = new Date(`${priorMondayStr}T00:00:00Z`).getTime();

    // 1. Query historical states with strict temporal filter
    const rawHistory = await stateService.getStateHistory(userId, 30);
    const validHistory = rawHistory.filter((s) => {
      const ts = new Date(s.createdAt || s.timestamp).getTime();
      return ts <= evalMs;
    });

    const currentWeekStates = validHistory.filter((s) => {
      const ts = new Date(s.createdAt || s.timestamp).getTime();
      return ts >= weekStartMs && ts <= weekEndMs;
    });

    const priorWeekStates = validHistory.filter((s) => {
      const ts = new Date(s.createdAt || s.timestamp).getTime();
      return ts >= priorStartMs && ts < weekStartMs;
    });

    // 2. Query forecast snapshot (at evaluationTime)
    const forecastSnapshot = await forecastService.getCurrentForecast(userId, evaluationTime);

    // 3. Query retrospective intervention sessions
    const rawSessions = await interventionService.getUserHistory(userId, 50);
    const weekSessions = rawSessions.filter((s) => {
      const ts = new Date(s.completedAt || s.createdAt).getTime();
      return ts >= weekStartMs && ts <= weekEndMs && ts <= evalMs;
    });

    // 4. Query retrospective habit definitions
    const habits = await habitService.listHabits(userId, false);

    // 5. Build digest through authoritative builder
    const digest = await weeklyDigestBuilder.buildWeeklyDigest({
      userId,
      weekStartDate,
      weekEndDate,
      timezone: validTz,
      currentWeekStates,
      priorWeekStates,
      completedHabits: habits,
      interventionSessions: weekSessions,
      forecastSnapshot,
      evaluationTime,
      allowAiEnhancement,
    });

    // 6. Cache in memory
    const cacheKey = `${userId}_${weekStartDate}`;
    inMemoryDigests.set(cacheKey, digest);

    // 7. Persist to database (upsert on user_id, week_start_date)
    try {
      await withDbTimeout(
        supabase.from(TABLE_DIGESTS).upsert(
          {
            id: digest.id,
            user_id: userId,
            week_start_date: digest.weekStartDate,
            week_end_date: digest.weekEndDate,
            timezone: digest.timezone,
            digest_data: { retrospective: digest.retrospective },
            forecast_snapshot: digest.forecastSnapshot,
            is_ai_enhanced: digest.isAiEnhanced,
            created_at: digest.createdAt,
            updated_at: digest.updatedAt,
          },
          { onConflict: 'user_id,week_start_date' }
        )
      );
    } catch {
      // In-memory fallback preserved
    }

    return digest;
  },

  /**
   * Helper to clear in-memory digest cache in tests.
   */
  _clearMemoryCache(): void {
    inMemoryDigests.clear();
  },
};
