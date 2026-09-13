/**
 * Cognitive Controller
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 *
 * Handles HTTP requests for focus session initiation, heartbeats, completion, and purging.
 *
 * Strict Security Guarantees:
 * - Enforces authentication via req.user.id (never trusts client-supplied userId).
 * - Maximum payload size: 25 KB.
 * - Rejects any payload with keylogging or invasive telemetry fields.
 * - Multi-tenant isolation enforced on every session lookup.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { cognitiveService } from '../services/cognitiveService';
import {
  validateStartSessionInput,
  validateTelemetryWindow,
  validateCompleteSessionInput,
  assertNoKeyloggingPayload,
} from '../engine/cognitive/types';

export const cognitiveController = {
  /**
   * POST /api/cognitive/session/start
   */
  async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const keylogCheck = assertNoKeyloggingPayload(req.body);
      if (!keylogCheck.isValid) {
        res.status(400).json({ error: keylogCheck.error });
        return;
      }

      const validation = validateStartSessionInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const session = await cognitiveService.startSession(userId, req.body);
      res.status(201).json({ success: true, session });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start focus session';
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/cognitive/session/heartbeat
   */
  async recordHeartbeat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const keylogCheck = assertNoKeyloggingPayload(req.body);
      if (!keylogCheck.isValid) {
        res.status(400).json({ error: keylogCheck.error });
        return;
      }

      const { sessionId, telemetry } = req.body || {};
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ error: 'sessionId is required and must be a string' });
        return;
      }

      const telemetryValidation = validateTelemetryWindow(telemetry);
      if (!telemetryValidation.isValid) {
        res.status(400).json({ error: telemetryValidation.error });
        return;
      }

      const result = await cognitiveService.recordHeartbeat(userId, sessionId, telemetry);
      res.status(200).json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record telemetry heartbeat';
      if (message.includes('Forbidden')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }
      if (message.includes('Rate limit') || message.includes('Cannot record telemetry')) {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/cognitive/session/complete
   */
  async completeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const keylogCheck = assertNoKeyloggingPayload(req.body);
      if (!keylogCheck.isValid) {
        res.status(400).json({ error: keylogCheck.error });
        return;
      }

      const validation = validateCompleteSessionInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const { sessionId } = req.body;
      const result = await cognitiveService.completeSession(userId, sessionId, req.body);
      res.status(200).json({
        success: true,
        session: result.session,
        signal: result.signal,
        stateSnapshot: result.stateSnapshot,
        suggestedIntervention: result.suggestedIntervention,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete focus session';
      if (message.includes('Forbidden')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }
      if (message.includes('Cannot complete session')) {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/cognitive/session/discard
   */
  async discardSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const { sessionId } = req.body || {};
      if (!sessionId || typeof sessionId !== 'string') {
        res.status(400).json({ error: 'sessionId is required and must be a string' });
        return;
      }

      await cognitiveService.discardSession(userId, sessionId);
      res.status(200).json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to discard session';
      if (message.includes('Forbidden')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },

  /**
   * GET /api/cognitive/session/current
   */
  async getCurrentSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const session = cognitiveService.getActiveSession(userId);
      res.status(200).json({ success: true, session });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get current session';
      res.status(500).json({ error: message });
    }
  },

  /**
   * DELETE /api/cognitive/history
   */
  async purgeHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const result = await cognitiveService.purgeHistory(userId);
      res.status(200).json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to purge cognitive history';
      res.status(500).json({ error: message });
    }
  },
};
