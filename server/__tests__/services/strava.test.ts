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
      expect(params.get('client_id')).toBe(process.env.STRAVA_CLIENT_ID);
      expect(params.get('redirect_uri')).toContain('/api/auth/strava/callback');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('read,activity:read_all,profile:read_all');
      expect(params.get('state')).toBe('test-state');
      expect(params.get('approval_prompt')).toBe('force');
    });

    it('should properly encode special characters in the state parameter', () => {
      const specialState = 'test/state with spaces & special chars';
      const url = new URL(getStravaAuthUrl(specialState));

      // The encoded state should not contain raw special characters
      const encodedState = url.searchParams.get('state');
      expect(encodedState).not.toContain(' ');
      expect(encodedState).not.toContain('&');
      expect(encodedState).not.toContain('/');

      // But when decoded should match original
      expect(decodeURIComponent(encodedState!)).toBe(specialState);
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

      const error = (() => {
        try {
          getStravaAuthUrl('test-state');
        } catch (e) {
          return e as StravaError;
        }
      })();

      expect(error.code).toBe('CONFIG_ERROR');
      expect(error.message).toBe('Strava client ID is not configured');

      process.env.STRAVA_CLIENT_ID = originalClientId;
    });

    it('should use correct Replit domain in redirect URI', () => {
      const url = new URL(getStravaAuthUrl('test-state'));
      const redirectUri = url.searchParams.get('redirect_uri');

      expect(redirectUri).toContain('b69d20e7-bda1-4cf0-b59c-eedcc77485c7-00-3tg7kax6mu3y4.riker.replit.dev');
      expect(redirectUri).toContain('/api/auth/strava/callback');
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
        statusText: 'Bad Request'
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
        statusText: 'Unauthorized'
      });

      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow(StravaError);
    });
  });

  describe('syncStravaActivities', () => {
    const mockDetailedActivity = {
      id: 1234567890,
      name: "Morning Run",
      description: "Great run today!",
      type: "Run",
      start_date: "2025-03-15T08:00:00Z",
      distance: 5000,
      moving_time: 1800,
      elapsed_time: 1800,
      total_elevation_gain: 50,
      average_speed: 2.78,
      max_speed: 3.5,
      average_heartrate: 150,
      max_heartrate: 175,
      start_latitude: 40.7128,
      start_longitude: -74.0060,
      device_name: "Garmin Forerunner",
      average_cadence: 180,
      average_temp: 20,
      suffer_score: 80,
      perceived_exertion: 7,
      elevation_high: 100,
      elevation_low: 0,
      map: {
        summary_polyline: "test_polyline",
        resource_state: 2
      },
      laps: [
        {
          lap_index: 1,
          split_index: 1,
          distance: 1000,
          elapsed_time: 360,
          moving_time: 360,
          start_date: "2025-03-15T08:05:00Z",
          average_speed: 2.8,
          max_speed: 3.2,
          average_heartrate: 155,
          max_heartrate: 165
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
      ]
    };

    it('should fetch and store detailed activity data successfully', async () => {
      // Mock the initial activities list response
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ id: 1234567890, type: "Run" }])
        })
        // Mock the detailed activity fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDetailedActivity)
        });

      await syncStravaActivities(userId, 'test_access_token');

      // Verify db insert was called with processed activity data
      const insertCall = vi.mocked(db.insert).mock.calls[0];
      expect(insertCall[0]).toBe(stravaActivities);

      const insertedActivity = insertCall[1].values[0];
      expect(insertedActivity).toMatchObject({
        stravaId: '1234567890',
        name: 'Morning Run',
        description: 'Great run today!',
        type: 'Run',
        laps: expect.any(Array),
        splitMetrics: expect.any(Array)
      });
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

    it('should batch process multiple activities', async () => {
      const activities = [
        { id: 1, type: "Run" },
        { id: 2, type: "Run" },
        { id: 3, type: "Run" }
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(activities)
        })
        // Mock detailed activity fetches
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ ...mockDetailedActivity })
        });

      await syncStravaActivities(userId, 'test_access_token');

      const insertCall = vi.mocked(db.insert).mock.calls[0];
      expect(insertCall[1].values).toHaveLength(3);
    });

    it('should continue processing on individual activity failures', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            { id: 1, type: "Run" },
            { id: 2, type: "Run" }
          ])
        })
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDetailedActivity)
        });

      await syncStravaActivities(userId, 'test_access_token');

      const insertCall = vi.mocked(db.insert).mock.calls[0];
      expect(insertCall[1].values).toHaveLength(1);
    });
  });

  describe('analyzeRunningExperience', () => {
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

    it('should analyze running experience correctly', async () => {
      const analysis = await service.analyzeRunningExperience();

      expect(analysis).toEqual({
        level: 'beginner', // Based on weekly mileage
        weeklyMileage: expect.any(Number),
        preferredRunDays: expect.arrayContaining(['wednesday', 'thursday', 'friday']),
        commonWorkoutTypes: expect.arrayContaining(['easy', 'long run', 'tempo'])
      });
    });

    it('should determine correct experience level based on mileage and workouts', async () => {
      // Mock higher volume runner
      const highVolumeActivities = mockActivities.map(a => ({
        ...a,
        distance: a.distance * 4 // 4x the distance
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(highVolumeActivities)
      });

      const analysis = await service.analyzeRunningExperience();
      expect(analysis.level).toBe('intermediate');
    });

    it('should handle empty activity list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const analysis = await service.analyzeRunningExperience();
      expect(analysis).toEqual({
        level: 'beginner',
        weeklyMileage: 0,
        preferredRunDays: [],
        commonWorkoutTypes: []
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

describe('Activity Transformation', () => {
  it('should transform activity data correctly', async () => {
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

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockActivity])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivity)
      });

    await syncStravaActivities(1, 'test_access_token');

    const insertCall = vi.mocked(db.insert).mock.calls[0];
    const insertedActivity = insertCall[1].values[0];

    // Verify transformed data structure
    expect(insertedActivity).toMatchObject({
      userId: 1,
      stravaId: '1234567890',
      name: 'Morning Run',
      type: 'Run',
      distance: 5000,
      movingTime: 1800,
      elapsedTime: 1800,
      totalElevationGain: 100,
      hasHeartrate: true,
      averageHeartrate: 150,
      maxHeartrate: 180,
      map: {
        summaryPolyline: 'test_polyline',
        resourceState: 2
      }
    });

    // Verify array fields are properly formatted
    expect(Array.isArray(insertedActivity.laps)).toBe(true);
    expect(Array.isArray(insertedActivity.splitMetrics)).toBe(true);
    expect(Array.isArray(insertedActivity.heartrateZones)).toBe(true);
    expect(Array.isArray(insertedActivity.paceZones)).toBe(true);

    // Verify nested arrays have correct structure
    expect(insertedActivity.laps[0]).toMatchObject({
      lapIndex: 1,
      distance: 1000,
      elapsedTime: 360,
      averageHeartrate: 155
    });

    expect(insertedActivity.splitMetrics[0]).toMatchObject({
      distance: 1000,
      elapsedTime: 360,
      averageHeartrate: 155
    });
  });

  it('should handle missing optional fields', async () => {
    const mockActivityWithoutOptionals = {
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
        json: () => Promise.resolve([mockActivityWithoutOptionals])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivityWithoutOptionals)
      });

    await syncStravaActivities(1, 'test_access_token');

    const insertCall = vi.mocked(db.insert).mock.calls[0];
    const insertedActivity = insertCall[1].values[0];

    // Verify optional fields have default values
    expect(insertedActivity.hasHeartrate).toBe(false);
    expect(insertedActivity.averageHeartrate).toBeNull();
    expect(insertedActivity.maxHeartrate).toBeNull();
    expect(insertedActivity.laps).toEqual([]);
    expect(insertedActivity.splitMetrics).toEqual([]);
    expect(insertedActivity.heartrateZones).toEqual([]);
    expect(insertedActivity.paceZones).toEqual([]);
    expect(insertedActivity.map).toBeNull();
  });

  it('should validate required numeric fields', async () => {
    const mockActivityWithMissingFields = {
      id: 1234567890,
      name: "Invalid Run",
      type: "Run",
      start_date: "2025-03-15T08:00:00Z"
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockActivityWithMissingFields])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivityWithMissingFields)
      });

    await syncStravaActivities(1, 'test_access_token');

    const insertCall = vi.mocked(db.insert).mock.calls[0];
    const insertedActivity = insertCall[1].values[0];

    // Verify numeric fields have default values
    expect(insertedActivity.distance).toBe(0);
    expect(insertedActivity.movingTime).toBe(0);
    expect(insertedActivity.elapsedTime).toBe(0);
    expect(insertedActivity.totalElevationGain).toBe(0);
    expect(insertedActivity.averageSpeed).toBe(0);
    expect(insertedActivity.maxSpeed).toBe(0);
  });
});