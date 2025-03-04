import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import * as dotenv from 'dotenv';
import { migrateData } from './migrate-data'; // Added import for migration function
import { db } from './db'; // Added import for database client


// Load environment variables
dotenv.config();

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

  // Initialize the database before starting the server
  async function initializeDatabase() {
    try {
      if (process.env.DATABASE_URL && db) {
        try {
          // Check if the database is initialized by trying to perform a simple query
          await db.select().from(db.schema.users).limit(1);
          console.log('Database connected successfully');

          // Only run migration if MIGRATE_DATA environment variable is set
          if (process.env.MIGRATE_DATA === 'true') {
            console.log('Running data migration...');
            await migrateData();
          }
          return true;
        } catch (error) {
          console.error('Error connecting to database:', error);
          console.log('Application will use file-based storage');
          return false;
        }
      } else {
        console.log('No DATABASE_URL provided or database client not initialized. Using file-based storage.');
        return false;
      }
    } catch (error) {
      console.error('Error in database initialization:', error);
      console.log('Application will use file-based storage');
      return false;
    }
  }

  await initializeDatabase();


  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();