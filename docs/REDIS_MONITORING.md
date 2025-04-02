# Redis Monitoring

This document describes the Redis monitoring setup in the Vici application.

## Overview

The Redis monitoring system consists of several components:

1. **Redis Service**: Handles Redis connections and operations
2. **Redis Monitor**: Collects and tracks Redis metrics
3. **Monitoring Endpoints**: Exposes Redis metrics via API
4. **Initialization Script**: Sets up Redis and starts monitoring

## Features

- Real-time monitoring of Redis health
- Memory usage tracking
- Cache hit/miss metrics
- Eviction policy monitoring
- Automatic warning system for:
  - High memory usage (>80%)
  - Low cache hit rate (<50%)
  - Connection issues

## API Endpoints

### GET /api/monitoring/redis/stats

Returns detailed Redis statistics including:
- Current metrics
- Historical data
- Average hit rate
- Memory usage trends

### GET /api/monitoring/redis/health

Returns Redis health status including:
- Connection status
- Active warnings
- Current metrics
- Memory usage
- Eviction policy

## Initialization

To initialize Redis and start monitoring:

```bash
npm run init-redis
```

This will:
1. Check Redis connection
2. Verify memory usage
3. Check eviction policy
4. Start the monitoring service

## Configuration

Redis connection settings can be configured via environment variables:

- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_PASSWORD`: Redis password (optional)

## Monitoring Metrics

The system tracks the following metrics:

### Cache Performance
- Hit count
- Miss count
- Hit rate
- Average hit rate

### Memory Usage
- Used memory
- Peak memory
- Total memory
- Memory fragmentation

### Eviction Policy
- Maximum memory
- Maximum keys
- Eviction strategy

## Alerts

The system automatically logs warnings for:
- Memory usage above 80%
- Cache hit rate below 50%
- Connection failures

## Best Practices

1. **Regular Monitoring**: Check the health endpoint regularly
2. **Memory Management**: Monitor memory usage trends
3. **Cache Optimization**: Watch hit rates to optimize caching strategy
4. **Error Handling**: Review error logs for connection issues
5. **Performance Tuning**: Adjust eviction policies based on usage patterns 