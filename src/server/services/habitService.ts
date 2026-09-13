/**
 * Habit Service
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 *
 * Responsibilities:
 * - CRUD operations for user habits (creation, listing, updating, archiving, purging).
 * - Multi-tenant isolation via authenticated userId.
 * - Compassionate consistency & rest-day streak calculations.
 * - Intervention-to-habit conversion without duplicating scoring.
 * - Dispatches canonical 'habit_action' signals to StateService.
 * - Dual-tier persistence: Supabase DB + zero-budget in-memory fallback.
 */

import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';
import { stateService } from './stateService';
import { SignalExtractor } from '../engine/signalExtractor';
import { isValidUuid } from '../engine/providers';
import { screenForCrisis } from '../engine/interventionEngine/safety';
import { INTERVENTION_LIBRARY } from '../engine/interventionEngine/library';
import {
  HabitDefinition,
  CreateHabitInput,
  UpdateHabitInput,
  HabitCompletionInput,
  HabitCompletionResult,
  HabitCategory,
  validateCreateHabitInput,
  validateUpdateHabitInput,
  validateHabitCompletionInput,
} from '../engine/habits/types';
import { calculateCompassionateStreak } from '../engine/habits/streak';

const TABLE_HABITS = 'user_habits';

// In-memory store for offline tests and zero-budget resilience
const inMemoryHabits = new Map<string, HabitDefinition>(); // habitId -> HabitDefinition

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
 * Map raw database row to canonical HabitDefinition
 */
function rowToHabit(row: any): HabitDefinition {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || '',
    category: row.category,
    targetFrequency: row.target_frequency ?? 7,
    preferredTimeWindow: row.preferred_time_window || 'anytime',
    durationMinutes: row.duration_minutes ?? undefined,
    status: row.status || 'active',
    completedDates: Array.isArray(row.completed_dates) ? row.completed_dates : [],
    streak: row.streak ?? 0,
    bestStreak: row.best_streak ?? 0,
    sourceInterventionId: row.source_intervention_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

export const habitService = {
  /**
   * Creates a new behavioral habit for the authenticated user.
   */
  async createHabit(userId: string, input: CreateHabitInput): Promise<HabitDefinition> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const validation = validateCreateHabitInput(input);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid habit input');
    }

    // Safety screening: screen habit title and description for crisis language
    const fullText = `${input.title} ${input.description || ''}`.trim();
    const crisisScreening = screenForCrisis(fullText);
    if (crisisScreening.isCrisisDetected) {
      throw new Error(
        `Safety Alert: ${crisisScreening.helplineNotice || 'Immediate support is available. Please reach out to 988.'}`
      );
    }

    const habitId = randomUUID();
    const nowIso = new Date().toISOString();

    const sanitizedTitle = input.title.replace(/<[^>]*>/g, '').trim();
    const sanitizedDescription = input.description ? input.description.replace(/<[^>]*>/g, '').trim() : '';

    const habit: HabitDefinition = {
      id: habitId,
      userId,
      title: sanitizedTitle,
      description: sanitizedDescription,
      category: input.category,
      targetFrequency: input.targetFrequency ?? 7,
      preferredTimeWindow: input.preferredTimeWindow || 'anytime',
      durationMinutes: input.durationMinutes,
      status: 'active',
      streak: 0,
      bestStreak: 0,
      completedDates: [],
      sourceInterventionId: input.sourceInterventionId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    inMemoryHabits.set(habitId, habit);

    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .insert({
            id: habit.id,
            user_id: habit.userId,
            title: habit.title,
            description: habit.description,
            category: habit.category,
            target_frequency: habit.targetFrequency,
            preferred_time_window: habit.preferredTimeWindow,
            duration_minutes: habit.durationMinutes,
            status: habit.status,
            completed_dates: habit.completedDates,
            streak: habit.streak,
            best_streak: habit.bestStreak,
            source_intervention_id: habit.sourceInterventionId,
            created_at: habit.createdAt,
            updated_at: habit.updatedAt,
          })
          .select()
          .single()
      );

      if (!error && data) {
        return rowToHabit(data);
      }
    } catch {
      // Offline / in-memory test fallback
    }

    return habit;
  },

  /**
   * Lists all habits for a user, recalculating streaks dynamically.
   */
  async listHabits(userId: string, includeArchived: boolean = false): Promise<HabitDefinition[]> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let userHabits: HabitDefinition[] = [];

    try {
      let query = supabase
        .from(TABLE_HABITS)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (!includeArchived) {
        query = query.neq('status', 'archived');
      }

      const { data, error } = await withDbTimeout(query);
      if (!error && data) {
        userHabits = data.map(rowToHabit);
      }
    } catch {
      // In-memory fallback
      userHabits = Array.from(inMemoryHabits.values()).filter((h) => {
        if (h.userId !== userId) return false;
        if (!includeArchived && h.status === 'archived') return false;
        return true;
      });
    }

    // Recalculate streak dynamically relative to today
    return userHabits.map((h) => {
      const evaluation = calculateCompassionateStreak(
        h.completedDates,
        h.targetFrequency,
        todayStr,
        h.bestStreak
      );
      return {
        ...h,
        streak: evaluation.currentStreak,
        bestStreak: evaluation.bestStreak,
      };
    });
  },

  /**
   * Retrieves a single habit by ID, verifying tenant ownership.
   */
  async getHabitById(userId: string, habitId: string): Promise<HabitDefinition | null> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    let habit: HabitDefinition | null = null;

    try {
      const { data, error } = await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .select('*')
          .eq('id', habitId)
          .eq('user_id', userId)
          .single()
      );

      if (!error && data) {
        habit = rowToHabit(data);
      }
    } catch {
      const found = inMemoryHabits.get(habitId);
      if (found && found.userId === userId) {
        habit = found;
      }
    }

    if (!habit) return null;

    const todayStr = new Date().toISOString().split('T')[0];
    const evaluation = calculateCompassionateStreak(
      habit.completedDates,
      habit.targetFrequency,
      todayStr,
      habit.bestStreak
    );

    return {
      ...habit,
      streak: evaluation.currentStreak,
      bestStreak: evaluation.bestStreak,
    };
  },

  /**
   * Updates habit metadata, checking tenant ownership.
   */
  async updateHabit(
    userId: string,
    habitId: string,
    input: UpdateHabitInput
  ): Promise<HabitDefinition> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const validation = validateUpdateHabitInput(input);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid update input');
    }

    const existing = await this.getHabitById(userId, habitId);
    if (!existing) {
      throw new Error('Habit not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Forbidden: Habit belongs to another user');
    }

    if (input.title !== undefined || input.description !== undefined) {
      const fullText = `${input.title ?? existing.title} ${input.description ?? existing.description}`.trim();
      const crisis = screenForCrisis(fullText);
      if (crisis.isCrisisDetected) {
        throw new Error(`Safety Alert: ${crisis.helplineNotice || 'Support is available.'}`);
      }
    }

    const nowIso = new Date().toISOString();
    const updated: HabitDefinition = {
      ...existing,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      description: input.description !== undefined ? input.description.trim() : existing.description,
      category: input.category !== undefined ? input.category : existing.category,
      targetFrequency: input.targetFrequency !== undefined ? input.targetFrequency : existing.targetFrequency,
      preferredTimeWindow:
        input.preferredTimeWindow !== undefined ? input.preferredTimeWindow : existing.preferredTimeWindow,
      durationMinutes: input.durationMinutes !== undefined ? input.durationMinutes : existing.durationMinutes,
      status: input.status !== undefined ? input.status : existing.status,
      updatedAt: nowIso,
    };

    inMemoryHabits.set(habitId, updated);

    try {
      await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .update({
            title: updated.title,
            description: updated.description,
            category: updated.category,
            target_frequency: updated.targetFrequency,
            preferred_time_window: updated.preferredTimeWindow,
            duration_minutes: updated.durationMinutes,
            status: updated.status,
            updated_at: updated.updatedAt,
          })
          .eq('id', habitId)
          .eq('user_id', userId)
      );
    } catch {
      // In-memory test environment fallback
    }

    return updated;
  },

  /**
   * Soft archives a habit.
   */
  async archiveHabit(userId: string, habitId: string): Promise<HabitDefinition> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const existing = await this.getHabitById(userId, habitId);
    if (!existing) {
      throw new Error('Habit not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Forbidden: Habit belongs to another user');
    }

    const nowIso = new Date().toISOString();
    const archived: HabitDefinition = {
      ...existing,
      status: 'archived',
      archivedAt: nowIso,
      updatedAt: nowIso,
    };

    inMemoryHabits.set(habitId, archived);

    try {
      await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .update({
            status: 'archived',
            archived_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', habitId)
          .eq('user_id', userId)
      );
    } catch {
      // In-memory fallback
    }

    return archived;
  },

  /**
   * Completes a habit for a given calendar date (idempotent).
   * Dispatches a canonical 'habit_action' signal to StateService.
   */
  async completeHabit(
    userId: string,
    habitId: string,
    input?: HabitCompletionInput
  ): Promise<HabitCompletionResult> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const validation = validateHabitCompletionInput(input);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid completion input');
    }

    const habit = await this.getHabitById(userId, habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }

    if (habit.userId !== userId) {
      throw new Error('Forbidden: Habit belongs to another user');
    }

    if (habit.status !== 'active') {
      throw new Error(`Cannot complete habit with status: ${habit.status}`);
    }

    const completionDate =
      input?.completionDate ||
      (input?.completedAt ? input.completedAt.split('T')[0] : new Date().toISOString().split('T')[0]);

    // IDEMPOTENCY CHECK: If already completed on this date, return existing state safely
    if (habit.completedDates.includes(completionDate)) {
      const currentSnapshot = await stateService.getCurrentState(userId);
      const evalStreak = calculateCompassionateStreak(
        habit.completedDates,
        habit.targetFrequency,
        completionDate,
        habit.bestStreak
      );
      return {
        habit,
        signal: undefined,
        stateSnapshot: currentSnapshot,
        consistencyMessage: evalStreak.message,
        isNewCompletion: false,
      };
    }

    // Append date and recompute compassionate streak
    const updatedDates = [...habit.completedDates, completionDate];
    const evaluation = calculateCompassionateStreak(
      updatedDates,
      habit.targetFrequency,
      completionDate,
      habit.bestStreak
    );

    const nowIso = new Date().toISOString();
    const updatedHabit: HabitDefinition = {
      ...habit,
      completedDates: updatedDates,
      streak: evaluation.currentStreak,
      bestStreak: evaluation.bestStreak,
      updatedAt: nowIso,
    };

    inMemoryHabits.set(habitId, updatedHabit);

    try {
      await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .update({
            completed_dates: updatedDates,
            streak: updatedHabit.streak,
            best_streak: updatedHabit.bestStreak,
            updated_at: nowIso,
          })
          .eq('id', habitId)
          .eq('user_id', userId)
      );
    } catch {
      // In-memory fallback
    }

    // Extract canonical signal and ingest into stateService
    const signal = SignalExtractor.fromHabitAction(userId, updatedHabit, input);
    await stateService.ingestSignal(signal);

    // Fetch updated authoritative personal state
    const stateSnapshot = await stateService.getCurrentState(userId);

    return {
      habit: updatedHabit,
      signal,
      stateSnapshot,
      consistencyMessage: evaluation.message,
      isNewCompletion: true,
    };
  },

  /**
   * Reverses a habit completion for a given date (uncomplete).
   */
  async uncompleteHabit(
    userId: string,
    habitId: string,
    completionDate: string
  ): Promise<HabitDefinition> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const habit = await this.getHabitById(userId, habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }

    if (habit.userId !== userId) {
      throw new Error('Forbidden: Habit belongs to another user');
    }

    const updatedDates = habit.completedDates.filter((d) => d !== completionDate);
    const todayStr = new Date().toISOString().split('T')[0];
    const evaluation = calculateCompassionateStreak(
      updatedDates,
      habit.targetFrequency,
      todayStr,
      habit.bestStreak
    );

    const nowIso = new Date().toISOString();
    const updatedHabit: HabitDefinition = {
      ...habit,
      completedDates: updatedDates,
      streak: evaluation.currentStreak,
      bestStreak: evaluation.bestStreak,
      updatedAt: nowIso,
    };

    inMemoryHabits.set(habitId, updatedHabit);

    try {
      await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .update({
            completed_dates: updatedDates,
            streak: updatedHabit.streak,
            best_streak: updatedHabit.bestStreak,
            updated_at: nowIso,
          })
          .eq('id', habitId)
          .eq('user_id', userId)
      );
    } catch {
      // In-memory fallback
    }

    return updatedHabit;
  },

  /**
   * Permanently deletes a habit.
   */
  async deleteHabit(userId: string, habitId: string): Promise<boolean> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const habit = await this.getHabitById(userId, habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }

    if (habit.userId !== userId) {
      throw new Error('Forbidden: Habit belongs to another user');
    }

    inMemoryHabits.delete(habitId);

    try {
      await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .delete()
          .eq('id', habitId)
          .eq('user_id', userId)
      );
    } catch {
      // In-memory fallback
    }

    return true;
  },

  /**
   * Converts a successful intervention into an ongoing daily ritual.
   */
  async adoptInterventionAsRitual(
    userId: string,
    interventionId: string,
    targetFrequency: number = 7
  ): Promise<HabitDefinition> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    const protocol = INTERVENTION_LIBRARY[interventionId];
    if (!protocol) {
      throw new Error(`Intervention protocol '${interventionId}' not found`);
    }

    // Map intervention category to HabitCategory
    let category: HabitCategory = 'mindfulness';
    if (protocol.category === 'breathing' || protocol.category === 'grounding') {
      category = 'mindfulness';
    } else if (protocol.category === 'activation' || protocol.category === 'recovery') {
      category = 'movement';
    } else if (protocol.category === 'cognitive' || protocol.category === 'reflection' || protocol.category === 'focus') {
      category = 'reflection';
    } else if (protocol.category === 'wind_down') {
      category = 'rest';
    }

    return this.createHabit(userId, {
      title: protocol.title,
      description: protocol.shortDescription,
      category,
      targetFrequency,
      preferredTimeWindow: 'anytime',
      durationMinutes: protocol.durationMinutes,
      sourceInterventionId: protocol.id,
    });
  },

  /**
   * Purges all habit records and associated habit_action signals for a user.
   */
  async purgeHistory(userId: string): Promise<{ deletedHabits: number; deletedSignals: number }> {
    if (!isValidUuid(userId)) {
      throw new Error('Unauthorized');
    }

    let deletedHabits = 0;
    for (const [id, habit] of inMemoryHabits.entries()) {
      if (habit.userId === userId) {
        inMemoryHabits.delete(id);
        deletedHabits++;
      }
    }

    try {
      const { data } = await withDbTimeout(
        supabase
          .from(TABLE_HABITS)
          .delete()
          .eq('user_id', userId)
          .select('id')
      );
      if (data) deletedHabits = Math.max(deletedHabits, data.length);
    } catch {
      // In-memory fallback
    }

    const deletedSignals = await stateService.purgeSignals(userId, 'habit_action');

    return { deletedHabits, deletedSignals };
  },

  /**
   * Testing helper: resets internal memory stores.
   */
  _resetMemoryStore(): void {
    inMemoryHabits.clear();
  },
};
