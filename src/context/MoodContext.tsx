import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MoodLog } from '../types';
import { useToast } from './ToastContext';

interface MoodContextType {
  moodLogs: MoodLog[];
  addMoodLog: (log: Omit<MoodLog, 'id' | 'timestamp'>) => void;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

const initialMoodLogs: MoodLog[] = [
  {
    id: "log-1",
    timestamp: new Date().toISOString(),
    energyLevel: 8,
    moodType: "Calm",
    notes: "Centered start to the morning after 15 min meditation.",
    triggers: ["Morning Routine", "Tea"],
    physicalSensations: ["Relaxed shoulders", "Deep breathing"],
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    energyLevel: 6,
    moodType: "Focus",
    notes: "Deep work session on Mindful design system.",
    triggers: ["Creative Work", "Flow State"],
    physicalSensations: ["Slight eye fatigue"],
  },
  {
    id: "log-3",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    energyLevel: 4,
    moodType: "Anxiety",
    notes: "Tightness in chest before client presentation.",
    triggers: ["Public Speaking", "Deadlines"],
    physicalSensations: ["Shallow breathing", "Tense neck"],
  },
  {
    id: "log-4",
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    energyLevel: 9,
    moodType: "Joy",
    notes: "Evening walk in the park under dusk sky.",
    triggers: ["Nature", "Exercise"],
    physicalSensations: ["Lightness in chest", "Warmth"],
  },
];

export const MoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>(() => {
    const saved = localStorage.getItem('mindful_moods');
    return saved ? JSON.parse(saved) : initialMoodLogs;
  });

  const { showToast } = useToast();

  useEffect(() => {
    localStorage.setItem('mindful_moods', JSON.stringify(moodLogs));
  }, [moodLogs]);

  const addMoodLog = useCallback((log: Omit<MoodLog, 'id' | 'timestamp'>) => {
    const newLog: MoodLog = {
      ...log,
      id: `mood-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setMoodLogs((prev) => [newLog, ...prev]);
    showToast("Emotional landscape updated 🌊");
  }, [showToast]);

  return (
    <MoodContext.Provider value={{ moodLogs, addMoodLog }}>
      {children}
    </MoodContext.Provider>
  );
};

export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) throw new Error('useMood must be used within a MoodProvider');
  return context;
};