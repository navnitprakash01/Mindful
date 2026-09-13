/**
 * Weekly Digest API Routes
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting & Weekly Digest
 */

import { Router } from 'express';
import { digestController } from '../controllers/digestController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Strict user authentication required for all digest endpoints
router.use(authMiddleware);

router.get('/weekly', digestController.getWeeklyDigest);
router.post('/weekly/generate', digestController.generateWeeklyDigest);

export default router;
