/**
 * Proactive Intelligence Controller
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { proactiveService } from '../services/proactiveService';
import { isValidUuid } from '../engine/providers';
import { isValidTimezone } from '../engine/proactiveEngine/policyRules';

export const proactiveController = {
  /**
   * GET /api/proactive/check
   * Read-only, side-effect-free evaluation of proactive status.
   */
  async checkProactive(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const timezone = typeof req.query.timezone === 'string' && isValidTimezone(req.query.timezone)
        ? req.query.timezone.trim()
        : undefined;
      const decision = await proactiveService.checkProactiveStatus(userId, { userTimezone: timezone });

      return res.json(decision);
    } catch (err: any) {
      console.error('[ProactiveController] checkProactive error:', err);
      return res.status(500).json({ error: 'Failed to evaluate proactive status' });
    }
  },

  /**
   * POST /api/proactive/surfaced
   * Explicitly records that a proactive recommendation was presented to the user.
   */
  async recordSurfaced(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { decision } = req.body;
      if (!decision || typeof decision !== 'object') {
        return res.status(400).json({ error: 'Invalid decision payload' });
      }

      const event = await proactiveService.recordSurfacedDecision(userId, decision);
      return res.status(201).json({ success: true, event });
    } catch (err: any) {
      console.error('[ProactiveController] recordSurfaced error:', err);
      return res.status(500).json({ error: 'Failed to record surfaced event' });
    }
  },

  /**
   * POST /api/proactive/respond
   * Records user response ('dismissed' | 'acted_upon') to a surfaced proactive action.
   */
  async recordResponse(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { eventId, response } = req.body;
      if (!eventId || !isValidUuid(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }

      if (response !== 'dismissed' && response !== 'acted_upon') {
        return res.status(400).json({ error: "Response must be 'dismissed' or 'acted_upon'" });
      }

      const event = await proactiveService.recordResponse(userId, eventId, response);
      return res.json({ success: true, event });
    } catch (err: any) {
      console.error('[ProactiveController] recordResponse error:', err);
      return res.status(500).json({ error: 'Failed to record user response' });
    }
  },

  /**
   * GET /api/proactive/settings
   */
  async getSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const settings = await proactiveService.getSettings(userId);
      return res.json({ settings });
    } catch (err: any) {
      console.error('[ProactiveController] getSettings error:', err);
      return res.status(500).json({ error: 'Failed to fetch settings' });
    }
  },

  /**
   * POST /api/proactive/settings
   */
  async updateSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const settings = await proactiveService.updateSettings(userId, req.body || {});
      return res.json({ success: true, settings });
    } catch (err: any) {
      console.error('[ProactiveController] updateSettings error:', err);
      const msg = err?.message || 'Failed to update settings';
      const statusCode = msg.includes('INVALID') ? 400 : 500;
      return res.status(statusCode).json({ error: msg });
    }
  },
};
