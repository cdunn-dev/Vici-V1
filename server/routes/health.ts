import express from 'express';
import { RedisService } from '../services/redis';

const router = express.Router();
const redis = RedisService.getInstance();

router.get('/health', async (req, res) => {
  try {
    const redisHealth = await redis.healthCheck();
    const redisMemory = await redis.getMemoryUsage();
    const cacheMetrics = redis.getMetrics();
    const hitRate = redis.getHitRate();
    const evictionPolicy = await redis.getEvictionPolicy();

    const healthStatus = {
      status: redisHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      redis: {
        connected: redisHealth,
        memory: redisMemory,
        cache: {
          hits: cacheMetrics.hits,
          misses: cacheMetrics.misses,
          hitRate: `${(hitRate * 100).toFixed(2)}%`,
          lastReset: cacheMetrics.lastReset
        },
        evictionPolicy
      }
    };

    res.status(redisHealth ? 200 : 503).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Failed to check system health'
    });
  }
});

export default router; 