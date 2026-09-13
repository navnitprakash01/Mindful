import { Request, Response } from 'express';
import { companionService } from '../services/companionService';
import type { CompanionRequest } from '../types/companion';
import { AuthenticatedRequest } from '../middleware/auth';
import { screenForCrisis, CRISIS_HELPLINE_MESSAGE } from '../engine/interventionEngine/safety';

export const companionController = {
  async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { message, conversation, conversationHistory, mode } = req.body as CompanionRequest & {
        conversationHistory?: any[];
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      const cleanMessage = message.trim();

      // Defensive Ingress Safety Screening
      const crisis = screenForCrisis(cleanMessage);
      if (crisis.isCrisisDetected) {
        const helpline = crisis.helplineNotice || CRISIS_HELPLINE_MESSAGE;
        const crisisSuggestions = ['Call 988', 'Crisis Text Line', 'Reach out for help'];
        res.json({
          message: helpline,
          reply: helpline,
          suggestions: crisisSuggestions,
          suggestedPathways: crisisSuggestions,
          timestamp: new Date().toISOString(),
          isCrisisDetected: true,
        });
        return;
      }

      const history = conversation || conversationHistory || [];
      const response = await companionService.chat(
        userId,
        cleanMessage,
        history,
        mode || 'Empathetic Listener'
      );

      res.json(response);
    } catch (error) {
      console.error('Companion chat error:', error);
      res.status(500).json({
        message: "I'm having trouble responding right now. Please try again.",
        reply: "I'm having trouble responding right now. Please try again.",
        suggestions: ['Try again', 'Talk more', 'Breathing exercise'],
        suggestedPathways: ['Try again', 'Talk more', 'Breathing exercise'],
        timestamp: new Date().toISOString(),
      });
    }
  },
};