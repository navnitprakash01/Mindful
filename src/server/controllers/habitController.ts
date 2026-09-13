/**
 * Habit Controller
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 *
 * Handles HTTP requests for habit creation, listing, updating, completion, and adoption.
 * Enforces strict multi-tenant isolation, body size bounds (<= 25 KB), and crisis screening.
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { habitService } from '../services/habitService';
import {
  validateCreateHabitInput,
  validateUpdateHabitInput,
  validateHabitCompletionInput,
  isValidDateString,
} from '../engine/habits/types';

export const habitController = {
  /**
   * GET /api/habits
   */
  async listHabits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const includeArchived = req.query.includeArchived === 'true';
      const habits = await habitService.listHabits(userId, includeArchived);
      res.status(200).json({ success: true, habits });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve habits';
      res.status(500).json({ error: message });
    }
  },

  /**
   * GET /api/habits/:id
   */
  async getHabitById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const habitId = req.params.id;
      if (!habitId) {
        res.status(400).json({ error: 'habit id is required' });
        return;
      }

      const habit = await habitService.getHabitById(userId, habitId);
      if (!habit) {
        res.status(404).json({ error: 'Habit not found' });
        return;
      }

      res.status(200).json({ success: true, habit });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve habit';
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/habits
   */
  async createHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const validation = validateCreateHabitInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const habit = await habitService.createHabit(userId, req.body);
      res.status(201).json({ success: true, habit });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create habit';
      if (message.includes('Safety Alert')) {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },

  /**
   * PATCH /api/habits/:id
   */
  async updateHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const habitId = req.params.id;
      if (!habitId) {
        res.status(400).json({ error: 'habit id is required' });
        return;
      }

      const validation = validateUpdateHabitInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const updated = await habitService.updateHabit(userId, habitId, req.body);
      res.status(200).json({ success: true, habit: updated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update habit';
      if (message.includes('Forbidden')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }
      if (message.includes('Safety Alert')) {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/habits/:id/complete
   */
  async completeHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const habitId = req.params.id;
      if (!habitId) {
        res.status(400).json({ error: 'habit id is required' });
        return;
      }

      const validation = validateHabitCompletionInput(req.body);
      if (!validation.isValid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const result = await habitService.completeHabit(userId, habitId, req.body);
      res.status(200).json({ success: true, ...result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete habit';
      if (message.includes('Forbidden')) {
        res.status(403).json({ error: message });
        return;
      }
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }
      if (message.includes('Cannot complete habit with status')) {
        res.status(400).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },

  /**
   * POST /api/habits/:id/uncomplete
   */
  async uncompleteHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const habitId = req.params.id;
      const { completionDate } = req.body || {};
      if (!completionDate || !isValidDateString(completionDate)) {
        res.status(400).json({ error: 'Valid completionDate (YYYY-MM-DD) is required' });
        return;
      }

      const updated = await habitService.uncompleteHabit(userId, habitId, completionDate);
      res.status(200).json({ success: true, habit: updated });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to uncomplete habit';
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
   * DELETE /api/habits/:id
   * Soft-archives habit by default, or purges if query ?purge=true.
   */
  async deleteHabit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const habitId = req.params.id;
      const purge = req.query.purge === 'true';

      if (purge) {
        await habitService.deleteHabit(userId, habitId);
      } else {
        await habitService.archiveHabit(userId, habitId);
      }

      res.status(200).json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete habit';
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
   * POST /api/habits/adopt-intervention
   */
  async adoptIntervention(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const { interventionId, targetFrequency = 7 } = req.body || {};
      if (!interventionId || typeof interventionId !== 'string') {
        res.status(400).json({ error: 'interventionId is required and must be a string' });
        return;
      }

      const habit = await habitService.adoptInterventionAsRitual(
        userId,
        interventionId,
        targetFrequency
      );
      res.status(201).json({ success: true, habit });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to adopt intervention';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
        return;
      }
      res.status(500).json({ error: message });
    }
  },
};
