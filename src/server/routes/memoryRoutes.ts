/**
 * Memory Routes
 * Mindful 2.0 — Phase 8: Proactive Intelligence + Personal AI Memory
 */

import { Router } from 'express';
import { memoryController } from '../controllers/memoryController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', memoryController.listMemories);
router.post('/', memoryController.createMemory);
router.delete('/:id', memoryController.deleteMemory);
router.delete('/', memoryController.forgetAllMemories);

export default router;
