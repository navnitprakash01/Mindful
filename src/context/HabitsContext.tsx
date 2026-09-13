import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Habit } from '../types';
import { useAuth } from './AuthContext';
import { usePersonalState } from './StateContext';

export interface HabitsContextType {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;
  toggleHabitCompletion: (id: string, dateStr?: string) => Promise<void>;
  createHabit: (input: {
    title: string;
    description?: string;
    category?: Habit['category'];
    targetFrequency?: number;
    restDaysAllowed?: number;
  }) => Promise<Habit | null>;
  archiveHabit: (id: string) => Promise<boolean>;
  deleteHabit: (id: string) => Promise<boolean>;
  refreshHabits: () => Promise<void>;
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

const initialHabits: Habit[] = [
  {
    id: 'habit-1',
    title: 'Morning Grounding Meditation',
    description: '10 minutes of unguided mindfulness before checking screen/email.',
    category: 'mindfulness',
    streak: 14,
    bestStreak: 14,
    targetFrequency: 7,
    completedDates: [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
      new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    ],
    iconName: 'Sparkles',
  },
  {
    id: 'habit-2',
    title: 'Daily Journaling Ritual',
    description: 'Write at least 3 sentences about your emotional landscape.',
    category: 'reflection',
    streak: 9,
    bestStreak: 12,
    targetFrequency: 7,
    completedDates: [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    ],
    iconName: 'BookOpen',
  },
  {
    id: 'habit-3',
    title: 'Evening Digital Sunset',
    description: 'Power down blue-light devices 1 hour before bed.',
    category: 'rest',
    streak: 5,
    bestStreak: 8,
    targetFrequency: 5,
    completedDates: [
      new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    ],
    iconName: 'Moon',
  },
  {
    id: 'habit-4',
    title: 'Mindful Water Intake',
    description: 'Sip 2L of fresh water attentively throughout the day.',
    category: 'movement',
    streak: 12,
    bestStreak: 15,
    targetFrequency: 7,
    completedDates: [
      new Date().toISOString().split('T')[0],
    ],
    iconName: 'Droplets',
  },
];

export const HabitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAccessToken } = useAuth();
  const { refreshState } = usePersonalState();
  const [habits, setHabits] = useState<Habit[]>(() => {
    if (user) return [];
    try {
      const saved = localStorage.getItem('mindful_habits');
      return saved ? JSON.parse(saved) : initialHabits;
    } catch {
      return initialHabits;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getAccessToken]);

  const refreshHabits = useCallback(async () => {
    if (!user) {
      try {
        const saved = localStorage.getItem('mindful_habits');
        setHabits(saved ? JSON.parse(saved) : initialHabits);
      } catch {
        setHabits(initialHabits);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/habits', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.habits)) {
          setHabits(data.habits);
          localStorage.setItem('mindful_habits', JSON.stringify(data.habits));
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to fetch habits');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    refreshHabits();
  }, [refreshHabits]);

  const toggleHabitCompletion = useCallback(async (id: string, dateStr?: string) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const previousHabits = [...habits];

    const currentHabit = habits.find((h) => h.id === id);
    if (!currentHabit) return;

    const isAlreadyCompleted = currentHabit.completedDates.includes(targetDate);

    // Optimistic UI update
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const exists = h.completedDates.includes(targetDate);
        const updatedDates = exists
          ? h.completedDates.filter((d) => d !== targetDate)
          : [...h.completedDates, targetDate];
        const updatedStreak = exists ? Math.max(0, h.streak - 1) : h.streak + 1;
        return {
          ...h,
          completedDates: updatedDates,
          streak: updatedStreak,
        };
      })
    );

    if (!user) {
      // Local mode
      localStorage.setItem('mindful_habits', JSON.stringify(habits));
      return;
    }

    try {
      if (isAlreadyCompleted) {
        const res = await fetch(`/api/habits/${id}/uncomplete`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ date: targetDate }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.habit) {
            setHabits((prev) => prev.map((h) => (h.id === id ? data.habit : h)));
          }
        } else {
          setHabits(previousHabits);
        }
      } else {
        const res = await fetch(`/api/habits/${id}/complete`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            completedAt: `${targetDate}T12:00:00.000Z`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.habit) {
            setHabits((prev) => prev.map((h) => (h.id === id ? data.habit : h)));
          }
          // Refresh PersonalState to reflect the new habit_action signal
          refreshState?.().catch(() => {});
        } else {
          setHabits(previousHabits);
        }
      }
    } catch {
      setHabits(previousHabits);
    }
  }, [habits, user, getAuthHeaders, refreshState]);

  const createHabit = useCallback(async (input: {
    title: string;
    description?: string;
    category?: Habit['category'];
    targetFrequency?: number;
    restDaysAllowed?: number;
  }): Promise<Habit | null> => {
    if (!user) {
      const localHabit: Habit = {
        id: `local-${Date.now()}`,
        title: input.title,
        description: input.description || '',
        category: input.category || 'mindfulness',
        streak: 0,
        bestStreak: 0,
        targetFrequency: input.targetFrequency || 7,
        restDaysAllowed: input.restDaysAllowed ?? 1,
        completedDates: [],
        iconName: 'Sparkles',
        status: 'active',
      };
      setHabits((prev) => {
        const updated = [localHabit, ...prev];
        localStorage.setItem('mindful_habits', JSON.stringify(updated));
        return updated;
      });
      return localHabit;
    }

    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(input),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.habit) {
          setHabits((prev) => [data.habit, ...prev]);
          return data.habit;
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [user, getAuthHeaders]);

  const archiveHabit = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setHabits((prev) => {
        const updated = prev.filter((h) => h.id !== id);
        localStorage.setItem('mindful_habits', JSON.stringify(updated));
        return updated;
      });
      return true;
    }

    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [user, getAuthHeaders]);

  const deleteHabit = useCallback(async (id: string): Promise<boolean> => {
    if (!user) {
      setHabits((prev) => {
        const updated = prev.filter((h) => h.id !== id);
        localStorage.setItem('mindful_habits', JSON.stringify(updated));
        return updated;
      });
      return true;
    }

    try {
      const res = await fetch(`/api/habits/${id}?purge=true`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setHabits((prev) => prev.filter((h) => h.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [user, getAuthHeaders]);

  return (
    <HabitsContext.Provider
      value={{
        habits,
        isLoading,
        error,
        toggleHabitCompletion,
        createHabit,
        archiveHabit,
        deleteHabit,
        refreshHabits,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitsContext);
  if (!context) throw new Error('useHabits must be used within a HabitsProvider');
  return context;
};