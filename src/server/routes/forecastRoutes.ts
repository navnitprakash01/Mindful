/**
 * Forecast API Routes
 * Mindful 2.0 — Phase 13: Longitudinal Wellness Intelligence Forecasting
 */

import { Router } from 'express';
import { forecastController } from '../controllers/forecastController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Strict user authentication required for all forecast endpoints
router.use(authMiddleware);

router.get('/current', forecastController.getCurrentForecast);

export default router;
