/**
 * Habit Signal Provider
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 *
 * Strict Non-Clinical & Non-Causal Guarantees:
 * - Habit completion is an observed behavioral event.
 * - Under NO circumstances does habit completion directly claim or mutate mood valence.
 * - Estimates are weak (confidence <= 0.35) and bounded.
 * - Primary role is longitudinal behavioral evidence for PatternEngine.
 */

import { HabitDefinition, HabitCompletionInput } from './types';
import { WellnessSignal, SignalModality, StateDimensionKey, DimensionEstimate } from '../types';

export class HabitSignalProvider {
  public readonly modality: SignalModality = 'habit_action';
  public readonly reliabilityWeight: number = 0.30;

  public static createSignal(
    habit: HabitDefinition,
    timestampIso?: string,
    completionInput?: HabitCompletionInput
  ): WellnessSignal {
    const provider = new HabitSignalProvider();
    return provider.extractSignal(habit.userId, habit, {
      ...completionInput,
      completedAt: timestampIso || completionInput?.completedAt,
    });
  }

  /**
   * Transforms a completed habit event into a canonical WellnessSignal.
   */
  public extractSignal(
    userId: string,
    habit: HabitDefinition,
    completionInput?: HabitCompletionInput
  ): WellnessSignal {
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const completionDate = completionInput?.completionDate || nowIso.split('T')[0];

    // Strictly bounded, mild non-causal contextual anchors (confidence <= 0.35)
    // NEVER mutates mood, cognitiveLoad, or fatigue.
    const estimates: Partial<Record<StateDimensionKey, DimensionEstimate>> = {};

    if (habit.category === 'mindfulness' || habit.category === 'reflection') {
      estimates.focus = { value: 65, confidence: 0.30 };
      estimates.stress = { value: 40, confidence: 0.30 };
    } else if (habit.category === 'movement') {
      estimates.energy = { value: 65, confidence: 0.30 };
    } else if (habit.category === 'rest') {
      estimates.stress = { value: 40, confidence: 0.30 };
    } else if (habit.category === 'gratitude') {
      estimates.stress = { value: 45, confidence: 0.25 };
    }

    return {
      id: `sig-habit-${habit.id}-${completionDate}`,
      userId,
      timestamp: nowIso,
      modality: this.modality,
      reliabilityWeight: this.reliabilityWeight,
      estimates,
      features: {
        habitId: habit.id,
        category: habit.category,
        themes: [habit.category],
        stressDelta: estimates.stress ? Math.max(-8, estimates.stress.value - 48) : 0,
        streak: habit.streak,
        targetFrequency: habit.targetFrequency,
        completionDate,
        preferredTimeWindow: habit.preferredTimeWindow,
        durationMinutes: completionInput?.durationMinutes ?? habit.durationMinutes,
        reflectionNote: completionInput?.reflectionNote ? completionInput.reflectionNote.trim().slice(0, 200) : undefined,
        sourceInterventionId: habit.sourceInterventionId,
        sentimentSummary: `Completed ${habit.category} ritual: ${habit.title}.`,
      } as any,
      expiresAt,
    };
  }
}

export const defaultHabitSignalProvider = new HabitSignalProvider();
