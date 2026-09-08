import { Router } from 'express';
import { companionController } from '../controllers/companionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/chat', companionController.chat);

export default router;