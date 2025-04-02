import { CacheWarmer } from '../services/cacheWarmer';
import { RedisService } from '../services/redis';
import { storage } from '../storage';

// Mock dependencies
jest.mock('../services/redis');
jest.mock('../storage');
jest.mock('../utils/logger');

describe('CacheWarmer', () => {
  let cacheWarmer: CacheWarmer;
  let mockRedis: jest.Mocked<RedisService>;
  let mockStorage: jest.Mocked<typeof storage>;

  beforeEach(() => {
    // Clear singleton instance
    (CacheWarmer as any).instance = undefined;

    // Setup mocks
    mockRedis = {
      getInstance: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(1),
      exists: jest.fn().mockResolvedValue(true)
    } as any;

    mockStorage = {
      getAllUsers: jest.fn().mockResolvedValue([
        { id: '1', email: 'user1@example.com' },
        { id: '2', email: 'user2@example.com' }
      ]),
      getAllTrainingPlans: jest.fn().mockResolvedValue([
        { id: '1', userId: '1', title: 'Plan 1' },
        { id: '2', userId: '2', title: 'Plan 2' }
      ]),
      getTrainingPlans: jest.fn().mockResolvedValue([
        { id: '1', userId: '1', title: 'Plan 1' }
      ]),
      getAllWorkoutNotes: jest.fn().mockResolvedValue([
        { id: '1', userId: '1', content: 'Note 1' },
        { id: '2', userId: '2', content: 'Note 2' }
      ]),
      getWorkoutNotes: jest.fn().mockResolvedValue([
        { id: '1', userId: '1', content: 'Note 1' }
      ])
    } as any;

    // Replace the real implementations with mocks
    (RedisService as any).getInstance = jest.fn().mockReturnValue(mockRedis);
    (storage as any) = mockStorage;

    cacheWarmer = CacheWarmer.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getInstance returns the same instance', () => {
    const instance1 = CacheWarmer.getInstance();
    const instance2 = CacheWarmer.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('warmCache warms all caches', async () => {
    await cacheWarmer.warmCache();

    // Check if all warm methods were called
    expect(mockStorage.getAllUsers).toHaveBeenCalled();
    expect(mockStorage.getAllTrainingPlans).toHaveBeenCalled();
    expect(mockStorage.getAllWorkoutNotes).toHaveBeenCalled();

    // Check if Redis set was called for users
    expect(mockRedis.set).toHaveBeenCalledWith(
      'user:email:user1@example.com',
      JSON.stringify({ id: '1', email: 'user1@example.com' })
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      'user:email:user2@example.com',
      JSON.stringify({ id: '2', email: 'user2@example.com' })
    );

    // Check if Redis set was called for training plans
    expect(mockRedis.set).toHaveBeenCalledWith(
      'trainingPlan:1',
      JSON.stringify({ id: '1', userId: '1', title: 'Plan 1' })
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      'trainingPlan:2',
      JSON.stringify({ id: '2', userId: '2', title: 'Plan 2' })
    );

    // Check if Redis set was called for workout notes
    expect(mockRedis.set).toHaveBeenCalledWith(
      'workoutNote:1',
      JSON.stringify({ id: '1', userId: '1', content: 'Note 1' })
    );
    expect(mockRedis.set).toHaveBeenCalledWith(
      'workoutNote:2',
      JSON.stringify({ id: '2', userId: '2', content: 'Note 2' })
    );
  });

  test('warmCache handles errors gracefully', async () => {
    // Simulate an error in getAllUsers
    mockStorage.getAllUsers.mockRejectedValueOnce(new Error('Database error'));

    await cacheWarmer.warmCache();

    // Other methods should still be called
    expect(mockStorage.getAllTrainingPlans).toHaveBeenCalled();
    expect(mockStorage.getAllWorkoutNotes).toHaveBeenCalled();
  });

  test('warmCache prevents concurrent warming', async () => {
    // Start first warm
    const firstWarm = cacheWarmer.warmCache();
    
    // Try to start second warm
    const secondWarm = cacheWarmer.warmCache();

    await Promise.all([firstWarm, secondWarm]);

    // getAllUsers should only be called once
    expect(mockStorage.getAllUsers).toHaveBeenCalledTimes(1);
  });

  test('warmCache sets correct TTL for cached items', async () => {
    await cacheWarmer.warmCache();

    // Check if Redis set was called with TTL
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'EX',
      3600 // Default TTL
    );
  });
}); 