/**
 * Personal State Context
 * Mindful 2.0 — Phase 1
 * 
 * Provides reactive access to the user's unified PersonalState and longitudinal history.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PersonalState, PersonalBaseline, PersonalPattern } from '../types';
import { useAuth } from './AuthContext';

export interface StateContextType {
  personalState: PersonalState | null;
  stateHistory: PersonalState[];
  personalBaseline: PersonalBaseline | null;
  patterns: PersonalPattern[];
  isPatternsLoading: boolean;
  isStateLoading: boolean;
  stateError: string | null;
  refreshState: () => Promise<void>;
  recalculateState: () => Promise<void>;
  refreshPatterns: () => Promise<void>;
}

const StateContext = createContext<StateContextType | undefined>(undefined);

const STATE_STORAGE_KEY = 'mindful_personal_state';
const HISTORY_STORAGE_KEY = 'mindful_state_history';
const BASELINE_STORAGE_KEY = 'mindful_personal_baseline';
const PATTERNS_STORAGE_KEY = 'mindful_personal_patterns';

/**
 * Cold-start sentinel — all confidences are 0, no fabricated measurements.
 * The dashboard detects overallConfidence === 0 to show "Establishing baseline".
 */
const COLD_STATE: PersonalState = {
  id: 'state-cold',
  userId: 'anonymous',
  timestamp: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  mood: 50,
  stress: 50,
  fatigue: 50,
  energy: 50,
  focus: 50,
  cognitiveLoad: 50,
  confidence: 0,
  dimensions: {
    mood: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
    stress: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
    fatigue: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
    energy: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
    focus: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
    cognitiveLoad: { value: 50, confidence: 0, baselineDeviation: 0, trend: 'stable', contributingSignalIds: [] },
  },
  evidence: [],
  sourceSummary: {},
  overallConfidence: 0,
  somaticMarkers: [],
  contextualTriggers: [],
  activeSignalsCount: 0,
  decayHalfLifeHours: 12.0,
};

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAccessToken } = useAuth();
  const [personalState, setPersonalState] = useState<PersonalState | null>(() => {
    try {
      const saved = localStorage.getItem(STATE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PersonalState;
        // Discard legacy cached state that has fabricated confidence
        if (parsed.id === 'state-default') return COLD_STATE;
        return parsed;
      }
      return COLD_STATE;
    } catch {
      return COLD_STATE;
    }
  });

  const [stateHistory, setStateHistory] = useState<PersonalState[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [personalBaseline, setPersonalBaseline] = useState<PersonalBaseline | null>(() => {
    try {
      const saved = localStorage.getItem(BASELINE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isStateLoading, setIsStateLoading] = useState(false);
  const [stateError, setStateError] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  }, [getAccessToken]);

  const refreshState = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsStateLoading(true);
    setStateError(null);

    try {
      const [currentRes, historyRes, baselineRes] = await Promise.all([
        fetchWithAuth('/api/state/current'),
        fetchWithAuth('/api/state/history?days=7'),
        fetchWithAuth('/api/state/baseline'),
      ]);

      if (currentRes.ok) {
        const stateData: PersonalState = await currentRes.json();
        setPersonalState(stateData);
        try {
          localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(stateData));
        } catch {}
      }

      if (historyRes.ok) {
        const histData = await historyRes.json();
        if (Array.isArray(histData.history)) {
          setStateHistory(histData.history);
          try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(histData.history));
          } catch {}
        }
      }

      if (baselineRes.ok) {
        const baselineData: PersonalBaseline = await baselineRes.json();
        setPersonalBaseline(baselineData);
        try {
          localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(baselineData));
        } catch {}
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to refresh personal state';
      setStateError(msg);
    } finally {
      setIsStateLoading(false);
    }
  }, [user, fetchWithAuth]);

  const [patterns, setPatterns] = useState<PersonalPattern[]>(() => {
    try {
      const saved = localStorage.getItem(PATTERNS_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as PersonalPattern[]) : [];
    } catch {
      return [];
    }
  });
  const [isPatternsLoading, setIsPatternsLoading] = useState(false);

  const refreshPatterns = useCallback(async () => {
    if (!user) return;
    setIsPatternsLoading(true);
    try {
      const res = await fetchWithAuth('/api/patterns');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.patterns)) {
          setPatterns(data.patterns);
          try {
            localStorage.setItem(PATTERNS_STORAGE_KEY, JSON.stringify(data.patterns));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[StateContext] Pattern refresh notice:', err);
    } finally {
      setIsPatternsLoading(false);
    }
  }, [user, fetchWithAuth]);

  const recalculateState = useCallback(async () => {
    if (!user) return;
    setIsStateLoading(true);
    try {
      const res = await fetchWithAuth('/api/state/recalculate', { method: 'POST' });
      if (res.ok) {
        await refreshState();
        await refreshPatterns();
      }
    } catch (err) {
      console.warn('Recalculate state warning:', err);
    } finally {
      setIsStateLoading(false);
    }
  }, [user, fetchWithAuth, refreshState, refreshPatterns]);

  useEffect(() => {
    if (user) {
      void refreshState();
      void refreshPatterns();
    }
  }, [user, refreshState, refreshPatterns]);

  return (
    <StateContext.Provider
      value={{
        personalState,
        stateHistory,
        personalBaseline,
        patterns,
        isPatternsLoading,
        isStateLoading,
        stateError,
        refreshState,
        recalculateState,
        refreshPatterns,
      }}
    >
      {children}
    </StateContext.Provider>
  );
};

export const usePersonalState = () => {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('usePersonalState must be used within a StateProvider');
  }
  return context;
};
