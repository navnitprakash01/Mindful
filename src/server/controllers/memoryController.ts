/**
 * Memory API Controller
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { memoryService, MemoryCategory, MemoryStatus } from '../services/memoryService';
import { isValidUuid } from '../engine/providers';

export const memoryController = {
  /**
   * GET /api/memory
   * List memories for authenticated user.
   */
  async listMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const category = req.query.category as MemoryCategory | undefined;
      const status = req.query.status as MemoryStatus | undefined;

      const memories = await memoryService.listMemories(userId, { category, status });
      return res.json({ memories });
    } catch (err: any) {
      console.error('[MemoryController] listMemories error:', err);
      return res.status(500).json({ error: 'Failed to list memories' });
    }
  },

  /**
   * POST /api/memory
   * Create or update an explicit personal memory.
   */
  async createMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { category, key, summary, confidence, sourceId, expiresAt } = req.body;
      if (!category || !key || !summary) {
        return res.status(400).json({ error: 'Missing required fields: category, key, summary' });
      }

      const memory = await memoryService.createMemory(userId, {
        category,
        key,
        summary,
        confidence,
        sourceType: 'user_explicit', // API endpoint is for user explicit preferences/goals
        sourceId,
        expiresAt,
      });

      return res.status(201).json({ success: true, memory });
    } catch (err: any) {
      const msg = err?.message || 'Failed to create memory';
      const statusCode = msg.includes('REJECTED') || msg.includes('INVALID') || msg.includes('TOO_LONG') || msg.includes('PROHIBITED')
        ? 400
        : 500;
      return res.status(statusCode).json({ error: msg });
    }
  },

  /**
   * DELETE /api/memory/:id
   * Delete an individual memory.
   */
  async deleteMemory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const memoryId = req.params.id;
      if (!memoryId || !isValidUuid(memoryId)) {
        return res.status(400).json({ error: 'Invalid memory ID' });
      }

      const success = await memoryService.deleteMemory(userId, memoryId);
      if (!success) {
        return res.status(404).json({ error: 'Memory not found' });
      }
      return res.json({ success: true });
    } catch (err: any) {
      console.error('[MemoryController] deleteMemory error:', err);
      return res.status(500).json({ error: 'Failed to delete memory' });
    }
  },

  /**
   * DELETE /api/memory
   * Forget all memories for the authenticated user.
   */
  async forgetAllMemories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId || !isValidUuid(userId)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const count = await memoryService.forgetAllMemories(userId);
      return res.json({ success: true, purgedCount: count });
    } catch (err: any) {
      console.error('[MemoryController] forgetAllMemories error:', err);
      return res.status(500).json({ error: 'Failed to purge memories' });
    }
  },
};
