import express from "express";
import { logger } from './utils/logger';

// Initialize Express app
const app = express();

// Add basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: 5000
  });
});

logger.info('Starting minimal server on port 5000...');

const server = app.listen(5000, "0.0.0.0", () => {
  logger.info('Minimal server successfully bound to port 5000');
});

server.on('error', (error) => {
  logger.error('Server failed to start:', error);
  process.exit(1);
});