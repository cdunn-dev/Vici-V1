import { Express } from 'express';
import { setupAuth } from '../auth';
import authRoutes from './auth';
import trainingRoutes from './training';
import userRoutes from './user';
import { errorHandler } from './shared/middleware/error';

export async function registerRoutes(app: Express) {
  // Setup authentication routes and middleware
  setupAuth(app);

  // Register domain-specific routes
  app.use('/api/auth', authRoutes);
  app.use('/api/training', trainingRoutes);
  app.use('/api/user', userRoutes);

  // Global error handling middleware
  app.use(errorHandler);
} 