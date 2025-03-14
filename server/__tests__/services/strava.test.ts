import { vi, describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db';
import { 
  StravaService,
  exchangeStravaCode, 
  refreshStravaToken,
  syncStravaActivities,
  getStravaAuthUrl,
  StravaError 
} from '../../services/strava';
import { storage } from '../../storage';
import { stravaActivities } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Set up test environment
const TEST_STRAVA_CLIENT_ID = 'test_client_id';
const TEST_STRAVA_CLIENT_SECRET = 'test_client_secret';

beforeEach(() => {
  // Reset environment variables
  process.env.STRAVA_CLIENT_ID = TEST_STRAVA_CLIENT_ID;
  process.env.STRAVA_CLIENT_SECRET = TEST_STRAVA_CLIENT_SECRET;
});

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    updateUser: vi.fn()
  }
}));

// Mock database with type-safe mocks
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ 
      values: vi.fn().mockReturnValue([{
        id: 1,
        stravaId: '1234567890',
        userId: 1,
        name: 'Test Activity',
        type: 'Run',
        distance: 5000,
        movingTime: 1800,
        elapsedTime: 1800,
        totalElevationGain: 100,
        startDate: new Date(),
        laps: [],
        splitMetrics: [],
        heartrateZones: [],
        paceZones: []
      }])
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue([])
          })
        })
      })
    })
  }
}));

// Mock fetch with type-safe responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Strava Service', () => {
  const userId = 1;
  let service: StravaService;

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();
    service = new StravaService(userId);
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authorization URL with all required parameters', () => {
      const url = new URL(getStravaAuthUrl('test-state'));

      // Check URL structure
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');

      // Check all required parameters
      const params = url.searchParams;
      expect(params.get('client_id')).toBe(TEST_STRAVA_CLIENT_ID);
      expect(params.get('redirect_uri')).toContain('/api/auth/strava/callback');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('read,activity:read_all,profile:read_all');
      expect(params.get('state')).toBe('test-state');
      expect(params.get('approval_prompt')).toBe('auto');
    });

    it('should handle empty state parameter', () => {
      const url = new URL(getStravaAuthUrl());
      expect(url.searchParams.get('state')).toBe('');
    });

    it('should throw CONFIG_ERROR if client ID is not configured', () => {
      const originalClientId = process.env.STRAVA_CLIENT_ID;
      process.env.STRAVA_CLIENT_ID = '';

      expect(() => getStravaAuthUrl('test-state'))
        .toThrow(StravaError);

      process.env.STRAVA_CLIENT_ID = originalClientId;
    });
  });

  describe('exchangeStravaCode', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: 1234567890
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await exchangeStravaCode('test_code');
      expect(result).toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresAt: mockResponse.expires_at
      });
    });

    it('should throw AUTH_ERROR with proper message on exchange failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"message":"Bad Request"}')
      });

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow(StravaError);
    });

    it('should throw CONFIG_ERROR when credentials are missing', async () => {
      const originalClientId = process.env.STRAVA_CLIENT_ID;
      const originalClientSecret = process.env.STRAVA_CLIENT_SECRET;
      process.env.STRAVA_CLIENT_ID = '';
      process.env.STRAVA_CLIENT_SECRET = '';

      await expect(exchangeStravaCode('test_code'))
        .rejects
        .toThrow(StravaError);

      process.env.STRAVA_CLIENT_ID = originalClientId;
      process.env.STRAVA_CLIENT_SECRET = originalClientSecret;
    });

    it('should handle network errors appropriately', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(exchangeStravaCode('test_code'))
        .rejects
        .toThrow(StravaError);
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(exchangeStravaCode('test_code'))
        .rejects
        .toThrow(StravaError);
    });
  });

  describe('refreshStravaToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: 1234567890
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await refreshStravaToken('test_refresh_token');
      expect(result).toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresAt: mockResponse.expires_at
      });
    });

    it('should throw AUTH_ERROR with proper message on refresh failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('{"message":"Unauthorized"}')
      });

      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow(StravaError);
    });
  });

  describe('Activity Sync', () => {
    const mockActivity = {
      id: 1234567890,
      name: "Morning Run",
      type: "Run",
      start_date: "2025-03-15T08:00:00Z",
      distance: 5000,
      moving_time: 1800,
      elapsed_time: 1800,
      total_elevation_gain: 100,
      average_speed: 2.78,
      max_speed: 3.5,
      has_heartrate: true,
      average_heartrate: 150,
      max_heartrate: 180,
      laps: [
        {
          lap_index: 1,
          split_index: 1,
          distance: 1000,
          elapsed_time: 360,
          moving_time: 360,
          start_date: "2025-03-15T08:05:00Z",
          average_speed: 2.8,
          average_heartrate: 155
        }
      ],
      splits_metric: [
        {
          distance: 1000,
          elapsed_time: 360,
          elevation_difference: 10,
          moving_time: 360,
          split: 1,
          average_speed: 2.8,
          average_heartrate: 155
        }
      ],
      map: {
        summary_polyline: "test_polyline",
        resource_state: 2
      }
    };

    it('should correctly transform and store activity data', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockActivity])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivity)
        });

      await syncStravaActivities(userId, 'test_access_token');

      const insertCall = vi.mocked(db.insert).mock.calls[0];
      expect(insertCall[0]).toBe(stravaActivities);

      const insertedActivity = insertCall[1].values[0];
      expect(insertedActivity).toMatchObject({
        userId,
        stravaId: mockActivity.id.toString(),
        name: mockActivity.name,
        type: mockActivity.type,
        distance: mockActivity.distance,
        movingTime: mockActivity.moving_time,
        elapsedTime: mockActivity.elapsed_time,
        totalElevationGain: mockActivity.total_elevation_gain,
        hasHeartrate: mockActivity.has_heartrate,
        averageHeartrate: mockActivity.average_heartrate,
        maxHeartrate: mockActivity.max_heartrate,
        map: {
          summaryPolyline: mockActivity.map.summary_polyline,
          resourceState: mockActivity.map.resource_state
        }
      });

      // Verify array fields
      expect(Array.isArray(insertedActivity.laps)).toBe(true);
      expect(Array.isArray(insertedActivity.splitMetrics)).toBe(true);
      expect(Array.isArray(insertedActivity.heartrateZones)).toBe(true);
      expect(Array.isArray(insertedActivity.paceZones)).toBe(true);

      // Verify nested structures
      expect(insertedActivity.laps[0]).toMatchObject({
        lapIndex: mockActivity.laps[0].lap_index,
        distance: mockActivity.laps[0].distance,
        averageHeartrate: mockActivity.laps[0].average_heartrate
      });

      expect(insertedActivity.splitMetrics[0]).toMatchObject({
        distance: mockActivity.splits_metric[0].distance,
        elapsedTime: mockActivity.splits_metric[0].elapsed_time,
        averageHeartrate: mockActivity.splits_metric[0].average_heartrate
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      const activityWithoutOptionals = {
        id: 1234567890,
        name: "Basic Run",
        type: "Run",
        start_date: "2025-03-15T08:00:00Z",
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        total_elevation_gain: 100,
        average_speed: 2.78,
        max_speed: 3.5,
        has_heartrate: false
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([activityWithoutOptionals])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(activityWithoutOptionals)
        });

      await syncStravaActivities(userId, 'test_access_token');

      const insertCall = vi.mocked(db.insert).mock.calls[0];
      const insertedActivity = insertCall[1].values[0];

      expect(insertedActivity.hasHeartrate).toBe(false);
      expect(insertedActivity.averageHeartrate).toBeNull();
      expect(insertedActivity.maxHeartrate).toBeNull();
      expect(insertedActivity.laps).toEqual([]);
      expect(insertedActivity.splitMetrics).toEqual([]);
      expect(insertedActivity.heartrateZones).toEqual([]);
      expect(insertedActivity.paceZones).toEqual([]);
      expect(insertedActivity.map).toBeNull();
    });

    it('should handle rate limiting with retries', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          headers: new Headers({ 'Retry-After': '1' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        });

      await syncStravaActivities(userId, 'test_access_token');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      vi.mocked(db.insert).mockRejectedValueOnce(dbError);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([mockActivity])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivity)
        });

      await expect(syncStravaActivities(userId, 'test_access_token'))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('analyzeRunningProfile', () => {
    const mockActivities = [
      {
        type: 'Run',
        distance: 10000, // 10km
        start_date: '2025-03-13T08:00:00Z',
        name: 'Morning Easy Run'
      },
      {
        type: 'Run',
        distance: 15000,
        start_date: '2025-03-14T08:00:00Z',
        name: 'Long Run'
      },
      {
        type: 'Run',
        distance: 8000,
        start_date: '2025-03-15T08:00:00Z',
        name: 'Tempo Run'
      }
    ];

    beforeEach(() => {
      vi.mocked(storage.getUser).mockResolvedValue({
        id: userId,
        stravaTokens: {
          accessToken: 'valid_token',
          refreshToken: 'refresh_token',
          expiresAt: Date.now() / 1000 + 3600
        }
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities)
      });
    });

    it('should determine running profile correctly', async () => {
      const profile = await service.analyzeRunningProfile(userId);

      expect(profile).toEqual({
        weeklyMileage: expect.any(Number),
        preferredRunDays: expect.arrayContaining(['wednesday', 'thursday', 'friday']),
        fitnessLevel: expect.stringMatching(/beginner|intermediate|advanced/),
        commonWorkoutTypes: expect.arrayContaining(['easy', 'long run', 'tempo'])
      });
    });
  });

  describe('token refresh', () => {
    it('should refresh expired token automatically', async () => {
      const expiredTokens = {
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: Date.now() / 1000 - 3600 // Expired 1 hour ago
      };

      const newTokens = {
        accessToken: 'new_token',
        refreshToken: 'new_refresh_token',
        expiresAt: Date.now() / 1000 + 3600
      };

      vi.mocked(storage.getUser).mockResolvedValueOnce({
        id: userId,
        stravaTokens: expiredTokens
      } as any);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newTokens)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({})
        });

      await service.getAthleteProfile();

      expect(vi.mocked(storage.updateUser)).toHaveBeenCalledWith(
        userId,
        { stravaTokens: newTokens }
      );
    });

    it('should handle token refresh failures', async () => {
      vi.mocked(storage.getUser).mockResolvedValue({
        id: userId,
        stravaTokens: {
          accessToken: 'invalid_token',
          refreshToken: 'invalid_refresh',
          expiresAt: Date.now() / 1000 - 3600
        }
      } as any);

      mockFetch.mockRejectedValueOnce(new Error('Token refresh failed'));

      await expect(service.getAthleteProfile())
        .rejects
        .toThrow(StravaError);
    });
  });

  describe('automatic sync', () => {
    let service: StravaService;

    beforeEach(() => {
      vi.useFakeTimers();
      service = new StravaService(userId);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start automatic sync on initialization', () => {
      vi.mocked(storage.getUser).mockResolvedValue({
        id: userId,
        stravaTokens: {
          accessToken: 'test_token',
          refreshToken: 'refresh_token',
          expiresAt: Date.now() / 1000 + 3600
        }
      } as any);

      vi.advanceTimersByTime(15 * 60 * 1000); // 15 minutes
      expect(storage.getUser).toHaveBeenCalled();
    });

    it('should cleanup sync interval on stopAutoSync', async () => {
      await service.stopAutoSync();
      vi.advanceTimersByTime(15 * 60 * 1000);
      expect(storage.getUser).not.toHaveBeenCalled();
    });
  });
});