/**
 * Wearable API Routes
 * Mindful 2.0 — Phase 9: Behavioral Signals + Wearable Integration V1
 */

import { Router } from 'express';
import { wearableController } from '../controllers/wearableController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/sync', wearableController.sync);
router.get('/baseline', wearableController.getBaseline);
router.get('/settings', wearableController.getSettings);
router.post('/settings', wearableController.updateSettings);
router.delete('/purge', wearableController.purge);

export default router;
