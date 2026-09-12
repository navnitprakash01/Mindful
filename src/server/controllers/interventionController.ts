/**
 * Intervention Controller
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { interventionService } from '../services/interventionService';
import { isValidUuid } from '../engine/providers';

export const interventionController = {
  /**
   * GET /api/interventions
   * List all interventions in the internal library
   */
  async getAvailable(req: AuthenticatedRequest, res: Response) {
    try {
      const interventions = interventionService.getAvailableInterventions();
      return res.json({ interventions });
    } catch (err) {
      console.error('[InterventionController] getAvailable error:', err);
      return res.status(500).json({ error: 'Failed to retrieve intervention library' });
    }
  },

  /**
   * GET /api/interventions/recommendation
   * Get personalized recommendation for the authenticated user
   */
  async getRecommendation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      let textContext: string | undefined = undefined;
      if (typeof req.query.textContext === 'string') {
        textContext = req.query.textContext.trim().slice(0, 1000);
      }

      const recommendation = await interventionService.getRecommendation(userId, textContext);
      return res.json({ recommendation });
    } catch (err: any) {
      console.error('[InterventionController] getRecommendation error:', err);
      return res.status(500).json({ error: err.message || 'Failed to retrieve recommendation' });
    }
  },

  /**
   * POST /api/interventions/sessions
   * Start a new intervention session
   */
  async startSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const { interventionId } = req.body;
      if (!interventionId || typeof interventionId !== 'string' || !interventionId.trim()) {
        return res.status(400).json({ error: 'Missing or invalid interventionId' });
      }

      const cleanId = interventionId.trim();
      if (!interventionService.getInterventionById(cleanId)) {
        return res.status(404).json({ error: `INTERVENTION_NOT_FOUND: Unknown intervention ID '${cleanId}'` });
      }

      const session = await interventionService.startSession(userId, cleanId);
      return res.status(201).json({ session });
    } catch (err: any) {
      console.error('[InterventionController] startSession error:', err);
      const status = err.message?.startsWith('INTERVENTION_NOT_FOUND') ? 404 : 500;
      return res.status(status).json({ error: err.message || 'Failed to start session' });
    }
  },

  /**
   * POST /api/interventions/sessions/:id/complete
   * Complete an intervention session with post-check-in deltas
   */
  async completeSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const sessionId = req.params.id;
      if (!sessionId || !isValidUuid(sessionId)) {
        return res.status(400).json({ error: 'INVALID_SESSION_ID: Must be a valid UUID' });
      }

      const { postStateSnapshot, perceivedUsefulness, userFeedback, durationSeconds } = req.body;

      if (perceivedUsefulness !== undefined) {
        if (
          typeof perceivedUsefulness !== 'number' ||
          !Number.isInteger(perceivedUsefulness) ||
          perceivedUsefulness < 1 ||
          perceivedUsefulness > 5
        ) {
          return res.status(400).json({ error: 'perceivedUsefulness must be an integer between 1 and 5' });
        }
      }

      if (durationSeconds !== undefined) {
        if (typeof durationSeconds !== 'number' || durationSeconds < 0 || durationSeconds > 14400) {
          return res.status(400).json({ error: 'durationSeconds must be a number between 0 and 14400' });
        }
      }

      if (userFeedback !== undefined) {
        if (typeof userFeedback !== 'string' || userFeedback.length > 1000) {
          return res.status(400).json({ error: 'userFeedback must be a string up to 1000 characters' });
        }
      }

      if (postStateSnapshot !== undefined) {
        if (typeof postStateSnapshot !== 'object' || postStateSnapshot === null || Array.isArray(postStateSnapshot)) {
          return res.status(400).json({ error: 'postStateSnapshot must be a key-value object' });
        }
        for (const [dimKey, dimVal] of Object.entries(postStateSnapshot)) {
          if (typeof dimVal !== 'number' || isNaN(dimVal) || dimVal < 0 || dimVal > 100) {
            return res.status(400).json({ error: `Invalid dimension value for ${dimKey}: must be a number between 0 and 100` });
          }
        }
      }

      const session = await interventionService.completeSession(userId, sessionId, {
        postStateSnapshot,
        perceivedUsefulness,
        userFeedback,
        durationSeconds,
      });

      return res.json({ session });
    } catch (err: any) {
      console.error('[InterventionController] completeSession error:', err);
      const status = err.message?.startsWith('SESSION_NOT_FOUND') ? 404 : 500;
      return res.status(status).json({ error: err.message || 'Failed to complete session' });
    }
  },

  /**
   * GET /api/interventions/sessions
   * Retrieve user session history
   */
  async getHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      let limit = 50;
      if (typeof req.query.limit === 'string') {
        const parsed = parseInt(req.query.limit, 10);
        if (!isNaN(parsed) && parsed > 0) {
          limit = Math.min(100, parsed);
        }
      }

      const history = await interventionService.getUserHistory(userId, limit);
      return res.json({ history });
    } catch (err: any) {
      console.error('[InterventionController] getHistory error:', err);
      return res.status(500).json({ error: err.message || 'Failed to retrieve session history' });
    }
  },

  /**
   * GET /api/interventions/effectiveness
   * Retrieve personal effectiveness metrics
   */
  async getEffectiveness(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session' });
      }

      const effectiveness = await interventionService.getEffectiveness(userId);
      return res.json({ effectiveness });
    } catch (err: any) {
      console.error('[InterventionController] getEffectiveness error:', err);
      return res.status(500).json({ error: err.message || 'Failed to retrieve effectiveness' });
    }
  },
};
