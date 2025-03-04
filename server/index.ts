import express from "express";
import { logger } from './utils/logger';
import { createServer } from 'http';

const startTime = Date.now();
logger.info(`Starting minimal server initialization at ${new Date().toISOString()}`);

// Initialize Express app with minimal setup
const app = express();

// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Simple port binding
const port = 5000;

server.listen(port, "0.0.0.0", () => {
  const bindDuration = Date.now() - startTime;
  logger.info(`✅ Server successfully bound to port ${port} in ${bindDuration}ms`);
  process.env.PORT = String(port);
  process.env.ACTIVE_PORT = String(port);
});

server.on('error', (error) => {
  const errorTime = Date.now() - startTime;
  logger.error(`Failed to bind to port ${port} after ${errorTime}ms:`, error);
  process.exit(1);
});

logger.info('Server startup script completed, waiting for bind result...');