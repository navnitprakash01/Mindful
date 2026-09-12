/**
 * Proactive Policy Rules & Centralized Constants
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 *
 * Enforces anti-fatigue limits, quiet hours, cooldowns, and non-manipulative phrasing.
 * Silence is the default state of the engine.
 */

import { ProactiveSettings } from './types';

export const POLICY_VERSION = '1.0.0';

export const POLICY_LIMITS = {
  DEFAULT_COOLDOWN_HOURS: 6.0,
  DISMISSAL_SUPPRESSION_HOURS: 12.0,
  MIN_STATE_CONFIDENCE: 0.25,
  MIN_PATTERN_CONFIDENCE: 0.70,
  MIN_PATTERN_OBSERVATION_COUNT: 5,
  MAX_DAILY_PROACTIVE_LIMIT: 3,
};

export const DEFAULT_PROACTIVE_SETTINGS: ProactiveSettings = {
  enabled: false,             // Strictly default OFF; explicit opt-in required
  frequencyCapPerDay: 1,      // Conservative 1 contact per day default
  quietHoursStart: 22,        // 10:00 PM local time
  quietHoursEnd: 8,           // 08:00 AM local time
  userTimezone: 'UTC',
};

/**
 * Validates whether a given string is a valid IANA timezone identifier supported by Intl.
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
 * Checks whether the current time falls within user's configured quiet hours,
 * taking local timezone into account.
 */
export function isQuietHours(
  now: Date,
  startHour: number,
  endHour: number,
  timezone?: string
): boolean {
  let localHour = now.getUTCHours();

  if (timezone && isValidTimezone(timezone)) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone.trim(),
        hour: 'numeric',
        hourCycle: 'h23',
      });
      const parts = formatter.formatToParts(now);
      const hourPart = parts.find((p) => p.type === 'hour');
      if (hourPart) {
        localHour = parseInt(hourPart.value, 10);
      }
    } catch {
      // If formatting fails unexpectedly, fallback to UTC
      localHour = now.getUTCHours();
    }
  }

  // Overnight interval (e.g. 22:00 to 08:00)
  if (startHour > endHour) {
    return localHour >= startHour || localHour < endHour;
  }
  // Same-day interval (e.g. 13:00 to 15:00)
  if (startHour < endHour) {
    return localHour >= startHour && localHour < endHour;
  }
  // If start == end, quiet hours are disabled
  return false;
}
