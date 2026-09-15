/**
 * useFocusSession Hook
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 *
 * Client-Side Behavioral Telemetry Collector with STRICT ZERO-KEYLOGGING:
 * - Listens ONLY to event.timeStamp on keydown to compute inter-stroke timing deltas.
 * - Under NO circumstances captures, inspects, or transmits event.key, event.code,
 *   characters, passwords, clipboard, DOM text, screenshots, URLs, or window titles.
 * - Attentional shifts are measured strictly by counting window blur/focus transitions.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FocusSession,
  FocusSessionType,
  CognitiveTelemetryWindow,
} from '../server/engine/cognitive/types';
import { getApiUrl } from '../lib/api';

interface UseFocusSessionReturn {
  activeSession: FocusSession | null;
  isActive: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  focusClarity: number;
  cognitiveLoad: number;
  recommendationTriggered: boolean;
  startSession: (sessionType: FocusSessionType, plannedDurationMinutes: number, activityLabel?: string) => Promise<void>;
  pauseSession: () => void;
  resumeSession: () => void;
  completeSession: (selfReportedStrain?: number) => Promise<any>;
  discardSession: () => Promise<void>;
  isSyncing: boolean;
  error: string | null;
}

const HEARTBEAT_INTERVAL_MS = 60000; // 60 seconds

export function useFocusSession(): UseFocusSessionReturn {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusClarity, setFocusClarity] = useState(70);
  const [cognitiveLoad, setCognitiveLoad] = useState(35);
  const [recommendationTriggered, setRecommendationTriggered] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telemetry buffer references
  const lastKeyTimestampRef = useRef<number | null>(null);
  const interKeyIntervalsRef = useRef<number[]>([]);
  const windowBlurCountRef = useRef(0);
  const windowIntervalStartRef = useRef(Date.now());
  const activeTypingSecondsRef = useRef(0);

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Zero-Keylogging Keydown Handler: strictly reads only event.timeStamp
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Drop event reference immediately; read ONLY numerical timeStamp
    const nowStamp = e.timeStamp;
    if (lastKeyTimestampRef.current !== null) {
      const deltaMs = nowStamp - lastKeyTimestampRef.current;
      // Filter out auto-repeat (< 30ms) or long pauses (> 8000ms)
      if (deltaMs >= 30 && deltaMs <= 8000) {
        interKeyIntervalsRef.current.push(deltaMs);
        if (interKeyIntervalsRef.current.length > 500) {
          interKeyIntervalsRef.current.shift();
        }
        activeTypingSecondsRef.current += deltaMs / 1000;
      }
    }
    lastKeyTimestampRef.current = nowStamp;
  }, []);

  // Attentional shift handler: counts window blur transitions
  const handleWindowBlur = useCallback(() => {
    windowBlurCountRef.current++;
  }, []);

  // Calculate local cadence entropy (coefficient of variation: stdDev / mean)
  const calculateCadenceEntropy = (): number => {
    const intervals = interKeyIntervalsRef.current;
    if (intervals.length < 5) return 0.40; // baseline default
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (mean === 0) return 0.40;
    const variance =
      intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;
    return Math.max(0.0, Math.min(2.0, Number(cv.toFixed(2))));
  };

  // Send aggregated telemetry window to backend
  const sendHeartbeat = useCallback(async () => {
    if (!activeSession || activeSession.status !== 'active' || isPaused) return;

    const now = Date.now();
    const intervalSeconds = Math.max(5, Math.round((now - windowIntervalStartRef.current) / 1000));
    const shifts = windowBlurCountRef.current;
    const activeTypingSecs = Math.min(intervalSeconds, Math.round(activeTypingSecondsRef.current));
    const entropy = calculateCadenceEntropy();

    const telemetry: CognitiveTelemetryWindow = {
      intervalSeconds,
      attentionalShiftCount: shifts,
      activeTypingSeconds: activeTypingSecs,
      typingCadenceEntropy: entropy,
    };

    // Reset local window buffers
    windowBlurCountRef.current = 0;
    activeTypingSecondsRef.current = 0;
    windowIntervalStartRef.current = now;

    try {
      const response = await fetch(getApiUrl('/api/cognitive/session/heartbeat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          telemetry,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setCognitiveLoad(data.cognitiveLoad);
          setFocusClarity(data.focusClarity);
          if (data.recommendationTriggered) {
            setRecommendationTriggered(true);
          }
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }, [activeSession, isPaused]);

  // Bind/unbind telemetry listeners when active & not paused
  useEffect(() => {
    if (activeSession && activeSession.status === 'active' && !isPaused) {
      window.addEventListener('keydown', handleKeyDown, { passive: true });
      window.addEventListener('blur', handleWindowBlur, { passive: true });

      // Run 1-second display timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // Run 60-second telemetry heartbeat timer
      heartbeatTimerRef.current = setInterval(() => {
        sendHeartbeat();
      }, HEARTBEAT_INTERVAL_MS);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('blur', handleWindowBlur);
        if (timerRef.current) clearInterval(timerRef.current);
        if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      };
    }
  }, [activeSession, isPaused, handleKeyDown, handleWindowBlur, sendHeartbeat]);

  const startSession = async (
    sessionType: FocusSessionType,
    plannedDurationMinutes: number,
    activityLabel?: string
  ) => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await fetch(getApiUrl('/api/cognitive/session/start'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType,
          plannedDurationMinutes,
          activityLabel,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to start session');
      }

      const data = await response.json();
      setActiveSession(data.session);
      setIsPaused(false);
      setElapsedSeconds(0);
      setFocusClarity(75);
      setCognitiveLoad(30);
      setRecommendationTriggered(false);
      windowIntervalStartRef.current = Date.now();
      windowBlurCountRef.current = 0;
      activeTypingSecondsRef.current = 0;
      interKeyIntervalsRef.current = [];
      lastKeyTimestampRef.current = null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error starting session';
      setError(msg);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const pauseSession = () => {
    setIsPaused(true);
  };

  const resumeSession = () => {
    setIsPaused(false);
    windowIntervalStartRef.current = Date.now();
  };

  const completeSession = async (selfReportedStrain?: number) => {
    if (!activeSession) return;
    setIsSyncing(true);
    setError(null);
    try {
      const totalDurationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const response = await fetch(getApiUrl('/api/cognitive/session/complete'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          totalDurationMinutes,
          selfReportedStrain,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete session');
      }

      const data = await response.json();
      setActiveSession(null);
      setIsPaused(false);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error completing session';
      setError(msg);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const discardSession = async () => {
    if (!activeSession) return;
    setIsSyncing(true);
    try {
      await fetch(getApiUrl('/api/cognitive/session/discard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });
    } catch {
      // Non-blocking
    } finally {
      setActiveSession(null);
      setIsPaused(false);
      setElapsedSeconds(0);
      setIsSyncing(false);
    }
  };

  return {
    activeSession,
    isActive: activeSession !== null && activeSession.status === 'active',
    isPaused,
    elapsedSeconds,
    focusClarity,
    cognitiveLoad,
    recommendationTriggered,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    discardSession,
    isSyncing,
    error,
  };
}
