/**
 * Personal State API Routes
 * Mindful 2.0 — Phase 1: Personal Wellness Intelligence
 */

import { Router } from 'express';
import { stateController } from '../controllers/stateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/current', stateController.getCurrentState);
router.get('/history', stateController.getStateHistory);
router.get('/baseline', stateController.getPersonalBaseline);
router.get('/evidence', stateController.getStateEvidence);
router.post('/recompute', stateController.recalculateState);
router.post('/recalculate', stateController.recalculateState);
router.post('/signal', stateController.ingestSignal);

export default router;
