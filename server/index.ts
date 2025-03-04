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
  logger.info('Starting application initialization...');

  // Validate environment variables
  logger.info('Validating environment variables...');
  if (!validateEnv()) {
    throw new Error('Environment validation failed');
  }

  // Initialize Express app
  logger.info('Initializing Express application...');
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());

  // Request logging middleware
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  // Initialize database if configured
  let dbInitialized = false;
  if (env.DATABASE_URL) {
    try {
      logger.info('Initializing database connection...');
      // Verify database migrations
      dbInitialized = await verifyMigrations(env.DATABASE_URL);
      logger.info('Database migrations verified successfully');

      // Run data migration if explicitly requested
      if (dbInitialized && env.MIGRATE_DATA === 'true') {
        logger.info('Running data migration...');
        await migrateData();
        logger.info('Data migration completed');
      }
    } catch (error) {
      logger.error('Database initialization failed:', error);
      if (error instanceof Error) {
        logger.error('Database error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      logger.warn('Application will use file-based storage');
    }
  } else {
    logger.warn('No DATABASE_URL provided. Using file-based storage.');
  }

  // Register routes
  logger.info('Registering application routes...');
  const server = await registerRoutes(app);
  logger.info('Routes registered successfully');

  // Error handling middleware
  app.use(errorHandler);

  // Setup Vite or static serving based on environment
  if (process.env.NODE_ENV !== 'production') {
    logger.info('Setting up Vite development server...');
    await setupVite(app, server);
    logger.info('Vite setup completed');
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

    const port = process.env.PORT || 5000;
    logger.info(`Attempting to bind server to port ${port}...`);

    const startBindTime = Date.now();

    server.listen({
      port,
      host: "0.0.0.0"
    }, () => {
      const bindDuration = Date.now() - startBindTime;
      logger.info(`Server successfully bound to port ${port} in ${bindDuration}ms`);
    });

    server.on('error', (error) => {
      logger.error('Server failed to start:', error);
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