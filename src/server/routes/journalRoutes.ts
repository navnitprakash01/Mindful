import { Router } from 'express';
import { journalController } from '../controllers/journalController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', journalController.list);
router.post('/', journalController.create);
router.get('/:id', journalController.getById);
router.put('/:id', journalController.update);
router.delete('/:id', journalController.delete);
router.patch('/:id/favorite', journalController.toggleFavorite);

export default router;