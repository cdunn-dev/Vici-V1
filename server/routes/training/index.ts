import { Router } from 'express';
import { requireAuth } from '../shared/middleware/auth';
import planRoutes from './plan';
import workoutRoutes from './workouts';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Mount route modules
router.use('/plan', planRoutes);
router.use('/workouts', workoutRoutes);

export default router; 