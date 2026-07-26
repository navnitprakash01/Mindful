import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Habit } from '../types';

interface HabitsContextType {
  habits: Habit[];
  toggleHabitCompletion: (id: string, dateStr: string) => void;
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

const initialHabits: Habit[] = [
  {
    id: "habit-1",
    title: "Morning Grounding Meditation",
    description: "10 minutes of unguided mindfulness before checking screen/email.",
    category: "mindfulness",
    streak: 14,
    targetFrequency: 7,
    completedDates: [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
      new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    ],
    iconName: "Sparkles",
  },
  {
    id: "habit-2",
    title: "Daily Journaling Ritual",
    description: "Write at least 3 sentences about your emotional landscape.",
    category: "reflection",
    streak: 9,
    targetFrequency: 7,
    completedDates: [
      new Date().toISOString().split('T')[0],
      new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    ],
    iconName: "BookOpen",
  },
  {
    id: "habit-3",
    title: "Evening Digital Sunset",
    description: "Power down blue-light devices 1 hour before bed.",
    category: "rest",
    streak: 5,
    targetFrequency: 5,
    completedDates: [
      new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    ],
    iconName: "Moon",
  },
  {
    id: "habit-4",
    title: "Mindful Water Intake",
    description: "Sip 2L of fresh water attentively throughout the day.",
    category: "movement",
    streak: 12,
    targetFrequency: 7,
    completedDates: [
      new Date().toISOString().split('T')[0],
    ],
    iconName: "Droplets",
  },
];

export const HabitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('mindful_habits');
    return saved ? JSON.parse(saved) : initialHabits;
  });

  useEffect(() => {
    localStorage.setItem('mindful_habits', JSON.stringify(habits));
  }, [habits]);

  const toggleHabitCompletion = useCallback((id: string, dateStr: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const exists = h.completedDates.includes(dateStr);
        const updatedDates = exists
          ? h.completedDates.filter((d) => d !== dateStr)
          : [...h.completedDates, dateStr];
        const updatedStreak = exists ? Math.max(0, h.streak - 1) : h.streak + 1;
        return {
          ...h,
          completedDates: updatedDates,
          streak: updatedStreak,
        };
      })
    );
  }, []);

  return (
    <HabitsContext.Provider value={{ habits, toggleHabitCompletion }}>
      {children}
    </HabitsContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitsContext);
  if (!context) throw new Error('useHabits must be used within a HabitsProvider');
  return context;
};