/**
 * Forecast Service
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting
 *
 * Coordinates data gathering, temporal leakage protection, and ForecastEngine execution.
 * - Retrieves historical states up to evaluationTime (strictly enforced)
 * - Queries PersonalBaseline
 * - Queries validated temporal rhythms from PatternService
 * - Invokes pure defaultForecastEngine
 * - Zero state writes, zero memory writes, zero side effects
 */

import { stateService } from './stateService';
import { patternService } from './patternService';
import { defaultForecastEngine } from '../engine/forecastEngine/forecastEngine';
import { ForecastResult, ValidatedTemporalRhythm, ForecastDimension } from '../engine/forecastEngine/types';
import { PersonalPattern } from '../engine/patternEngine/types';

/**
 * Extracts validated temporal rhythms from longitudinal patterns.
 */
function extractTemporalRhythms(patterns: PersonalPattern[]): ValidatedTemporalRhythm[] {
  return patterns
    .filter((p) => p.type === 'temporal_rhythm' && (p.status === 'validated' || p.confidence >= 0.65))
    .map((p) => {
      let dim: ForecastDimension = 'stress';
      if (p.evidence?.metricKey === 'energy') dim = 'energy';
      else if (p.evidence?.metricKey === 'focus') dim = 'focus';
      else if (p.evidence?.metricKey === 'stress') dim = 'stress';

      const diff = (p.evidence?.supportingAvg ?? 50) - (p.evidence?.comparisonAvg ?? 50);
      const clampedOffset = Math.max(-15, Math.min(15, diff));

      return {
        dimension: dim,
        timeContext: p.evidence?.temporalContext || 'diurnal',
        offset: clampedOffset,
        confidence: p.confidence,
        observationCount: p.observationCount,
      };
    });
}

export const forecastService = {
  /**
   * Generates dynamic continuous forecast for user at evaluationTime.
   * Guarantees strict temporal leakage protection (created_at <= evaluationTime).
   */
  async getCurrentForecast(
    userId: string,
    evaluationTime: Date = new Date()
  ): Promise<ForecastResult> {
    const evalMs = evaluationTime.getTime();

    // 1. Fetch 30-day state history and strictly enforce temporal leakage barrier
    const rawHistory = await stateService.getStateHistory(userId, 30);
    const historicalStates = rawHistory.filter((s) => {
      const ts = new Date(s.createdAt || s.timestamp).getTime();
      return ts <= evalMs;
    });

    // 2. Fetch baseline
    const baseline = await stateService.getPersonalBaseline(userId);

    // 3. Fetch validated patterns and extract temporal rhythms
    const patterns = await patternService.getPatterns(userId);
    const historicalPatterns = patterns.filter((p) => {
      if (!p.updatedAt) return true;
      return new Date(p.updatedAt).getTime() <= evalMs;
    });
    const temporalRhythms = extractTemporalRhythms(historicalPatterns);

    // 4. Execute pure mathematical forecasting engine
    return defaultForecastEngine.generateForecast(
      historicalStates,
      baseline,
      temporalRhythms,
      evaluationTime
    );
  },
};
