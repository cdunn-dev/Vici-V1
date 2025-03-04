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
logger.info('==========================================================');

async function ensureDefaultUser() {
  try {
    logger.info('Checking for default user...');
    const user = await storage.getUser(1);
    if (!user) {
      logger.info("Creating default user...");
      await storage.createUser({
        username: "default",
        name: "Default User",
        dateOfBirth: new Date("1990-01-01"),
        gender: "Other",
        password: null,
        personalBests: null,
        connectedApps: null,
        stravaTokens: null
      });
      logger.info("Default user created successfully");
    } else {
      logger.info("Default user already exists");
    }
  } catch (error) {
    logger.error("Error ensuring default user:", error);
    throw error; // Propagate the error to be handled by the caller
  }
}

// Initialize the application
async function initializeApplication() {
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
        log(logLine);
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

      // Run data migration if needed
      if (dbInitialized && env.MIGRATE_DATA) {
        logger.info('Running data migration...');
        await migrateData();
        logger.info('Data migration completed');
      }
    } catch (error) {
      logger.error('Database initialization failed:', error);
      logger.warn('Application will use file-based storage');
    }
  } else {
    logger.warn('No DATABASE_URL provided. Using file-based storage.');
  }

  // Ensure default user exists
  try {
    await ensureDefaultUser();
  } catch (error) {
    logger.error('Failed to ensure default user:', error);
    throw error;
  }

  // Register routes
  logger.info('Registering application routes...');
  const server = await registerRoutes(app);
  logger.info('Routes registered successfully');

  // Error handling middleware
  app.use(errorHandler);

  // Setup Vite in development
  if (process.env.NODE_ENV === 'development') {
    logger.info('Setting up Vite development server...');
    await setupVite(app, server);
    logger.info('Vite setup completed');
  } else {
    logger.info('Setting up static file serving...');
    serveStatic(app);
    logger.info('Static file serving setup completed');
  }

  logger.info('Application initialization completed successfully');
  return { app, server };
}

// Start the application
(async () => {
  try {
    logger.info('Starting application...');
    const { server } = await initializeApplication();

    const port = env.PORT;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      logger.info(`Server listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
})();