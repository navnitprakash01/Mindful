/**
 * useForecast Hook
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting
 *
 * Provides reactive access to forward forecasts and weekly retrospective digests.
 * - Queries /api/forecast/current and /api/digest/weekly with authentication
 * - Graceful fallback to client-side pure calculation if offline or unmigrated
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePersonalState } from '../context/StateContext';
import { ForecastResult } from '../server/engine/forecastEngine/types';
import { WeeklyDigest } from '../server/engine/digest/types';
import { defaultForecastEngine } from '../server/engine/forecastEngine/forecastEngine';
import { getApiUrl } from '../lib/api';

export function useForecast() {
  const { session } = useAuth();
  const { stateHistory, personalBaseline, patterns } = usePersonalState();

  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchForecast = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = session?.access_token;
    if (token) {
      try {
        const res = await fetch(getApiUrl('/api/forecast/current'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setForecast(data);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fall through to client-side calculation
      }
    }

    // Client-side fallback using pure defaultForecastEngine
    try {
      if (personalBaseline && stateHistory && stateHistory.length > 0) {
        const localForecast = defaultForecastEngine.generateForecast(
          stateHistory as any,
          personalBaseline as any,
          [],
          new Date()
        );
        setForecast(localForecast);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
    } finally {
      setIsLoading(false);
    }
  }, [session, stateHistory, personalBaseline]);

  const fetchDigest = useCallback(async () => {
    const token = session?.access_token;
    if (!token) return;

    try {
      const res = await fetch(getApiUrl('/api/digest/weekly'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDigest(data);
      }
    } catch {
      // Non-critical background fetch
    }
  }, [session]);

  useEffect(() => {
    void fetchForecast();
    void fetchDigest();
  }, [fetchForecast, fetchDigest]);

  return {
    forecast,
    digest,
    isLoading,
    error,
    refreshForecast: fetchForecast,
    refreshDigest: fetchDigest,
  };
}
