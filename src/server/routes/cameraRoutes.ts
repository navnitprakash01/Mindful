/**
 * Camera API Routes
 * Mindful 2.0 — Phase 7: Camera / Face Behavioral Signal Model
 */

import { Router } from 'express';
import { cameraController } from '../controllers/cameraController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/analyze', cameraController.analyzeCamera);
router.get('/baseline', cameraController.getBaseline);

export default router;
