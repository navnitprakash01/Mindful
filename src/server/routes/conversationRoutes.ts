import { Router } from 'express';
import { conversationController } from '../controllers/conversationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', conversationController.createConversation);
router.get('/', conversationController.getConversations);
router.get('/:id', conversationController.getConversation);
router.delete('/:id', conversationController.deleteConversation);
router.post('/:id/messages', conversationController.addMessage);

export default router;