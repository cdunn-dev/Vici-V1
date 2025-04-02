import request from 'supertest';
import express from 'express';
import monitoringRoutes from '../routes/monitoring';
import { RedisMonitor } from '../services/redisMonitor';

// Mock dependencies
jest.mock('../services/redisMonitor');
jest.mock('../utils/logger');

interface RedisStats {
  timestamp: Date;
  connected: boolean;
  memoryUsage: {
    used: number;
    peak: number;
    total: number;
    fragmentation: number;
  } | null;
  cacheMetrics: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  evictionPolicy: {
    maxMemory: number;
    maxKeys: number;
    strategy: string;
  } | null;
}

describe('Monitoring Routes', () => {
  let app: express.Application;
  let mockRedisMonitor: jest.Mocked<RedisMonitor>;
  let mockStats: RedisStats;

  beforeEach(() => {
    app = express();
    app.use('/api/monitoring', monitoringRoutes);

    // Setup mock data
    mockStats = {
      timestamp: new Date(),
      connected: true,
      memoryUsage: {
        used: 1000000,
        peak: 2000000,
        total: 8000000,
        fragmentation: 1.5
      },
      cacheMetrics: {
        hits: 100,
        misses: 20,
        hitRate: 0.83
      },
      evictionPolicy: {
        maxMemory: 1000000,
        maxKeys: 1000000,
        strategy: 'allkeys-lru'
      }
    };

    // Setup mock monitor
    mockRedisMonitor = {
      getInstance: jest.fn().mockReturnThis(),
      getStats: jest.fn().mockReturnValue([mockStats]),
      getLatestStats: jest.fn().mockReturnValue(mockStats),
      getAverageHitRate: jest.fn().mockReturnValue(0.83),
      getMemoryUsageTrend: jest.fn().mockReturnValue({ increasing: true, percentage: 5 }),
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn()
    } as any;

    (RedisMonitor as any).getInstance = jest.fn().mockReturnValue(mockRedisMonitor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/monitoring/redis/stats', () => {
    test('returns Redis statistics', async () => {
      const response = await request(app)
        .get('/api/monitoring/redis/stats')
        .expect(200);

      expect(response.body).toEqual({
        current: expect.any(Object),
        history: expect.any(Array),
        metrics: {
          averageHitRate: 0.83,
          memoryTrend: {
            increasing: true,
            percentage: 5
          }
        }
      });

      expect(mockRedisMonitor.getStats).toHaveBeenCalled();
      expect(mockRedisMonitor.getLatestStats).toHaveBeenCalled();
      expect(mockRedisMonitor.getAverageHitRate).toHaveBeenCalled();
      expect(mockRedisMonitor.getMemoryUsageTrend).toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      mockRedisMonitor.getStats.mockImplementationOnce(() => {
        throw new Error('Redis error');
      });

      const response = await request(app)
        .get('/api/monitoring/redis/stats')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to get Redis stats'
      });
    });
  });

  describe('GET /api/monitoring/redis/health', () => {
    test('returns healthy status when Redis is connected', async () => {
      const response = await request(app)
        .get('/api/monitoring/redis/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'healthy',
        timestamp: expect.any(String),
        warnings: [],
        metrics: {
          hits: 100,
          misses: 20,
          hitRate: 0.83
        },
        memory: {
          used: 1000000,
          peak: 2000000,
          total: 8000000,
          fragmentation: 1.5
        },
        evictionPolicy: {
          maxMemory: 1000000,
          maxKeys: 1000000,
          strategy: 'allkeys-lru'
        }
      });
    });

    test('returns unhealthy status when Redis is not connected', async () => {
      const unhealthyStats: RedisStats = {
        ...mockStats,
        connected: false
      };
      mockRedisMonitor.getLatestStats.mockReturnValueOnce(unhealthyStats);

      const response = await request(app)
        .get('/api/monitoring/redis/health')
        .expect(200);

      expect(response.body.status).toBe('unhealthy');
    });

    test('returns warnings when metrics are concerning', async () => {
      const warningStats: RedisStats = {
        ...mockStats,
        memoryUsage: {
          used: 7000000,
          peak: 8000000,
          total: 8000000,
          fragmentation: 1.5
        },
        cacheMetrics: {
          hits: 40,
          misses: 60,
          hitRate: 0.4
        }
      };
      mockRedisMonitor.getLatestStats.mockReturnValueOnce(warningStats);

      const response = await request(app)
        .get('/api/monitoring/redis/health')
        .expect(200);

      expect(response.body.warnings).toContain('High memory usage');
      expect(response.body.warnings).toContain('Low cache hit rate');
    });

    test('returns 503 when no monitoring data is available', async () => {
      mockRedisMonitor.getLatestStats.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/monitoring/redis/health')
        .expect(503);

      expect(response.body).toEqual({
        status: 'unknown',
        message: 'No monitoring data available'
      });
    });

    test('handles errors gracefully', async () => {
      mockRedisMonitor.getLatestStats.mockImplementationOnce(() => {
        throw new Error('Redis error');
      });

      const response = await request(app)
        .get('/api/monitoring/redis/health')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to check Redis health'
      });
    });
  });
}); 