/**
 * Pattern Routes
 * Mindful 2.0 — Phase 2: Longitudinal Pattern Engine
 */

import { Router } from 'express';
import { patternController } from '../controllers/patternController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', patternController.getPatterns);
router.post('/refresh', patternController.refreshPatterns);

export default router;
