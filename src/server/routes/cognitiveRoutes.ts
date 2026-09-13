/**
 * Cognitive API Routes
 * Mindful 2.0 — Phase 10: Real-Time Cognitive Monitoring & Deep Work Focus Intelligence
 */

import { Router } from 'express';
import { cognitiveController } from '../controllers/cognitiveController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Strict user authentication required for all cognitive endpoints
router.use(authMiddleware);

router.post('/session/start', cognitiveController.startSession);
router.post('/session/heartbeat', cognitiveController.recordHeartbeat);
router.post('/session/complete', cognitiveController.completeSession);
router.post('/session/discard', cognitiveController.discardSession);
router.get('/session/current', cognitiveController.getCurrentSession);
router.delete('/history', cognitiveController.purgeHistory);

export default router;
