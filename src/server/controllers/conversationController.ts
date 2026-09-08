import { Request, Response } from 'express';
import { conversationService } from '../services/conversationService';
import type { CreateConversationRequest, CreateMessageRequest } from '../types/companion';
import { AuthenticatedRequest } from '../middleware/auth';

export const conversationController = {
  async createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { firstUserMessage } = req.body as { firstUserMessage?: string };
      const conversation = await conversationService.createConversation(userId, firstUserMessage);

      if (!conversation) {
        res.status(500).json({ error: 'Failed to create conversation' });
        return;
      }

      res.status(201).json(conversation);
    } catch (error) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  },

  async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const conversations = await conversationService.getConversations(userId);
      res.json({ conversations });
    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  },

  async getConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const conversation = await conversationService.getConversationById(userId, id);

      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const messages = await conversationService.getMessages(conversation.id);
      res.json({ conversation, messages });
    } catch (error) {
      console.error('Get conversation error:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  },

  async deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      await conversationService.deleteConversation(userId, id);
      res.status(204).send();
    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  },

  async addMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { conversationId, role, content, metadata } = req.body;
      
      if (!conversationId || !role || !content) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Verify conversation belongs to user
      const conversation = await conversationService.getConversationById(userId, conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }

      const message = await conversationService.addMessage({
        conversationId,
        role,
        content,
        metadata,
      });

      if (!message) {
        res.status(500).json({ error: 'Failed to add message' });
        return;
      }

      // Update conversation timestamp
      await conversationService.updateConversationTimestamp(conversationId);

      res.status(201).json(message);
    } catch (error) {
      console.error('Add message error:', error);
      res.status(500).json({ error: 'Failed to add message' });
    }
  },
};