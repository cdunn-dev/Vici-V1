import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import * as dotenv from 'dotenv';
import { migrateData } from './migrate-data';
import { db } from './db';
import { validateEnv, env } from './config/env';
import { logger } from './utils/logger';
import { verifyMigrations } from './db/migrate';
import { errorHandler } from './middleware/errorHandler';

// Load and validate environment variables
dotenv.config();

// Display application banner
logger.info('==========================================================');
logger.info('  Training App Server');
logger.info(`  Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info('==========================================================');

async function ensureDefaultUser() {
  try {
    const user = await storage.getUser(1); // Uses the existing file-based storage as fallback
    if (!user) {
      console.log("Creating default user...");
      await storage.createUser({
        username: "default",
        name: "Default User",
        dateOfBirth: new Date("1990-01-01"),
        gender: "Other",
        personalBests: {},
        connectedApps: [],
        stravaTokens: null
      });
      console.log("Default user created successfully");
    }
  } catch (error) {
    console.error("Error ensuring default user:", error);
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Ensure we have a default user
  await ensureDefaultUser();

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Add global error handler
  app.use(errorHandler);

  // Initialize the application
  async function initializeApplication() {
    // Validate environment variables
    if (!validateEnv()) {
      logger.error('Environment validation failed. Exiting application.');
      process.exit(1);
    }

    // Initialize database if configured
    let dbInitialized = false;
    if (env.DATABASE_URL) {
      try {
        // Verify database migrations
        dbInitialized = await verifyMigrations(env.DATABASE_URL);

        // Run data migration if needed
        if (dbInitialized && env.MIGRATE_DATA) {
          logger.info('Running data migration from file to database...');
          await migrateData();
          logger.info('Data migration completed successfully');
        }
      } catch (error) {
        logger.error('Database initialization failed:', error);
        logger.warn('Application will use file-based storage');
      }
    } else {
      logger.warn('No DATABASE_URL provided. Using file-based storage.');
    }

    return dbInitialized;
  }

  try {
    await initializeApplication();

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
})();