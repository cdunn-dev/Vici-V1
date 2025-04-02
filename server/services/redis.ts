import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { gzip, ungzip } from 'node-gzip';
import { CircuitBreaker } from './circuitBreaker';
import { MonitoringService } from './monitoring';

interface CacheMetrics {
  hits: number;
  misses: number;
  lastReset: Date;
}

interface MemoryUsage {
  used: number;
  peak: number;
  total: number;
  fragmentation: number;
}

interface EvictionPolicy {
  maxMemory: number;
  maxKeys: number;
  strategy: string;
}

export class RedisService {
  private static instance: RedisService;
  private client: Redis | null = null;
  private circuitBreaker: CircuitBreaker;
  private monitoringService: MonitoringService;
  private metrics: CacheMetrics = { hits: 0, misses: 0, lastReset: new Date() };
  private readonly DEFAULT_TTL = 3600; // 1 hour in seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly COMPRESSION_THRESHOLD = 1024; // 1KB
  private readonly CACHE_VERSION = '1.0.0';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectDelay: number = 1000; // 1 second

  private constructor() {
    this.circuitBreaker = CircuitBreaker.getInstance();
    this.monitoringService = MonitoringService.getInstance();
    this.connect();
    this.setupEvictionPolicy();
  }

  private async connect(): Promise<void> {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times: number) => {
          if (times > this.maxReconnectAttempts) {
            return null; // Stop retrying
          }
          return this.reconnectDelay * Math.pow(2, times - 1); // Exponential backoff
        }
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('Connected to Redis');
      });

      this.client.on('error', (error) => {
        this.isConnected = false;
        logger.error('Redis connection error:', error);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        logger.warn('Redis connection closed');
      });

      this.client.on('reconnecting', () => {
        this.reconnectAttempts++;
        logger.info(`Attempting to reconnect to Redis (attempt ${this.reconnectAttempts})`);
      });

    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  private async setupEvictionPolicy(): Promise<void> {
    try {
      const policy: EvictionPolicy = {
        maxMemory: 1024 * 1024 * 1024, // 1GB
        maxKeys: 10000,
        strategy: 'allkeys-lru'
      };

      await this.client!.config('SET', 'maxmemory', policy.maxMemory.toString());
      await this.client!.config('SET', 'maxmemory-policy', policy.strategy);
      await this.client!.config('SET', 'maxmemory-samples', '10');

      logger.info('Cache eviction policy configured:', policy);
    } catch (error) {
      logger.error('Error setting up eviction policy:', error);
    }
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async get(key: string): Promise<string | null> {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }

    try {
      const value = await this.circuitBreaker.execute(async () => {
        return await this.client!.get(key);
      });

      if (value === null) {
        this.metrics.misses++;
        this.monitoringService.recordCacheOperation('get', false);
        return null;
      }

      this.metrics.hits++;
      this.monitoringService.recordCacheOperation('get', true);
      return value;
    } catch (error) {
      this.metrics.misses++;
      this.monitoringService.recordCacheOperation('get', false);
      throw error;
    }
  }

  public async set(key: string, value: string, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }

    try {
      const serializedValue = JSON.stringify(value);
      const compressed = await this.compressIfNeeded(serializedValue);
      await this.circuitBreaker.execute(async () => {
        await this.client!.set(key, compressed, 'EX', ttl);
      });
      
      this.monitoringService.recordCacheOperation('set', true);
    } catch (error) {
      this.monitoringService.recordCacheOperation('set', false);
      throw error;
    }
  }

  private async compressIfNeeded(data: string): Promise<string> {
    if (data.length > this.COMPRESSION_THRESHOLD) {
      const compressed = await gzip(data);
      return compressed.toString('base64');
    }
    return data;
  }

  private async decompressIfNeeded(data: string): Promise<string> {
    try {
      // Check if the data is base64 encoded (compressed)
      if (/^[A-Za-z0-9+/=]+$/.test(data)) {
        const buffer = Buffer.from(data, 'base64');
        return (await ungzip(buffer)).toString();
      }
      return data;
    } catch (error) {
      // If decompression fails, return the original data
      return data;
    }
  }

  public async delete(key: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }

    try {
      await this.circuitBreaker.execute(async () => {
        await this.client!.del(key);
      });
      
      this.monitoringService.recordCacheOperation('delete', true);
    } catch (error) {
      this.monitoringService.recordCacheOperation('delete', false);
      throw error;
    }
  }

  public async deletePattern(pattern: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }

    try {
      const keys = await this.circuitBreaker.execute(async () => {
        return await this.client!.keys(pattern);
      });
      if (keys.length > 0) {
        await this.circuitBreaker.execute(async () => {
          await this.client!.del(...keys);
        });
      }
    } catch (error) {
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.client!.exists(key);
      });
      
      return result === 1;
    } catch (error) {
      throw error;
    }
  }

  public async clear(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }

    try {
      await this.circuitBreaker.execute(async () => {
        await this.client!.flushall();
      });
    } catch (error) {
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.client!.ping();
      });
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  public async getMemoryUsage(): Promise<{
    used: number;
    peak: number;
    total: number;
    fragmentation: number;
  } | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const info = await this.circuitBreaker.execute(async () => {
        return await this.client!.info('memory');
      });
      const lines = info.split('\n');
      const memoryInfo: any = {};

      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          memoryInfo[key.trim()] = parseInt(value.trim());
        }
      });

      return {
        used: memoryInfo['used_memory'] || 0,
        peak: memoryInfo['used_memory_peak'] || 0,
        total: memoryInfo['total_system_memory'] || 0,
        fragmentation: memoryInfo['mem_fragmentation_ratio'] || 0
      };
    } catch (error) {
      logger.error('Error getting Redis memory usage:', error);
      return null;
    }
  }

  public getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  public resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      lastReset: new Date()
    };
  }

  public getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  public async getEvictionPolicy(): Promise<EvictionPolicy | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const maxMemoryConfig = await this.client!.config('GET', 'maxmemory');
      const strategyConfig = await this.client!.config('GET', 'maxmemory-policy');

      // Redis config returns an array of [key, value] pairs
      const maxMemoryValue = (maxMemoryConfig as [string, string])[1];
      const strategyValue = (strategyConfig as [string, string])[1];

      return {
        maxMemory: parseInt(maxMemoryValue),
        maxKeys: 10000, // Default value
        strategy: strategyValue as EvictionPolicy['strategy']
      };
    } catch (error) {
      logger.error('Error getting eviction policy:', error);
      return null;
    }
  }

  public async updateEvictionPolicy(policy: Partial<EvictionPolicy>): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis is not connected');
    }

    try {
      if (policy.maxMemory !== undefined) {
        await this.client!.config('SET', 'maxmemory', policy.maxMemory.toString());
      }
      if (policy.strategy !== undefined) {
        await this.client!.config('SET', 'maxmemory-policy', policy.strategy);
      }
      logger.info('Cache eviction policy updated:', policy);
    } catch (error) {
      logger.error('Error updating eviction policy:', error);
    }
  }

  public async getStats(): Promise<{
    connected: boolean;
    memory: {
      used: number;
      peak: number;
      total: number;
    };
    keys: number;
    hits: number;
    misses: number;
    circuitState: string;
  }> {
    if (!this.isConnected) {
      return {
        connected: false,
        memory: { used: 0, peak: 0, total: 0 },
        keys: 0,
        hits: this.monitoringService.getCacheHits(),
        misses: this.monitoringService.getCacheMisses(),
        circuitState: this.circuitBreaker.getState()
      };
    }

    try {
      const info = await this.circuitBreaker.execute(async () => {
        return await this.client!.info('memory');
      });

      const memoryInfo = this.parseMemoryInfo(info);
      const keys = await this.circuitBreaker.execute(async () => {
        return await this.client!.dbsize();
      });

      return {
        connected: true,
        memory: memoryInfo,
        keys,
        hits: this.monitoringService.getCacheHits(),
        misses: this.monitoringService.getCacheMisses(),
        circuitState: this.circuitBreaker.getState()
      };
    } catch (error) {
      logger.error('Failed to get Redis stats:', error);
      throw error;
    }
  }

  private parseMemoryInfo(info: string): { used: number; peak: number; total: number } {
    const lines = info.split('\n');
    const memory: { [key: string]: number } = {};

    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        memory[key.trim()] = parseInt(value.trim());
      }
    });

    return {
      used: memory['used_memory'] || 0,
      peak: memory['used_memory_peak'] || 0,
      total: memory['total_system_memory'] || 0
    };
  }
} 
} 