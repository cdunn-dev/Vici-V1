import { Router } from 'express';
import { RedisMonitor } from '../services/redisMonitor';
import { logger } from '../utils/logger';

const router = Router();
const monitor = RedisMonitor.getInstance();

// Start monitoring when the server starts
monitor.startMonitoring();

router.get('/redis/stats', async (req, res) => {
  try {
    const stats = monitor.getStats();
    const latestStats = monitor.getLatestStats();
    const averageHitRate = monitor.getAverageHitRate();
    const memoryTrend = monitor.getMemoryUsageTrend();

    res.json({
      current: latestStats,
      history: stats,
      metrics: {
        averageHitRate,
        memoryTrend
      }
    });
  } catch (error) {
    logger.error('Error getting Redis stats:', error);
    res.status(500).json({ error: 'Failed to get Redis stats' });
  }
});

router.get('/redis/health', async (req, res) => {
  try {
    const latestStats = monitor.getLatestStats();
    if (!latestStats) {
      return res.status(503).json({ status: 'unknown', message: 'No monitoring data available' });
    }

    const status = latestStats.connected ? 'healthy' : 'unhealthy';
    const warnings = [];

    if (latestStats.memoryUsage && latestStats.memoryUsage.used > latestStats.memoryUsage.total * 0.8) {
      warnings.push('High memory usage');
    }

    if (latestStats.cacheMetrics.hitRate < 0.5) {
      warnings.push('Low cache hit rate');
    }

    res.json({
      status,
      timestamp: latestStats.timestamp,
      warnings,
      metrics: latestStats.cacheMetrics,
      memory: latestStats.memoryUsage,
      evictionPolicy: latestStats.evictionPolicy
    });
  } catch (error) {
    logger.error('Error checking Redis health:', error);
    res.status(500).json({ error: 'Failed to check Redis health' });
  }
});

export default router; 