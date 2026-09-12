/**
 * Emotional Rhythm Data & Trend Engine
 * Mindful 2.0 — Phase 1: Personal State Intelligence
 *
 * Pure data transformation and factual insight calculations for the 7-day emotional timeline.
 * Zero-fabrication principle: Missing days remain null; no synthetic or interpolated observations.
 */

import { MoodLog } from '../types';

export const moodConfig: Record<string, { color: string; bg: string; emoji: string }> = {
  Joy:        { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',  emoji: '✨' },
  Calm:       { color: '#6ee7b7', bg: 'rgba(52,211,153,0.15)',  emoji: '🌿' },
  Focus:      { color: '#c0c4ea', bg: 'rgba(192,196,234,0.15)', emoji: '🎯' },
  Anxiety:    { color: '#f4a8c0', bg: 'rgba(232,121,154,0.15)', emoji: '🌊' },
  Melancholy: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', emoji: '🌙' },
  Gratitude:  { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  emoji: '🙏' },
  Restless:   { color: '#fb923c', bg: 'rgba(251,146,60,0.15)',  emoji: '🔥' },
};

export const ALL_MOOD_TYPES: MoodLog['moodType'][] = [
  'Joy', 'Calm', 'Focus', 'Anxiety', 'Melancholy', 'Gratitude', 'Restless',
];

export interface DaySlot {
  date: Date;
  dateKey: string;
  dayLabel: string;
  fullDateLabel: string;
  isToday: boolean;
  logs: MoodLog[];
  primaryLog: MoodLog | null;
}

export interface TrendInsight {
  hasEnoughData: boolean;
  title: string;
  description: string;
}

/**
 * Maps mood logs into exactly 7 day slots (6 days ago through today).
 * Missing days are NOT filled with synthetic data; primaryLog remains null.
 */
export function calculateSevenDaySlots(moodLogs: MoodLog[], now: Date = new Date()): DaySlot[] {
  const slots: DaySlot[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const fullDateLabel = d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    const isToday = i === 0;

    // Match logs on this local calendar date
    const dayLogs = moodLogs.filter((l) => {
      try {
        const logDate = new Date(l.timestamp);
        const logKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(logDate.getDate()).padStart(2, '0')}`;
        return logKey === dateKey;
      } catch {
        return false;
      }
    });

    const primaryLog = dayLogs.length > 0 ? dayLogs[0] : null;

    slots.push({
      date: d,
      dateKey,
      dayLabel,
      fullDateLabel,
      isToday,
      logs: dayLogs,
      primaryLog,
    });
  }
  return slots;
}

/**
 * Derives factual weekly insights.
 * When fewer than 3 observations exist, warns that patterns are still forming rather than fabricating claims.
 */
export function calculateTrendInsight(sevenDaySlots: DaySlot[]): TrendInsight {
  const recordedDays = sevenDaySlots.filter((s) => s.primaryLog !== null);
  const count = recordedDays.length;

  if (count < 3) {
    return {
      hasEnoughData: false,
      title: 'Building your emotional rhythm',
      description: 'Log a few more check-ins to uncover patterns.',
    };
  }

  // Count mood occurrences
  const moodCounts: Record<string, number> = {};
  recordedDays.forEach((s) => {
    const type = s.primaryLog!.moodType;
    moodCounts[type] = (moodCounts[type] || 0) + 1;
  });

  let topMood = '';
  let topCount = 0;
  for (const [m, cnt] of Object.entries(moodCounts)) {
    if (cnt > topCount) {
      topCount = cnt;
      topMood = m;
    }
  }

  const energies = recordedDays.map((s) => s.primaryLog!.energyLevel);
  const minEnergy = Math.min(...energies);
  const maxEnergy = Math.max(...energies);
  const variance = maxEnergy - minEnergy;
  const firstEnergy = energies[0];
  const lastEnergy = energies[energies.length - 1];
  const delta = lastEnergy - firstEnergy;
  const avgEnergy = (energies.reduce((acc, val) => acc + val, 0) / energies.length).toFixed(1);

  let title = '';
  if (delta >= 2) {
    title = `Energy is trending upward (+${delta} pts)`;
  } else if (delta <= -2) {
    title = `Energy is trending downward (${delta} pts)`;
  } else if (variance >= 4) {
    title = `Your energy has varied significantly this week (${minEnergy}–${maxEnergy}/10)`;
  } else {
    title = `${topMood} has been your most common state`;
  }

  const description = `${topMood} was logged on ${topCount} of ${count} recorded days · Avg energy ${avgEnergy}/10`;

  return {
    hasEnoughData: true,
    title,
    description,
  };
}
