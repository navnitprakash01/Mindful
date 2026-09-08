import { Request, Response } from 'express';
import { companionService } from '../services/companionService';
import type { CompanionRequest, CompanionResponse } from '../types/companion';
import { AuthenticatedRequest } from '../middleware/auth';

export const companionController = {
  async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { message, conversation, mode } = req.body as CompanionRequest;

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const response = await companionService.chat(
        userId,
        message.trim(),
        conversation || [],
        mode || 'Empathetic Listener'
      );

      res.json(response);
    } catch (error) {
      console.error('Companion chat error:', error);
      res.status(500).json({
        message: "I'm having trouble responding right now. Please try again.",
        suggestions: ['Try again', 'Talk more', 'Breathing exercise'],
        timestamp: new Date().toISOString(),
      });
    }
  },
};