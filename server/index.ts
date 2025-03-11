import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { setupAuth } from "./auth";

const app = express();
console.log("[Startup] Express app created");

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
console.log("[Startup] Body parsing middleware configured");

// Request logging middleware with enhanced error tracking
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Add error event handler
  res.on('error', (error) => {
    console.error(`[Error] Response error for ${req.method} ${path}:`, error);
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (res.statusCode >= 400) {
      console.error(`[Error] ${logLine} :: ${JSON.stringify(capturedJsonResponse)}`);
    } else if (path.startsWith("/api")) {
      log(`[API] ${logLine} :: ${JSON.stringify(capturedJsonResponse)}`);
    }
  });

  next();
});
console.log("[Startup] Request logging middleware configured");

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function ensureDefaultUser() {
  try {
    console.log("[Startup] Checking for default user");
    const user = await storage.getUser(1);
    if (!user) {
      console.log("[Startup] Creating default user...");
      await storage.createUser({
        email: "default@example.com",
        password: "password",
        connectedApps: [],
        stravaTokens: null
      });
      console.log("[Startup] Default user created successfully");
    } else {
      console.log("[Startup] Default user already exists");
    }
  } catch (error) {
    console.error("[Startup] Error ensuring default user:", error);
  }
}

(async () => {
  try {
    console.log("[Startup] Beginning server initialization");

    // Setup authentication before routes
    console.log("[Startup] Setting up authentication");
    setupAuth(app);

    console.log("[Startup] Registering routes");
    const server = await registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("[Error] Unhandled error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ error: message });
    });

    // Ensure we have a default user
    await ensureDefaultUser();

    console.log("[Startup] Setting up Vite/Static serving");
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      console.log(`[Startup] Server listening on port ${port}`);
      console.log(`[Startup] Server URL: http://0.0.0.0:${port}`);
      console.log("[Startup] Environment:", app.get("env"));
    });

    // Handle server errors
    server.on('error', (error: any) => {
      console.error('[Server Error]', error);
      if (error.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${port} is already in use`);
      }
    });
  } catch (error) {
    console.error("[Startup] Fatal error during initialization:", error);
    process.exit(1);
  }
})();