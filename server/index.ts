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
    const start = Date.now();
    const path = req.path;

    // Capture JSON responses for logging
    const originalJson = res.json;
    res.json = function(body) {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (body) {
          const bodyStr = JSON.stringify(body);
          logLine += ` :: ${bodyStr.length > 50 ? bodyStr.substring(0, 47) + '...' : bodyStr}`;
        }
        logger.info(logLine);
      }
      return originalJson.call(this, body);
    };

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
  } else {
    logger.info('Production mode detected, skipping static file serving');
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

    // Update the port finding strategy
    const findAvailablePort = (startPort = 5000, maxAttempts = 10) => {
      let currentPort = startPort;
      let attempts = 0;

      const tryPort = () => {
        attempts++;
        const attemptTime = Date.now();
        logger.info(`[${new Date(attemptTime).toISOString()}] Port attempt ${attempts}: trying port ${currentPort}...`);

        const serverInstance = server.listen({
          port: currentPort,
          host: "0.0.0.0"
        }, () => {
          const listeningPort = serverInstance.address()?.port;
          const bindDuration = Date.now() - attemptTime;
          logger.info(`✅ Server successfully bound to port ${listeningPort} in ${bindDuration}ms`);

          // Store the actual port for other services to reference
          process.env.ACTIVE_PORT = String(listeningPort);
          process.env.PORT = String(listeningPort);
          logger.info(`✅ Environment PORT set to ${listeningPort}`);
        });

        serverInstance.on('error', (error) => {
          const errorTime = Date.now() - attemptTime;
          logger.warn(`⚠️ Port ${currentPort} unavailable after ${errorTime}ms: ${error.message}`);
          serverInstance.close();

          if (attempts < maxAttempts) {
            currentPort++;
            logger.info(`Retrying with port ${currentPort} in 100ms...`);
            setTimeout(tryPort, 100);
          } else {
            logger.warn(`⚠️ Failed to bind after ${attempts} attempts, using random port`);
            currentPort = 0;
            setTimeout(tryPort, 100);
          }
        });
      };

      tryPort();
    };

    // Start with port 5000
    logger.info('Beginning port binding process...');
    findAvailablePort(5000);

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