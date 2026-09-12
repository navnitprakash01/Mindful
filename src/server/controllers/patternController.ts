/**
 * Pattern Controller
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { patternService } from '../services/patternService';

export const patternController = {
  /**
   * GET /api/patterns
   * Retrieve validated patterns for the authenticated user (read-only)
   */
  async getPatterns(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const patterns = await patternService.getPatterns(userId);
      return res.json({ patterns });
    } catch (err) {
      console.error('[PatternController] getPatterns error:', err);
      return res.status(500).json({ error: 'Failed to retrieve patterns' });
    }
  },

  /**
   * POST /api/patterns/refresh
   * Explicitly recompute and persist validated patterns for the authenticated user
   */
  async refreshPatterns(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const patterns = await patternService.analyzeAndPersistPatterns(userId);
      return res.json({
        patterns,
        message: 'Patterns analyzed and updated successfully',
      });
    } catch (err) {
      console.error('[PatternController] refreshPatterns error:', err);
      return res.status(500).json({ error: 'Failed to analyze patterns' });
    }
  },
};
