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

// Set up test environment
const TEST_STRAVA_CLIENT_ID = 'test_client_id';
const TEST_STRAVA_CLIENT_SECRET = 'test_client_secret';
const userId = 1;

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn().mockResolvedValue({
      id: userId,
      stravaTokens: {
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: Date.now() / 1000 + 3600
      }
    }),
    updateUser: vi.fn().mockResolvedValue(undefined)
  }
}));

// Mock database
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue([{
        id: 1,
        stravaId: '1234567890',
        name: 'Test Activity',
        type: 'Run',
        distance: 5000,
        startDate: new Date(),
        movingTime: 1800,
        elapsedTime: 1800,
        totalElevationGain: 100,
        averageSpeed: 2.78,
        maxSpeed: 3.5,
        hasHeartrate: true,
        averageHeartrate: 150,
        maxHeartrate: 180,
        map: null,
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
            limit: vi.fn().mockResolvedValue([])
          })
        })
      })
    })
  }
}));

describe('Strava Service', () => {
  let service: StravaService;

  beforeEach(() => {
    // Reset environment variables
    process.env.STRAVA_CLIENT_ID = TEST_STRAVA_CLIENT_ID;
    process.env.STRAVA_CLIENT_SECRET = TEST_STRAVA_CLIENT_SECRET;

    // Clear all mocks
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();
    service = new StravaService(userId);
  });

  describe('Authentication', () => {
    it('should generate correct auth URL', () => {
      const url = new URL(getStravaAuthUrl('test-state'));

      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');

      const params = url.searchParams;
      expect(params.get('client_id')).toBe(TEST_STRAVA_CLIENT_ID);
      expect(params.get('redirect_uri')).toContain('/api/auth/strava/callback');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('read,activity:read_all,profile:read_all');
      expect(params.get('state')).toBe('test-state');
      expect(params.get('approval_prompt')).toBe('auto');
    });

    it('should throw error if client ID is missing', () => {
      process.env.STRAVA_CLIENT_ID = '';
      expect(() => getStravaAuthUrl('test-state')).toThrow(StravaError);
    });
  });

  describe('Token Management', () => {
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

    it('should refresh tokens automatically when expired', async () => {
      const expiredTokens = {
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: Date.now() / 1000 - 3600 // Expired 1 hour ago
      };

      const newTokens = {
        access_token: 'new_token',
        refresh_token: 'new_refresh_token',
        expires_at: Date.now() / 1000 + 3600
      };

      vi.mocked(storage.getUser).mockResolvedValueOnce({
        id: userId,
        stravaTokens: expiredTokens
      });

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

      expect(storage.updateUser).toHaveBeenCalledWith(
        userId,
        { stravaTokens: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at
        }}
      );
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
      max_heartrate: 180
    };

    it('should transform and store activities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockActivity])
      });

      await syncStravaActivities(userId, 'test_access_token');

      expect(db.insert).toHaveBeenCalled();
      const insertCall = vi.mocked(db.insert).mock.calls[0];
      expect(insertCall[1].values[0]).toMatchObject({
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
        maxHeartrate: mockActivity.max_heartrate
      });
    });

    it('should handle rate limiting', async () => {
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

    it('should handle database errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockActivity])
      });

      vi.mocked(db.insert).mockRejectedValueOnce(new Error('Database error'));

      await expect(syncStravaActivities(userId, 'test_access_token'))
        .rejects
        .toThrow('Database error');
    });
  });
});