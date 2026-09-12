/**
 * Proactive Routes
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 */

import { Router } from 'express';
import { proactiveController } from '../controllers/proactiveController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/check', proactiveController.checkProactive);
router.post('/surfaced', proactiveController.recordSurfaced);
router.post('/respond', proactiveController.recordResponse);
router.get('/settings', proactiveController.getSettings);
router.post('/settings', proactiveController.updateSettings);

export default router;
