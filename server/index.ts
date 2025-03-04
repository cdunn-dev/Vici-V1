import express from "express";
import { logger } from './utils/logger';
import { createServer } from 'http';

const startTime = Date.now();
logger.info(`Starting minimal server initialization at ${new Date().toISOString()}`);

// Log environment port settings
logger.info('Environment port settings:', {
  ENV_PORT: process.env.PORT,
  REPL_SLUG: process.env.REPL_SLUG,
  REPL_OWNER: process.env.REPL_OWNER,
  REPL_ID: process.env.REPL_ID
});

// Initialize Express app with minimal setup
const app = express();

// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Try port 3000 if 5000 fails
const attemptPorts = [5000, 3000];
let currentPortIndex = 0;

function tryNextPort() {
  if (currentPortIndex >= attemptPorts.length) {
    logger.error('Failed to bind to any available ports');
    process.exit(1);
    return;
  }

  const port = attemptPorts[currentPortIndex];
  logger.info(`Attempting to bind to port ${port}...`);

  server.listen(port, "0.0.0.0", () => {
    const bindDuration = Date.now() - startTime;
    logger.info(`✅ Server successfully bound to port ${port} in ${bindDuration}ms`);
    process.env.PORT = String(port);
    process.env.ACTIVE_PORT = String(port);
  });

  server.on('error', (error) => {
    const errorTime = Date.now() - startTime;
    logger.error(`Failed to bind to port ${port} after ${errorTime}ms:`, error);

    // Try next port
    currentPortIndex++;
    server.close(() => tryNextPort());
  });
}

// Start with first port
tryNextPort();

logger.info('Server startup script completed, waiting for bind result...');