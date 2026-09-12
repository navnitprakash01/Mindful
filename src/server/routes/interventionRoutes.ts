/**
 * Intervention Routes
 * Mindful 2.0 — Phase 3: Personalized Intervention + Outcome Tracking
 */

import { Router } from 'express';
import { interventionController } from '../controllers/interventionController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

// Discovery & Recommendation
router.get('/', interventionController.getAvailable);
router.get('/recommendation', interventionController.getRecommendation);
router.get('/effectiveness', interventionController.getEffectiveness);

// Session Lifecycle
router.get('/sessions', interventionController.getHistory);
router.post('/sessions', interventionController.startSession);
router.post('/sessions/:id/complete', interventionController.completeSession);

export default router;
