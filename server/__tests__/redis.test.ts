import { RedisService } from '../services/redis';
import { RedisMonitor } from '../services/redisMonitor';

// Mock the Redis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      get: jest.fn().mockResolvedValue('test-value'),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue(['key1', 'key2']),
      exists: jest.fn().mockResolvedValue(1),
      ping: jest.fn().mockResolvedValue('PONG'),
      info: jest.fn().mockResolvedValue('used_memory:1000000\r\nused_memory_peak:2000000\r\ntotal_system_memory:8000000\r\nmem_fragmentation_ratio:1.5'),
      config: jest.fn().mockImplementation((action, param) => {
        if (action === 'GET' && param === 'maxmemory') {
          return Promise.resolve(['maxmemory', '1000000']);
        }
        if (action === 'GET' && param === 'maxmemory-policy') {
          return Promise.resolve(['maxmemory-policy', 'allkeys-lru']);
        }
        return Promise.resolve([]);
      }),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn()
    };
  });
});

describe('RedisService', () => {
  let redisService: RedisService;

  beforeEach(() => {
    // Clear the singleton instance before each test
    (RedisService as any).instance = undefined;
    redisService = RedisService.getInstance();
  });

  test('getInstance returns the same instance', () => {
    const instance1 = RedisService.getInstance();
    const instance2 = RedisService.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('get returns the expected value', async () => {
    const value = await redisService.get('test-key');
    expect(value).toBe('test-value');
  });

  test('set stores the value', async () => {
    await redisService.set('test-key', 'test-value');
    // The mock implementation doesn't actually store values, so we can't verify
    // that the value was stored, but we can verify that the set method was called
    expect(redisService['client'].set).toHaveBeenCalledWith('test-key', 'test-value', 'EX', 3600);
  });

  test('delete removes the key', async () => {
    await redisService.delete('test-key');
    expect(redisService['client'].del).toHaveBeenCalledWith('test-key');
  });

  test('exists checks if the key exists', async () => {
    const exists = await redisService.exists('test-key');
    expect(exists).toBe(true);
    expect(redisService['client'].exists).toHaveBeenCalledWith('test-key');
  });

  test('clear flushes the database', async () => {
    await redisService.clear();
    expect(redisService['client'].flushall).toHaveBeenCalled();
  });

  test('healthCheck returns true when Redis is healthy', async () => {
    const isHealthy = await redisService.healthCheck();
    expect(isHealthy).toBe(true);
    expect(redisService['client'].ping).toHaveBeenCalled();
  });

  test('getMemoryUsage returns memory usage information', async () => {
    const memoryUsage = await redisService.getMemoryUsage();
    expect(memoryUsage).toEqual({
      used: 1000000,
      peak: 2000000,
      total: 8000000,
      fragmentation: 1.5
    });
  });

  test('getEvictionPolicy returns eviction policy information', async () => {
    const evictionPolicy = await redisService.getEvictionPolicy();
    expect(evictionPolicy).toEqual({
      maxMemory: 1000000,
      maxKeys: 1000000,
      strategy: 'allkeys-lru'
    });
  });

  test('disconnect closes the Redis connection', async () => {
    await redisService.disconnect();
    expect(redisService['client'].quit).toHaveBeenCalled();
  });
});

describe('RedisMonitor', () => {
  let redisMonitor: RedisMonitor;

  beforeEach(() => {
    // Clear the singleton instance before each test
    (RedisMonitor as any).instance = undefined;
    redisMonitor = RedisMonitor.getInstance();
  });

  test('getInstance returns the same instance', () => {
    const instance1 = RedisMonitor.getInstance();
    const instance2 = RedisMonitor.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('startMonitoring starts the monitoring interval', () => {
    jest.useFakeTimers();
    redisMonitor.startMonitoring(1000);
    expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
    jest.useRealTimers();
  });

  test('stopMonitoring stops the monitoring interval', () => {
    jest.useFakeTimers();
    redisMonitor.startMonitoring(1000);
    redisMonitor.stopMonitoring();
    expect(clearInterval).toHaveBeenCalled();
    jest.useRealTimers();
  });

  test('getStats returns the collected stats', () => {
    const stats = redisMonitor.getStats();
    expect(Array.isArray(stats)).toBe(true);
  });

  test('getLatestStats returns the most recent stats', () => {
    const latestStats = redisMonitor.getLatestStats();
    expect(latestStats).toBeNull(); // Initially there are no stats
  });

  test('getAverageHitRate returns the average hit rate', () => {
    const averageHitRate = redisMonitor.getAverageHitRate();
    expect(averageHitRate).toBe(0); // Initially there are no stats
  });

  test('getMemoryUsageTrend returns the memory usage trend', () => {
    const memoryTrend = redisMonitor.getMemoryUsageTrend();
    expect(memoryTrend).toEqual({ increasing: false, percentage: 0 }); // Initially there are no stats
  });
}); 