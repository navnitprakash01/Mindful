/**
 * Weekly Digest Controller
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting & Weekly Digest
 *
 * Implements route handling and ingress safety enforcement for weekly digests.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { screenForCrisis, CRISIS_HELPLINE_MESSAGE } from '../engine/interventionEngine/safety';
import { digestService } from '../services/digestService';

export const digestController = {
  /**
   * GET /api/digest/weekly
   * Retrieves an existing weekly digest for authenticated user.
   */
  async getWeeklyDigest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Missing user authentication' });
      return;
    }

    try {
      const weekStart = typeof req.query.week_start === 'string' ? req.query.week_start : undefined;
      const digest = await digestService.getWeeklyDigest(userId, weekStart);

      if (!digest) {
        res.status(404).json({
          error: 'Not Found',
          message: `No weekly digest found for week starting ${weekStart || 'current week'}.`,
        });
        return;
      }

      res.status(200).json(digest);
    } catch (err) {
      res.status(500).json({
        error: 'Failed to retrieve weekly digest',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * POST /api/digest/weekly/generate
   * Generates or refreshes a weekly digest for authenticated user.
   */
  async generateWeeklyDigest(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Missing user authentication' });
      return;
    }

    try {
      // Ingress Safety Check
      const contextText = typeof req.body.contextText === 'string' ? req.body.contextText : null;
      const crisisScreening = screenForCrisis(contextText);

      if (crisisScreening.isCrisisDetected) {
        res.status(200).json({
          isCrisisSuppressed: true,
          matchedTrigger: crisisScreening.matchedTrigger,
          helplineNotice: CRISIS_HELPLINE_MESSAGE,
          message: 'Crisis marker detected. Predictive forecasting suppressed; please reach out to crisis resources.',
        });
        return;
      }

      const weekStartDate = typeof req.body.weekStartDate === 'string' ? req.body.weekStartDate : undefined;
      const timezone = typeof req.body.timezone === 'string' ? req.body.timezone : 'UTC';
      const allowAiEnhancement = req.body.allowAiEnhancement !== false;

      let evaluationTime: Date | undefined = undefined;
      if (typeof req.body.evaluationTime === 'string') {
        const parsed = new Date(req.body.evaluationTime);
        if (!isNaN(parsed.getTime())) {
          evaluationTime = parsed;
        }
      }

      const digest = await digestService.generateWeeklyDigest(
        userId,
        weekStartDate,
        evaluationTime,
        allowAiEnhancement,
        timezone
      );

      res.status(200).json(digest);
    } catch (err) {
      res.status(500).json({
        error: 'Failed to generate weekly digest',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
