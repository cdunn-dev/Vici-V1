import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import * as dotenv from 'dotenv';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Display application banner
logger.info('==========================================================');
logger.info('  Training App Server');
logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info('==========================================================');

// Initialize the application
async function initializeApplication() {
  logger.info('Starting application initialization...');

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

  // Register routes (with minimal initialization)
  logger.info('Registering application routes...');
  const server = await registerRoutes(app);
  logger.info('Routes registered successfully');

  // Setup Vite in development mode - but don't wait for it
  if (process.env.NODE_ENV !== 'production') {
    setupVite(app, server).catch(error => {
      logger.warn('Vite setup failed:', error);
    });
  }

  logger.info('Application initialization completed');
  return { app, server };
}

// Start the application 
(async () => {
  try {
    logger.info('Starting application...');
    const { server } = await initializeApplication();

    const port = 5000;
    logger.info(`Starting server on port ${port}...`);

    server.listen({
      port,
      host: "0.0.0.0"
    }, () => {
      logger.info(`Server successfully bound to port ${port}`);
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