import { RedisService } from '../services/redis';
import { RedisMonitor } from '../services/redisMonitor';
import { logger } from '../utils/logger';

async function initializeRedis() {
  try {
    logger.info('Initializing Redis...');
    
    // Get Redis instance
    const redis = RedisService.getInstance();
    
    // Check Redis health
    const isHealthy = await redis.healthCheck();
    if (!isHealthy) {
      throw new Error('Redis health check failed');
    }
    
    // Get memory usage
    const memoryUsage = await redis.getMemoryUsage();
    if (memoryUsage) {
      logger.info('Redis memory usage:', {
        used: `${(memoryUsage.used / 1024 / 1024).toFixed(2)} MB`,
        peak: `${(memoryUsage.peak / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memoryUsage.total / 1024 / 1024).toFixed(2)} MB`,
        fragmentation: `${(memoryUsage.fragmentation * 100).toFixed(2)}%`
      });
    }
    
    // Get eviction policy
    const evictionPolicy = await redis.getEvictionPolicy();
    if (evictionPolicy) {
      logger.info('Redis eviction policy:', evictionPolicy);
    }
    
    // Start monitoring
    const monitor = RedisMonitor.getInstance();
    monitor.startMonitoring();
    
    logger.info('Redis initialization completed successfully');
  } catch (error) {
    logger.error('Redis initialization failed:', error);
    process.exit(1);
  }
}

// Run initialization
initializeRedis(); 