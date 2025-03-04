import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import * as dotenv from 'dotenv';
import { migrateData } from './migrate-data';
import { validateEnv, env } from './config/env';
import { logger } from './utils/logger';
import { verifyMigrations } from './db/migrate';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Display application banner
logger.info('==========================================================');
logger.info('  Training App Server');
logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`  Database URL: ${process.env.DATABASE_URL ? 'configured' : 'not configured'}`);
logger.info(`  JWT Secret: ${process.env.JWT_SECRET ? 'configured' : 'not configured'}`);
logger.info(`  Migrate Data: ${process.env.MIGRATE_DATA || 'false'}`);
logger.info('==========================================================');

// Initialize the application
async function initializeApplication() {
  const startTime = Date.now();
  logger.info(`Starting application initialization at ${new Date().toISOString()}`);

  // Initialize Express app
  logger.info('Initializing Express application...');
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        logger.info(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
      }
    });
    next();
  });

  // Register routes (temporarily skip database initialization)
  logger.info('Registering application routes...');
  const server = await registerRoutes(app);
  logger.info('Routes registered successfully');

  // Error handling middleware
  app.use(errorHandler);

  // Temporarily skip Vite setup in development
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Development mode detected, skipping Vite setup temporarily');
  }

  const initDuration = Date.now() - startTime;
  logger.info(`Application initialization completed in ${initDuration}ms`);
  return { app, server };
}

// Start the application
(async () => {
  try {
    logger.info('Starting application...');
    const { server } = await initializeApplication();
    logger.info('Initialization complete, attempting to bind to port...');

    // Simplified port binding
    const port = 5000;
    const startTime = Date.now();

    server.listen(port, "0.0.0.0", () => {
      const bindDuration = Date.now() - startTime;
      logger.info(`✅ Server successfully bound to port ${port} in ${bindDuration}ms`);
      process.env.PORT = String(port);
      process.env.ACTIVE_PORT = String(port);
    });

    server.on('error', (error) => {
      const errorTime = Date.now() - startTime;
      logger.error(`Failed to bind to port ${port} after ${errorTime}ms:`, error);
      process.exit(1);
    });

  } catch (error) {
    logger.error('Failed to initialize application:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    process.exit(1);
  }
})();