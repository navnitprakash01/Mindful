/**
 * Habit & Behavioral Ritual Domain Models & Contracts
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 *
 * Strict Non-Clinical Scope:
 * - Habit completion is an observed behavioral event; never clinical proof of mood improvement.
 * - Zero arbitrary score jumps; zero causal claims.
 * - Compassionate consistency: rest-day support, non-punitive missed days, positive restarts.
 */

import { WellnessSignal, PersonalState } from '../types';

export type HabitCategory = 'mindfulness' | 'movement' | 'reflection' | 'rest' | 'gratitude';

export type HabitStatus = 'active' | 'paused' | 'archived';

export type PreferredTimeWindow = 'morning' | 'midday' | 'evening' | 'anytime';

export interface HabitDefinition {
  id: string; // UUID
  userId: string;
  title: string; // Max 80 chars
  description: string; // Max 280 chars
  category: HabitCategory;
  targetFrequency: number; // 1 to 7 days per week (default 7)
  preferredTimeWindow: PreferredTimeWindow;
  durationMinutes?: number; // Optional micro-commitment (1 to 180 mins)
  status: HabitStatus;
  streak: number; // Non-negative consecutive scheduled cycles met
  bestStreak: number;
  completedDates: string[]; // ISO date strings (YYYY-MM-DD)
  sourceInterventionId?: string; // Optional provenance if adopted from intervention
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
  archivedAt?: string;
}

export interface CreateHabitInput {
  title: string;
  description?: string;
  category: HabitCategory;
  targetFrequency?: number;
  restDaysAllowed?: number;
  preferredTimeWindow?: PreferredTimeWindow;
  durationMinutes?: number;
  sourceInterventionId?: string;
}

export interface UpdateHabitInput {
  title?: string;
  description?: string;
  category?: HabitCategory;
  targetFrequency?: number;
  restDaysAllowed?: number;
  preferredTimeWindow?: PreferredTimeWindow;
  durationMinutes?: number;
  status?: HabitStatus;
}

export interface HabitCompletionInput {
  completionDate?: string; // YYYY-MM-DD, defaults to current date
  completedAt?: string; // ISO string, optional timestamp of completion
  durationMinutes?: number;
  reflectionNote?: string; // Max 200 chars
}

export interface HabitCompletionResult {
  habit: HabitDefinition;
  signal?: WellnessSignal;
  stateSnapshot: PersonalState;
  consistencyMessage: string;
  isNewCompletion: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const VALID_HABIT_CATEGORIES: HabitCategory[] = [
  'mindfulness',
  'movement',
  'reflection',
  'rest',
  'gratitude',
];

export const VALID_HABIT_STATUSES: HabitStatus[] = ['active', 'paused', 'archived'];

export const VALID_TIME_WINDOWS: PreferredTimeWindow[] = ['morning', 'midday', 'evening', 'anytime'];

/**
 * Validates date string in strict YYYY-MM-DD format and ensures it is a valid calendar day.
 */
export function isValidDateString(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dateObj = new Date(year, month - 1, day);
  return (
    dateObj.getFullYear() === year &&
    dateObj.getMonth() === month - 1 &&
    dateObj.getDate() === day
  );
}

/**
 * Validates that the completion date is not in the future (relative to UTC calendar date).
 */
export function isNotFutureDate(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  return dateStr <= today;
}

/**
 * Deterministic validator for creating a habit.
 */
export function validateCreateHabitInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }

  const data = input as Partial<CreateHabitInput>;

  if (typeof data.title !== 'string' || !data.title.trim()) {
    return { isValid: false, error: 'title is required and must be a non-empty string' };
  }
  const cleanTitle = data.title.trim();
  if (cleanTitle.length > 100) {
    return { isValid: false, error: 'title must not exceed 100 characters' };
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      return { isValid: false, error: 'description must be a string' };
    }
    if (data.description.length > 500) {
      return { isValid: false, error: 'description must not exceed 500 characters' };
    }
  }

  if (!data.category || !VALID_HABIT_CATEGORIES.includes(data.category)) {
    return {
      isValid: false,
      error: `Invalid category. Must be one of: ${VALID_HABIT_CATEGORIES.join(', ')}`,
    };
  }

  if (data.targetFrequency !== undefined) {
    if (
      typeof data.targetFrequency !== 'number' ||
      !Number.isFinite(data.targetFrequency) ||
      !Number.isInteger(data.targetFrequency)
    ) {
      return { isValid: false, error: 'targetFrequency must be a finite integer' };
    }
    if (data.targetFrequency < 1 || data.targetFrequency > 7) {
      return { isValid: false, error: 'targetFrequency must be an integer between 1 and 7' };
    }
  }

  if (data.restDaysAllowed !== undefined) {
    if (
      typeof data.restDaysAllowed !== 'number' ||
      !Number.isFinite(data.restDaysAllowed) ||
      !Number.isInteger(data.restDaysAllowed)
    ) {
      return { isValid: false, error: 'restDaysAllowed must be a finite integer' };
    }
    if (data.restDaysAllowed < 0 || data.restDaysAllowed > 6) {
      return { isValid: false, error: 'restDaysAllowed must be between 0 and 6' };
    }
    const freq = data.targetFrequency ?? 7;
    if (data.restDaysAllowed >= freq) {
      return { isValid: false, error: 'restDaysAllowed must be fewer than targetFrequency' };
    }
  }

  if (data.preferredTimeWindow !== undefined) {
    if (!VALID_TIME_WINDOWS.includes(data.preferredTimeWindow)) {
      return {
        isValid: false,
        error: `Invalid preferredTimeWindow. Must be one of: ${VALID_TIME_WINDOWS.join(', ')}`,
      };
    }
  }

  if (data.durationMinutes !== undefined) {
    if (
      typeof data.durationMinutes !== 'number' ||
      !Number.isFinite(data.durationMinutes) ||
      !Number.isInteger(data.durationMinutes)
    ) {
      return { isValid: false, error: 'durationMinutes must be a finite integer' };
    }
    if (data.durationMinutes < 1 || data.durationMinutes > 180) {
      return { isValid: false, error: 'durationMinutes must be between 1 and 180 minutes' };
    }
  }

  if (data.sourceInterventionId !== undefined) {
    if (typeof data.sourceInterventionId !== 'string' || data.sourceInterventionId.length > 80) {
      return { isValid: false, error: 'sourceInterventionId must be a valid string identifier' };
    }
  }

  return { isValid: true };
}

/**
 * Deterministic validator for updating a habit.
 */
export function validateUpdateHabitInput(input: unknown): ValidationResult {
  if (!input || typeof input !== 'object') {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }

  const data = input as Partial<UpdateHabitInput>;

  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || !data.title.trim()) {
      return { isValid: false, error: 'title cannot be empty' };
    }
    if (data.title.trim().length > 80) {
      return { isValid: false, error: 'title must not exceed 80 characters' };
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      return { isValid: false, error: 'description must be a string' };
    }
    if (data.description.length > 280) {
      return { isValid: false, error: 'description must not exceed 280 characters' };
    }
  }

  if (data.category !== undefined) {
    if (!VALID_HABIT_CATEGORIES.includes(data.category)) {
      return {
        isValid: false,
        error: `Invalid category. Must be one of: ${VALID_HABIT_CATEGORIES.join(', ')}`,
      };
    }
  }

  if (data.targetFrequency !== undefined) {
    if (
      typeof data.targetFrequency !== 'number' ||
      !Number.isFinite(data.targetFrequency) ||
      !Number.isInteger(data.targetFrequency)
    ) {
      return { isValid: false, error: 'targetFrequency must be a finite integer' };
    }
    if (data.targetFrequency < 1 || data.targetFrequency > 7) {
      return { isValid: false, error: 'targetFrequency must be an integer between 1 and 7' };
    }
  }

  if (data.preferredTimeWindow !== undefined) {
    if (!VALID_TIME_WINDOWS.includes(data.preferredTimeWindow)) {
      return {
        isValid: false,
        error: `Invalid preferredTimeWindow. Must be one of: ${VALID_TIME_WINDOWS.join(', ')}`,
      };
    }
  }

  if (data.durationMinutes !== undefined) {
    if (
      typeof data.durationMinutes !== 'number' ||
      !Number.isFinite(data.durationMinutes) ||
      !Number.isInteger(data.durationMinutes)
    ) {
      return { isValid: false, error: 'durationMinutes must be a finite integer' };
    }
    if (data.durationMinutes < 1 || data.durationMinutes > 180) {
      return { isValid: false, error: 'durationMinutes must be between 1 and 180 minutes' };
    }
  }

  if (data.status !== undefined) {
    if (!VALID_HABIT_STATUSES.includes(data.status)) {
      return {
        isValid: false,
        error: `Invalid status. Must be one of: ${VALID_HABIT_STATUSES.join(', ')}`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Deterministic validator for habit completion.
 */
export function validateHabitCompletionInput(input: unknown): ValidationResult {
  if (input !== undefined && (typeof input !== 'object' || input === null)) {
    return { isValid: false, error: 'Request body must be a valid JSON object' };
  }

  const data = (input || {}) as Partial<HabitCompletionInput>;

  if (data.completionDate !== undefined) {
    if (!isValidDateString(data.completionDate)) {
      return { isValid: false, error: 'completionDate must be a valid date in YYYY-MM-DD format' };
    }
    if (!isNotFutureDate(data.completionDate)) {
      return { isValid: false, error: 'completionDate cannot be a future date' };
    }
  }

  if (data.completedAt !== undefined) {
    if (typeof data.completedAt !== 'string' || isNaN(Date.parse(data.completedAt))) {
      return { isValid: false, error: 'completedAt must be a valid ISO-8601 date string' };
    }
    const parsed = new Date(data.completedAt);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (parsed > tomorrow) {
      return { isValid: false, error: 'completedAt cannot be a future date' };
    }
  }

  if (data.durationMinutes !== undefined) {
    if (
      typeof data.durationMinutes !== 'number' ||
      !Number.isFinite(data.durationMinutes) ||
      !Number.isInteger(data.durationMinutes)
    ) {
      return { isValid: false, error: 'durationMinutes must be a finite integer' };
    }
    if (data.durationMinutes < 1 || data.durationMinutes > 180) {
      return { isValid: false, error: 'durationMinutes must be between 1 and 180 minutes' };
    }
  }

  if (data.reflectionNote !== undefined) {
    if (typeof data.reflectionNote !== 'string') {
      return { isValid: false, error: 'reflectionNote must be a string' };
    }
    if (data.reflectionNote.length > 200) {
      return { isValid: false, error: 'reflectionNote must not exceed 200 characters' };
    }
  }

  return { isValid: true };
}
