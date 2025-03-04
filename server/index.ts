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

// Request logging middleware
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
      log(logLine);
    }
  });

  next();
});
console.log("[Startup] Request logging middleware configured");

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

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("[Error]", err);
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
      log(`[Startup] Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("[Startup] Fatal error during initialization:", error);
    process.exit(1);
  }
})();