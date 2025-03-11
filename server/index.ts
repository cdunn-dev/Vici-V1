import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { storage } from "./storage";
import { setupAuth } from "./auth";

const app = express();
console.log("[Startup] Express app created");

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
console.log("[Startup] Body parsing middleware configured");

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

(async () => {
  try {
    console.log("[Startup] Beginning server initialization");

    // Setup authentication before routes
    console.log("[Startup] Setting up authentication");
    setupAuth(app);

    console.log("[Startup] Registering routes");
    const server = await registerRoutes(app);

    console.log("[Startup] Setting up Vite/Static serving");
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = process.env.PORT || 5000;
    server.listen({
      port,
      host: "0.0.0.0",
    }, () => {
      console.log(`[Startup] Server listening on port ${port}`);
    });

  } catch (error) {
    console.error("[Startup] Fatal error during initialization:", error);
    process.exit(1);
  }
})();