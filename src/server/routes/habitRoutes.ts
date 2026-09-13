/**
 * Habit API Routes
 * Mindful 2.0 — Phase 11: Behavioral Rituals & Habit Action Intelligence
 */

import { Router } from 'express';
import { habitController } from '../controllers/habitController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Strict user authentication required for all habit endpoints
router.use(authMiddleware);

router.get('/', habitController.listHabits);
router.get('/:id', habitController.getHabitById);
router.post('/', habitController.createHabit);
router.post('/adopt-intervention', habitController.adoptIntervention);
router.patch('/:id', habitController.updateHabit);
router.post('/:id/complete', habitController.completeHabit);
router.post('/:id/uncomplete', habitController.uncompleteHabit);
router.delete('/:id', habitController.deleteHabit);

export default router;
