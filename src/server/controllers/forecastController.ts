/**
 * Forecast Controller
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting
 *
 * Implements route handling and ingress safety enforcement for forward forecasts.
 * - Authenticates request
 * - Executes SafetyScreening.screenForCrisis BEFORE invoking forecasting
 * - Suppresses forecasting immediately on crisis
 * - Invokes ForecastService only when safe
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { screenForCrisis, CRISIS_HELPLINE_MESSAGE } from '../engine/interventionEngine/safety';
import { forecastService } from '../services/forecastService';

export const forecastController = {
  /**
   * GET /api/forecast/current
   * Retrieves current forward-looking forecast for authenticated user.
   */
  async getCurrentForecast(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Missing user authentication' });
      return;
    }

    try {
      // 1. Ingress Safety Screening Check: Pre-emptively intercept crisis
      const contextText = typeof req.query.contextText === 'string' ? req.query.contextText : null;
      const crisisScreening = screenForCrisis(contextText);

      if (crisisScreening.isCrisisDetected) {
        res.status(200).json({
          isCrisisSuppressed: true,
          matchedTrigger: crisisScreening.matchedTrigger,
          helplineNotice: CRISIS_HELPLINE_MESSAGE,
          confidenceScore: 0.0,
          horizons: {
            '24h': { status: 'insufficient_evidence', confidenceScore: 0.0, confidenceTier: 'insufficient', dimensions: {} },
            '3d':  { status: 'insufficient_evidence', confidenceScore: 0.0, confidenceTier: 'insufficient', dimensions: {} },
            '7d':  { status: 'insufficient_evidence', confidenceScore: 0.0, confidenceTier: 'insufficient', dimensions: {} },
          },
          evidence: {
            totalSnapshotsInWindow: 0,
            cleanSnapshotsCount: 0,
            distinctCalendarDays: 0,
            observationWindowDays: 28,
            activeSensorModalities: [],
            hoursSinceLatestSnapshot: 0,
            hasDiurnalRhythmMatch: false,
          },
        });
        return;
      }

      // 2. Parse optional evaluationTime parameter (used in leak-free backtesting)
      let evaluationTime: Date | undefined = undefined;
      if (typeof req.query.evaluationTime === 'string') {
        const parsed = new Date(req.query.evaluationTime);
        if (!isNaN(parsed.getTime())) {
          evaluationTime = parsed;
        }
      }

      // 3. Safe to compute forecast
      const forecast = await forecastService.getCurrentForecast(userId, evaluationTime);
      res.status(200).json(forecast);
    } catch (err) {
      res.status(500).json({
        error: 'Failed to generate forecast',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
