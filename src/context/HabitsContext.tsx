import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

export const STARTER_HABITS: Habit[] = [
  {
    id: 'starter-morning-presence',
    title: 'Morning Presence',
    description: 'Spend 2 minutes noticing your breathing, surroundings, and how you feel before starting the day.',
    category: 'mindfulness',
    streak: 0,
    bestStreak: 0,
    targetFrequency: 7,
    completedDates: [],
    iconName: 'Sparkles',
    status: 'active',
  },
  {
    id: 'starter-movement',
    title: '5-Minute Movement',
    description: 'Stand up, stretch gently, and move your body for five minutes.',
    category: 'movement',
    streak: 0,
    bestStreak: 0,
    targetFrequency: 7,
    completedDates: [],
    iconName: 'Zap',
    status: 'active',
  },
  {
    id: 'starter-mental-unload',
    title: 'Mental Unload',
    description: 'Write down what is occupying your mind, then choose one clear next action.',
    category: 'reflection',
    streak: 0,
    bestStreak: 0,
    targetFrequency: 7,
    completedDates: [],
    iconName: 'BookOpen',
    status: 'active',
  },
  {
    id: 'starter-evening-wind-down',
    title: 'Evening Wind-Down',
    description: 'Put away unnecessary screens and spend five quiet minutes preparing for rest.',
    category: 'rest',
    streak: 0,
    bestStreak: 0,
    targetFrequency: 7,
    completedDates: [],
    iconName: 'Moon',
    status: 'active',
  },
  {
    id: 'starter-daily-gratitude',
    title: 'Daily Gratitude',
    description: 'Write down three small things you appreciated today.',
    category: 'gratitude',
    streak: 0,
    bestStreak: 0,
    targetFrequency: 7,
    completedDates: [],
    iconName: 'Heart',
    status: 'active',
  },
];

const STORAGE_KEY = 'mindful_habits';

export const HabitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAccessToken } = useAuth();
  const { refreshState } = usePersonalState();
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return STARTER_HABITS;
    } catch {
      return STARTER_HABITS;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const habitsRef = useRef<Habit[]>(habits);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const inFlightTogglesRef = useRef<Set<string>>(new Set());

  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getAccessToken]);

  const refreshHabits = useCallback(async () => {
    const token = getAccessToken();
    if (!user || !token) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHabits(parsed);
            return;
          }
        }
        setHabits(STARTER_HABITS);
      } catch {
        setHabits(STARTER_HABITS);
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
          if (data.habits.length > 0) {
            setHabits(data.habits);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.habits));
            } catch {}
          } else {
            // Server returned empty list; retain any current in-memory habits if user hasn't explicitly purged
            const current = habitsRef.current;
            if (current.length > 0) {
              setHabits(current);
            } else {
              setHabits([]);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
              } catch {}
            }
          }
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
  }, [user, getAccessToken, getAuthHeaders]);

  useEffect(() => {
    refreshHabits();
  }, [refreshHabits]);

  const toggleHabitCompletion = useCallback(async (id: string, dateStr?: string) => {
    if (inFlightTogglesRef.current.has(id)) {
      return; // Rapid click debounce
    }

    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const currentList = habitsRef.current;
    const currentHabit = currentList.find((h) => h.id === id);
    if (!currentHabit) return;

    inFlightTogglesRef.current.add(id);

    const isAlreadyCompleted = currentHabit.completedDates.includes(targetDate);
    const updatedDates = isAlreadyCompleted
      ? currentHabit.completedDates.filter((d) => d !== targetDate)
      : [...currentHabit.completedDates, targetDate];
    const updatedStreak = isAlreadyCompleted
      ? Math.max(0, currentHabit.streak - 1)
      : currentHabit.streak + 1;

    const optimisticHabit: Habit = {
      ...currentHabit,
      completedDates: updatedDates,
      streak: updatedStreak,
    };

    // Optimistic UI update with immediate local persistence
    setHabits((prev) => {
      const next = prev.map((h) => (h.id === id ? optimisticHabit : h));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    const token = getAccessToken();
    if (!user || !token) {
      // Offline / demo mode — keep optimistic update
      inFlightTogglesRef.current.delete(id);
      return;
    }

    try {
      if (isAlreadyCompleted) {
        const res = await fetch(`/api/habits/${id}/uncomplete`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ completionDate: targetDate }), // Fixed: completionDate
        });
        if (res.ok) {
          const data = await res.json();
          if (data.habit) {
            setHabits((prev) => {
              const next = prev.map((h) => (h.id === id ? { ...h, ...data.habit } : h));
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              } catch {}
              return next;
            });
          }
        } else if (res.status === 400 || res.status === 403) {
          // Revert only if server rejected with deterministic client/auth error
          setHabits((prev) => {
            const next = prev.map((h) => (h.id === id ? currentHabit : h));
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      } else {
        const res = await fetch(`/api/habits/${id}/complete`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            completionDate: targetDate,
            completedAt: `${targetDate}T12:00:00.000Z`,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.habit) {
            setHabits((prev) => {
              const next = prev.map((h) => (h.id === id ? { ...h, ...data.habit } : h));
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              } catch {}
              return next;
            });
          }
          refreshState?.().catch(() => {});
        } else if (res.status === 400 || res.status === 403) {
          // Revert only if server rejected with deterministic client/auth error
          setHabits((prev) => {
            const next = prev.map((h) => (h.id === id ? currentHabit : h));
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      }
    } catch {
      // Network failure — maintain optimistic update locally
    } finally {
      inFlightTogglesRef.current.delete(id);
    }
  }, [user, getAccessToken, getAuthHeaders, refreshState]);

  const createHabit = useCallback(async (input: {
    title: string;
    description?: string;
    category?: Habit['category'];
    targetFrequency?: number;
    restDaysAllowed?: number;
  }): Promise<Habit | null> => {
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newHabit: Habit = {
      id: tempId,
      title: input.title.trim(),
      description: input.description?.trim() || '',
      category: input.category || 'mindfulness',
      streak: 0,
      bestStreak: 0,
      targetFrequency: input.targetFrequency || 7,
      restDaysAllowed: input.restDaysAllowed ?? 1,
      completedDates: [],
      iconName: 'Sparkles',
      status: 'active',
    };

    const token = getAccessToken();
    if (!user || !token) {
      setHabits((prev) => {
        const next = [newHabit, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      return newHabit;
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
          setHabits((prev) => {
            const next = [data.habit, ...prev];
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            } catch {}
            return next;
          });
          return data.habit;
        }
      }

      // If server returned non-ok (transient / fallback), persist local habit
      setHabits((prev) => {
        const next = [newHabit, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      return newHabit;
    } catch {
      // Network error -> persist local habit
      setHabits((prev) => {
        const next = [newHabit, ...prev];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      return newHabit;
    }
  }, [user, getAccessToken, getAuthHeaders]);

  const archiveHabit = useCallback(async (id: string): Promise<boolean> => {
    setHabits((prev) => {
      const next = prev.filter((h) => h.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    const token = getAccessToken();
    if (!user || !token) return true;

    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [user, getAccessToken, getAuthHeaders]);

  const deleteHabit = useCallback(async (id: string): Promise<boolean> => {
    setHabits((prev) => {
      const next = prev.filter((h) => h.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    const token = getAccessToken();
    if (!user || !token) return true;

    try {
      const res = await fetch(`/api/habits/${id}?purge=true`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [user, getAccessToken, getAuthHeaders]);

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