/**
 * Mood API Routes
 * Mindful 2.0 — Phase 1
 */

import { Router } from 'express';
import { moodController } from '../controllers/moodController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', moodController.create);
router.get('/', moodController.list);

export default router;
