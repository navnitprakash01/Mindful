/**
 * Compassionate Consistency Streak Calculator
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 *
 * Core Principles:
 * - Compassionate consistency: supports rest days (targetFrequency 1..7).
 * - Zero streak shaming: missing a day is framed neutrally.
 * - Restarts are treated positively as sustainable resilience.
 * - Non-negative, finite integers only.
 */

/**
 * Parses YYYY-MM-DD string into UTC midnight epoch timestamp
 */
function parseDateToUtcEpoch(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  return Date.UTC(y, m - 1, d);
}

/**
 * Formats UTC midnight epoch to YYYY-MM-DD
 */
function formatUtcEpochToDate(epoch: number): string {
  const d = new Date(epoch);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

export interface StreakEvaluation {
  currentStreak: number;
  bestStreak: number;
  isRhythmActive: boolean;
  status: 'active' | 'paused';
  restDaysHonored: number;
  message: string;
}

/**
 * Calculates compassionate streak from a set of completion dates and target weekly frequency.
 *
 * @param completedDates Array of YYYY-MM-DD strings
 * @param targetFrequency Target days per week (1 to 7)
 * @param referenceDate Current anchor date (YYYY-MM-DD, defaults to UTC today)
 * @param existingBestStreak Historical best streak to preserve
 * @param restDaysAllowed Maximum rest days allowed between completions (default 1)
 */
export function calculateCompassionateStreak(
  completedDates: string[],
  targetFrequency: number = 7,
  referenceDate?: string,
  existingBestStreak: number = 0,
  restDaysAllowed: number = 1
): StreakEvaluation {
  const todayStr = referenceDate || formatUtcEpochToDate(Date.now());
  const clampedFreq = Math.max(1, Math.min(7, Math.round(targetFrequency)));

  if (!completedDates || completedDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: Math.max(0, existingBestStreak),
      isRhythmActive: false,
      status: 'paused',
      restDaysHonored: 0,
      message: 'Ready when you are. Consistency is cultivated one small moment at a time.',
    };
  }

  // Deduplicate and sort chronologically ascending
  const uniqueDates = Array.from(new Set(completedDates)).sort();
  const allowedGapDays = Math.max(1, restDaysAllowed + 1);

  // Compute streaks through historical sequence
  let runningStreak = 0;
  let maxStreak = existingBestStreak;
  let restDaysHonored = 0;
  let lastEpoch: number | null = null;

  for (const dateStr of uniqueDates) {
    const epoch = parseDateToUtcEpoch(dateStr);
    if (lastEpoch === null) {
      runningStreak = 1;
    } else {
      const diffDays = Math.round((epoch - lastEpoch) / (24 * 3600 * 1000));
      if (diffDays === 0) {
        // Same day completion, ignore
        continue;
      } else if (diffDays <= allowedGapDays) {
        // Maintained within allowed rest window
        if (diffDays > 1) {
          restDaysHonored += (diffDays - 1);
        }
        runningStreak++;
      } else {
        // Gap exceeded allowed rest days -> restart
        runningStreak = 1;
      }
    }
    lastEpoch = epoch;
    if (runningStreak > maxStreak) {
      maxStreak = runningStreak;
    }
  }

  // Check if rhythm is currently active relative to referenceDate
  const latestDateStr = uniqueDates[uniqueDates.length - 1];
  const latestEpoch = parseDateToUtcEpoch(latestDateStr);
  const refEpoch = parseDateToUtcEpoch(todayStr);
  const daysSinceLatest = Math.max(0, Math.round((refEpoch - latestEpoch) / (24 * 3600 * 1000)));

  const isRhythmActive = daysSinceLatest <= allowedGapDays;
  const currentStreak = isRhythmActive ? runningStreak : 0;
  const status: 'active' | 'paused' = isRhythmActive ? 'active' : 'paused';

  let message = '';
  if (latestDateStr === todayStr) {
    if (currentStreak > 1) {
      message = `Rhythm active! You've nurtured this ritual for ${currentStreak} consecutive cycles.`;
    } else {
      message = 'Ritual complete for today. A mindful foundation for your wellbeing.';
    }
  } else if (isRhythmActive) {
    message = `Rhythm active (${currentStreak} cycles). Scheduled rest days support sustainable consistency.`;
  } else {
    message = 'Ready to gently resume. Pausing when needed is a natural part of healthy rhythm.';
  }

  return {
    currentStreak: Math.max(0, currentStreak),
    bestStreak: Math.max(currentStreak, maxStreak),
    isRhythmActive,
    status,
    restDaysHonored,
    message,
  };
}
