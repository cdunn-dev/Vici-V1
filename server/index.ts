import express from "express";
import { logger } from './utils/logger';
import { registerRoutes } from "./routes";

const startTime = Date.now();
logger.info(`Starting server initialization at ${new Date().toISOString()}`);

// Log environment port settings
logger.info('Environment port settings:', {
  ENV_PORT: process.env.PORT,
  REPL_SLUG: process.env.REPL_SLUG,
  REPL_OWNER: process.env.REPL_OWNER,
  REPL_ID: process.env.REPL_ID
});

// Initialize Express app
const app = express();

// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Define potential ports to try
const ports = [8080, 3000, 3001];
let currentPortIndex = 0;

function tryBindPort() {
  if (currentPortIndex >= ports.length) {
    logger.error('Failed to bind to any available ports');
    process.exit(1);
    return;
  }

  const port = ports[currentPortIndex];
  logger.info(`Attempting to bind to port ${port}...`);

  const server = app.listen(port, "0.0.0.0", async () => {
    const bindDuration = Date.now() - startTime;
    logger.info(`✅ Server successfully bound to port ${port} in ${bindDuration}ms`);
    process.env.PORT = String(port);
    process.env.ACTIVE_PORT = String(port);

    try {
      await registerRoutes(app);
      logger.info("Routes initialized successfully");
    } catch (error) {
      logger.error("Error initializing routes:", error);
      server.close();
      process.exit(1);
    }
  }).on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is in use, trying next port...`);
      currentPortIndex++;
      tryBindPort();
    } else {
      logger.error('Server error:', error);
      process.exit(1);
    }
  });
}

// Start trying to bind to ports
tryBindPort();

logger.info('Server startup script completed, attempting port binding...');