import express from "express";
import { logger } from './utils/logger';
import healthApi from "./routes/health";

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

// Add basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register essential routes
app.use('/api', healthApi);

const port = 8080;
logger.info(`Attempting to bind to port ${port}...`);

const server = app.listen(port, "0.0.0.0", async () => {
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