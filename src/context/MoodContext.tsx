import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MoodLog } from '../types';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

/**
 * Result returned by addMoodLog so callers can detect failure and act accordingly.
 */
export interface AddMoodLogResult {
  ok: boolean;
  serverLog?: MoodLog;
  error?: string;
}

interface MoodContextType {
  moodLogs: MoodLog[];
  addMoodLog: (
    log: Omit<MoodLog, 'id' | 'timestamp'>,
    onSuccess?: () => void | Promise<void>
  ) => Promise<AddMoodLogResult>;
  isMoodLoading: boolean;
  reloadMoodLogs: () => Promise<void>;
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

/**
 * Demo logs for unauthenticated / offline preview only.
 * Cleared once the user is authenticated and real data loads.
 */
const DEMO_MOOD_LOGS: MoodLog[] = [
  {
    id: 'demo-1',
    timestamp: new Date().toISOString(),
    energyLevel: 8,
    moodType: 'Calm',
    notes: 'Centered start to the morning after 15 min meditation.',
    triggers: ['Morning Routine', 'Tea'],
    physicalSensations: ['Relaxed shoulders', 'Deep breathing'],
  },
];

export const MoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAccessToken } = useAuth();
  const { showToast } = useToast();
  const [isMoodLoading, setIsMoodLoading] = useState(false);

  // When authenticated, start with empty array (real logs loaded via API).
  // When not authenticated, show demo logs for visual context.
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>(() => {
    if (user) return [];
    try {
      const saved = localStorage.getItem('mindful_moods');
      if (saved) {
        const parsed = JSON.parse(saved) as MoodLog[];
        // Discard old demo/fake entries on fresh load
        const real = parsed.filter(
          (m) => !m.id.startsWith('demo-') && !m.id.startsWith('log-')
        );
        return real.length > 0 ? real : DEMO_MOOD_LOGS;
      }
      return DEMO_MOOD_LOGS;
    } catch {
      return DEMO_MOOD_LOGS;
    }
  });

  // Sync to localStorage for offline resilience (only real server-confirmed logs)
  useEffect(() => {
    try {
      const toSave = moodLogs.filter(
        (m) => !m.id.startsWith('demo-') && !m.id.startsWith('pending-')
      );
      if (toSave.length > 0) {
        localStorage.setItem('mindful_moods', JSON.stringify(toSave));
      }
    } catch {}
  }, [moodLogs]);

  const reloadMoodLogs = useCallback(async () => {
    if (!user) return;
    const token = getAccessToken();
    if (!token) return;

    setIsMoodLoading(true);
    try {
      const res = await fetch('/api/moods?limit=30', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          const mapped: MoodLog[] = data.logs.map((l: Record<string, unknown>) => ({
            id: String(l.id || ''),
            timestamp: String(l.createdAt || l.created_at || new Date().toISOString()),
            energyLevel: Number(l.energyLevel ?? l.energy_level ?? 5),
            moodType: String(l.moodType ?? l.mood_type ?? 'Calm') as MoodLog['moodType'],
            notes: String(l.notes || ''),
            triggers: Array.isArray(l.triggers) ? (l.triggers as string[]) : [],
            physicalSensations: Array.isArray(l.physicalSensations ?? l.physical_sensations)
              ? ((l.physicalSensations ?? l.physical_sensations) as string[])
              : [],
          }));
          setMoodLogs(mapped);
        }
      }
    } catch (err) {
      console.warn('[MoodContext] Load moods notice:', err);
    } finally {
      setIsMoodLoading(false);
    }
  }, [user, getAccessToken]);

  // On auth change: clear demo data and load real logs
  useEffect(() => {
    if (user) {
      setMoodLogs([]); // Clear demo/stale data immediately
      void reloadMoodLogs();
    } else {
      setMoodLogs(DEMO_MOOD_LOGS);
    }
  }, [user, reloadMoodLogs]);

  const addMoodLog = useCallback(
    async (
      log: Omit<MoodLog, 'id' | 'timestamp'>,
      onSuccess?: () => void | Promise<void>
    ): Promise<AddMoodLogResult> => {
      const token = getAccessToken();

      // Require authentication for real persistence
      if (!user || !token) {
        return { ok: false, error: 'You must be signed in to record a mood check-in.' };
      }

      setIsMoodLoading(true);

      // Optimistic local update with temporary id (will be replaced by server UUID)
      const tempId = 'pending-' + Date.now();
      const optimisticLog: MoodLog = {
        ...log,
        id: tempId,
        timestamp: new Date().toISOString(),
      };
      setMoodLogs((prev) => [
        optimisticLog,
        ...prev.filter((m) => !m.id.startsWith('demo-')),
      ]);

      try {
        const res = await fetch('/api/moods', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token,
          },
          body: JSON.stringify(log),
        });

        if (!res.ok) {
          // Roll back optimistic update on server error
          setMoodLogs((prev) => prev.filter((m) => m.id !== tempId));

          let errorMsg = 'Failed to record mood check-in.';
          try {
            const errData = await res.json();
            if (errData?.error) errorMsg = errData.error as string;
          } catch {}

          if (res.status === 401) errorMsg = 'Session expired. Please sign in again.';
          if (res.status === 403) errorMsg = 'Access denied. Please refresh and try again.';

          return { ok: false, error: errorMsg };
        }

        const saved = await res.json();
        const serverLog: MoodLog = {
          id: String(saved.id || tempId),
          timestamp: String(
            saved.createdAt || saved.created_at || optimisticLog.timestamp
          ),
          energyLevel: Number(
            saved.energyLevel ?? saved.energy_level ?? log.energyLevel
          ),
          moodType: (
            saved.moodType ?? saved.mood_type ?? log.moodType
          ) as MoodLog['moodType'],
          notes: String(saved.notes || log.notes || ''),
          triggers: Array.isArray(saved.triggers)
            ? (saved.triggers as string[])
            : log.triggers,
          physicalSensations: Array.isArray(
            saved.physicalSensations ?? saved.physical_sensations
          )
            ? ((saved.physicalSensations ?? saved.physical_sensations) as string[])
            : log.physicalSensations,
        };

        // Replace optimistic entry with server-confirmed entry
        setMoodLogs((prev) => prev.map((m) => (m.id === tempId ? serverLog : m)));

        showToast('Emotional landscape updated 🌊');

        // Fire the onSuccess callback (e.g. refreshState from the calling component)
        if (onSuccess) {
          try {
            await onSuccess();
          } catch (cbErr) {
            console.warn('[MoodContext] onSuccess callback warning:', cbErr);
          }
        }

        return { ok: true, serverLog };
      } catch (err) {
        // Network / fetch error — roll back optimistic update
        setMoodLogs((prev) => prev.filter((m) => m.id !== tempId));
        const msg =
          err instanceof Error
            ? err.message
            : 'Network error. Please check your connection.';
        return { ok: false, error: msg };
      } finally {
        setIsMoodLoading(false);
      }
    },
    [user, getAccessToken, showToast]
  );

  return (
    <MoodContext.Provider value={{ moodLogs, addMoodLog, isMoodLoading, reloadMoodLogs }}>
      {children}
    </MoodContext.Provider>
  );
};

export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) throw new Error('useMood must be used within a MoodProvider');
  return context;
};
