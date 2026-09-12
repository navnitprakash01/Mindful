/**
 * Intervention Context & Provider
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 *
 * Provides reactive access to intervention recommendations, active session state,
 * player modal controls, outcome recording, and personal learning metrics.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  InterventionDefinition,
  InterventionRecommendation,
  InterventionSession,
  InterventionEffectiveness,
  StateDimensionKey,
} from '../types';
import { useAuth } from './AuthContext';
import { usePersonalState } from './StateContext';

export interface CompleteSessionPayload {
  postStateSnapshot?: Record<StateDimensionKey, number>;
  perceivedUsefulness?: number;
  userFeedback?: string;
  durationSeconds?: number;
}

export interface InterventionContextType {
  recommendation: InterventionRecommendation | null;
  activeSession: InterventionSession | null;
  sessionHistory: InterventionSession[];
  effectiveness: Record<string, InterventionEffectiveness>;
  isLoading: boolean;
  isPlayerOpen: boolean;
  playerIntervention: InterventionDefinition | null;
  openPlayer: (intervention?: InterventionDefinition) => void;
  closePlayer: () => void;
  startSession: (interventionId: string) => Promise<InterventionSession | null>;
  completeSession: (sessionId: string, payload: CompleteSessionPayload) => Promise<InterventionSession | null>;
  refreshRecommendation: (textContext?: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  refreshEffectiveness: () => Promise<void>;
}

const InterventionContext = createContext<InterventionContextType | undefined>(undefined);

export const InterventionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getAccessToken } = useAuth();
  const { refreshState, personalState } = usePersonalState();

  const [recommendation, setRecommendation] = useState<InterventionRecommendation | null>(null);
  const [activeSession, setActiveSession] = useState<InterventionSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<InterventionSession[]>([]);
  const [effectiveness, setEffectiveness] = useState<Record<string, InterventionEffectiveness>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Player UI state
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [playerIntervention, setPlayerIntervention] = useState<InterventionDefinition | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [getAccessToken]);

  const refreshRecommendation = useCallback(async (textContext?: string) => {
    if (!user) return;
    try {
      const url = textContext
        ? `/api/interventions/recommendation?textContext=${encodeURIComponent(textContext)}`
        : '/api/interventions/recommendation';
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.recommendation) {
          setRecommendation(data.recommendation);
        }
      }
    } catch (err) {
      console.warn('[InterventionContext] Load recommendation notice:', err);
    }
  }, [user, getAuthHeaders]);

  const refreshHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/interventions/sessions?limit=20', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.history)) {
          setSessionHistory(data.history);
        }
      }
    } catch (err) {
      console.warn('[InterventionContext] Load history notice:', err);
    }
  }, [user, getAuthHeaders]);

  const refreshEffectiveness = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/interventions/effectiveness', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.effectiveness) {
          setEffectiveness(data.effectiveness);
        }
      }
    } catch (err) {
      console.warn('[InterventionContext] Load effectiveness notice:', err);
    }
  }, [user, getAuthHeaders]);

  // Initial load and reload on state change
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
        refreshRecommendation(),
        refreshHistory(),
        refreshEffectiveness(),
      ]).finally(() => setIsLoading(false));
    } else {
      setRecommendation(null);
      setActiveSession(null);
      setSessionHistory([]);
      setEffectiveness({});
    }
  }, [user, refreshRecommendation, refreshHistory, refreshEffectiveness]);

  // Re-fetch recommendation when personal state updates
  useEffect(() => {
    if (user && personalState) {
      void refreshRecommendation();
    }
  }, [personalState?.timestamp, user, refreshRecommendation]);

  const openPlayer = useCallback((intervention?: InterventionDefinition) => {
    if (intervention) {
      setPlayerIntervention(intervention);
    } else if (recommendation?.intervention) {
      setPlayerIntervention(recommendation.intervention);
    }
    setIsPlayerOpen(true);
  }, [recommendation]);

  const closePlayer = useCallback(() => {
    setIsPlayerOpen(false);
    setPlayerIntervention(null);
  }, []);

  const startSession = useCallback(async (interventionId: string): Promise<InterventionSession | null> => {
    if (!user) return null;
    try {
      const res = await fetch('/api/interventions/sessions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ interventionId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setActiveSession(data.session);
          return data.session;
        }
      }
    } catch (err) {
      console.error('[InterventionContext] startSession error:', err);
    }
    return null;
  }, [user, getAuthHeaders]);

  const completeSession = useCallback(async (
    sessionId: string,
    payload: CompleteSessionPayload
  ): Promise<InterventionSession | null> => {
    if (!user) return null;
    try {
      const res = await fetch(`/api/interventions/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setActiveSession(null);
          // Refresh state engine to react to new intervention outcome signal!
          await refreshState();
          // Refresh history and recommendation
          void refreshHistory();
          void refreshEffectiveness();
          void refreshRecommendation();
          return data.session;
        }
      }
    } catch (err) {
      console.error('[InterventionContext] completeSession error:', err);
    }
    return null;
  }, [user, getAuthHeaders, refreshState, refreshHistory, refreshEffectiveness, refreshRecommendation]);

  return (
    <InterventionContext.Provider
      value={{
        recommendation,
        activeSession,
        sessionHistory,
        effectiveness,
        isLoading,
        isPlayerOpen,
        playerIntervention,
        openPlayer,
        closePlayer,
        startSession,
        completeSession,
        refreshRecommendation,
        refreshHistory,
        refreshEffectiveness,
      }}
    >
      {children}
    </InterventionContext.Provider>
  );
};

export const useIntervention = (): InterventionContextType => {
  const context = useContext(InterventionContext);
  if (!context) {
    throw new Error('useIntervention must be used within an InterventionProvider');
  }
  return context;
};
