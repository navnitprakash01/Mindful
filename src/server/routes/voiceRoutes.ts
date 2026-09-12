/**
 * Voice API Routes
 * Mindful 2.0 — Phase 4: Advanced Voice Intelligence
 */

import { Router } from 'express';
import { voiceController } from '../controllers/voiceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/analyze', voiceController.analyzeVoice);
router.get('/baseline', voiceController.getBaseline);

export default router;
