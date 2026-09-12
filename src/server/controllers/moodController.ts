/**
 * Mood Controller
 * Mindful 2.0 — Phase 1
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { moodService } from '../services/moodService';

export const moodController = {
  /**
   * POST /api/moods
   */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { energyLevel, moodType, notes, triggers, physicalSensations } = req.body;

      if (typeof energyLevel !== 'number' || energyLevel < 1 || energyLevel > 10) {
        res.status(400).json({ error: 'Energy level must be a number between 1 and 10' });
        return;
      }

      if (!moodType || typeof moodType !== 'string') {
        res.status(400).json({ error: 'Mood type is required' });
        return;
      }

      const log = await moodService.createMoodLog(userId, {
        energyLevel,
        moodType,
        notes: notes || '',
        triggers: Array.isArray(triggers) ? triggers : [],
        physicalSensations: Array.isArray(physicalSensations) ? physicalSensations : [],
      });

      res.status(201).json(log);
    } catch (error) {
      console.error('Create mood log error:', error);
      res.status(500).json({ error: 'Failed to record mood check-in' });
    }
  },

  /**
   * GET /api/moods
   */
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '30', 10)));
      const logs = await moodService.listMoodLogs(userId, limit);
      res.json({ logs });
    } catch (error) {
      console.error('List mood logs error:', error);
      res.status(500).json({ error: 'Failed to fetch mood logs' });
    }
  },
};
