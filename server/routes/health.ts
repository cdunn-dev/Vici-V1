
import express from 'express';
import { logger } from '../utils/logger';
import { getDatabaseVersion } from '../db/migrate';
import { db } from '../db';
import * as os from 'os';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connection if configured
    let dbStatus = 'not_configured';
    let dbVersion = 'n/a';
    
    if (db) {
      try {
        // Simple query to check DB connection
        await db.select().from(db.schema.users).limit(1);
        dbStatus = 'connected';
        dbVersion = await getDatabaseVersion();
      } catch (error) {
        dbStatus = 'error';
        logger.error('Database health check failed', error);
      }
    }
    
    // Calculate response time
    const responseTime = Date.now() - startTime;
    
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
        status: dbStatus,
        version: dbVersion,
      },
      system: systemInfo,
      responseTime: `${responseTime}ms`,
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

export default router;
