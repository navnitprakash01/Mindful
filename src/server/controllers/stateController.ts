/**
 * Personal State Controller
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 */

import { randomUUID } from 'node:crypto';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { stateService } from '../services/stateService';
import { evidenceService } from '../engine/evidenceGraph';
import { isValidUuid } from '../engine/providers';
import {
  WellnessSignal,
  SignalModality,
  StateDimensionKey,
  DimensionEstimate,
} from '../engine/types';

const ALLOWED_MODALITIES: SignalModality[] = [
  'text_journal',
  'voice_transcript',
  'companion_session',
  'mood_checkin',
  'habit_action',
];

const VALID_DIMENSIONS: StateDimensionKey[] = [
  'mood',
  'stress',
  'fatigue',
  'energy',
  'focus',
  'cognitiveLoad',
];

export const stateController = {
  /**
   * GET /api/state/current
   */
  async getCurrentState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const state = await stateService.getCurrentState(userId);
      res.json(state);
    } catch (error) {
      console.error('Get current state error:', error);
      res.status(500).json({ error: 'Failed to compute personal state' });
    }
  },

  /**
   * GET /api/state/history?days=7
   */
  async getStateHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const days = Math.min(30, Math.max(1, parseInt((req.query.days as string) || '7', 10)));
      const history = await stateService.getStateHistory(userId, days);
      res.json({ history });
    } catch (error) {
      console.error('Get state history error:', error);
      res.status(500).json({ error: 'Failed to fetch personal state history' });
    }
  },

  /**
   * GET /api/state/baseline
   */
  async getPersonalBaseline(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const baseline = await stateService.getPersonalBaseline(userId);
      res.json(baseline);
    } catch (error) {
      console.error('Get baseline error:', error);
      res.status(500).json({ error: 'Failed to compute personal baseline' });
    }
  },

  /**
   * GET /api/state/evidence
   */
  async getStateEvidence(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const evidence = await stateService.getStateEvidence(userId);
      res.json({ evidence });
    } catch (error) {
      console.error('Get state evidence error:', error);
      res.status(500).json({ error: 'Failed to retrieve state evidence' });
    }
  },

  /**
   * POST /api/state/recompute or /api/state/recalculate
   */
  async recalculateState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const state = await stateService.recomputeState(userId);
      res.json({ message: 'State recomputed successfully', state });
    } catch (error) {
      console.error('Recalculate state error:', error);
      res.status(500).json({ error: 'Failed to recalculate personal state' });
    }
  },

  /**
   * POST /api/state/signal
   * Ingest an explicit wellness signal with strict validation
   */
  async ingestSignal(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const body = req.body;
      if (!body || typeof body !== 'object') {
        res.status(400).json({ error: 'Invalid request body' });
        return;
      }

      // 1. Strict ownership verification
      if (body.userId && body.userId !== userId) {
        res.status(403).json({ error: 'Forbidden: Cannot ingest signals on behalf of another user' });
        return;
      }

      // 2. Modality whitelist verification
      if (!body.modality || !ALLOWED_MODALITIES.includes(body.modality)) {
        res.status(400).json({
          error: `Invalid modality. Must be one of: ${ALLOWED_MODALITIES.join(', ')}`,
        });
        return;
      }

      // 3. Strict dimension validation & clamping
      if (!body.estimates || typeof body.estimates !== 'object' || Array.isArray(body.estimates)) {
        res.status(400).json({ error: 'Estimates must be a valid key-value object' });
        return;
      }

      const validatedEstimates: Partial<Record<StateDimensionKey, DimensionEstimate>> = {};

      for (const dimKey of VALID_DIMENSIONS) {
        const est = body.estimates[dimKey];
        if (est && typeof est === 'object') {
          const rawVal = Number(est.value);
          const rawConf = Number(est.confidence);

          if (!isNaN(rawVal)) {
            const clampedVal = Math.max(0, Math.min(100, Math.round(rawVal)));
            const clampedConf = isNaN(rawConf)
              ? 0.75
              : Math.max(0.0, Math.min(1.0, Number(rawConf.toFixed(2))));

            validatedEstimates[dimKey] = {
              value: clampedVal,
              confidence: clampedConf,
            };
          }
        }
      }

      if (Object.keys(validatedEstimates).length === 0) {
        res.status(400).json({
          error: `Estimates must contain at least one valid numeric dimension from: ${VALID_DIMENSIONS.join(', ')}`,
        });
        return;
      }

      // 4. Reliability weight validation
      const rawWeight = Number(body.reliabilityWeight);
      const reliabilityWeight = !isNaN(rawWeight)
        ? Math.max(0.0, Math.min(1.0, Number(rawWeight.toFixed(2))))
        : 1.0;

      // 5. UUID compliance
      const signalId = isValidUuid(body.id) ? body.id : randomUUID();
      const sourceId = isValidUuid(body.sourceId) ? body.sourceId : undefined;

      const signal: WellnessSignal = {
        id: signalId,
        userId, // Enforce authenticated user ownership
        timestamp: body.timestamp || new Date().toISOString(),
        modality: body.modality,
        sourceId,
        estimates: validatedEstimates,
        features: body.features && typeof body.features === 'object' ? body.features : {},
        reliabilityWeight,
        expiresAt: body.expiresAt || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      };

      await stateService.ingestSignal(signal);
      res.status(201).json({ message: 'Signal ingested successfully', signalId: signal.id });
    } catch (error) {
      console.error('Ingest signal error:', error);
      res.status(500).json({ error: 'Failed to ingest wellness signal' });
    }
  },

  /**
   * GET /api/state/evidence-graph
   * Mindful 2.0 — Phase 6: Explainable AI / Evidence Graph
   */
  async getEvidenceGraph(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const evidenceGraphResponse = await evidenceService.getEvidenceGraph(userId);
      res.json(evidenceGraphResponse);
    } catch (error) {
      console.error('Get evidence graph error:', error);
      res.status(500).json({ error: 'Failed to construct evidence graph' });
    }
  },
};
