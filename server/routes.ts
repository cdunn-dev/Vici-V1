import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { authenticate, AuthRequest } from "./middleware/auth";
import authRoutes from "./routes/auth";
import healthApi from "./routes/health";
import { logger } from "./utils/logger";

export async function registerRoutes(app: Express) {
  const server = createServer(app);

  // Initialize WebSocket server with more flexible configuration
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    perMessageDeflate: false // Disable compression for better compatibility
  });

  wss.on('connection', (ws, req) => {
    const clientUrl = req.headers.origin || 'unknown';
    logger.info(`New WebSocket connection from ${clientUrl}`);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        logger.info('Received WebSocket message:', data);
      } catch (error) {
        logger.warn('Failed to parse WebSocket message:', message.toString());
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });

    // Send initial connection acknowledgment
    ws.send(JSON.stringify({ type: 'connection_ack', timestamp: new Date().toISOString() }));
  });

  // Auth routes
  app.use("/api/auth", authRoutes);

  // Add health check route first
  app.use('/api', healthApi);

  logger.info('API routes and WebSocket server registered successfully');

  return server;
}