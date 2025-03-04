import express from 'express';
import { logger } from '../utils/logger';
import { getDatabaseVersion } from '../db/migrate';
import { db } from '../db';
import * as os from 'os';

const router = express.Router();

// Cached database status to prevent blocking health checks
let cachedDbStatus = {
  status: 'not_checked',
  version: 'unknown',
  lastCheck: 0
};

// Update cache in background
async function updateDbStatus() {
  try {
    // Simple query to check DB connection with timeout
    const checkPromise = db.select().from(db.schema.users).limit(1);
    await Promise.race([
      checkPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 5000))
    ]);

    cachedDbStatus.status = 'connected';
    cachedDbStatus.version = await getDatabaseVersion();
  } catch (error) {
    cachedDbStatus.status = 'error';
    logger.error('Database health check failed', error);
  }
  cachedDbStatus.lastCheck = Date.now();
}

// Non-blocking health check endpoint
router.get('/health', async (req, res) => {
  const startTime = Date.now();

  // Update cache if it's older than 30 seconds
  if (Date.now() - cachedDbStatus.lastCheck > 30000) {
    updateDbStatus().catch(err => logger.error('Failed to update DB status', err));
  }

  // System info
  const systemInfo = {
    uptime: process.uptime(),
    memory: {
      free: os.freemem(),
      total: os.totalmem(),
    },
    cpu: os.cpus().length,
  };

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: cachedDbStatus.status,
      version: cachedDbStatus.version,
    },
    system: systemInfo,
    responseTime: `${Date.now() - startTime}ms`,
  });
});

export default router;