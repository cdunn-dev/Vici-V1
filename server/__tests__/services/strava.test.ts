// Set up test environment variables first
const TEST_STRAVA_CLIENT_ID = 'test_client_id';
const TEST_STRAVA_CLIENT_SECRET = 'test_client_secret';
const TEST_USER_ID = 1;

// Mock modules before any imports
vi.mock('@shared/schema', () => ({
  stravaActivities: {
    name: 'strava_activities',
    userId: 'number',
    stravaId: 'text',
    type: 'text'
  }
}));

vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    updateUser: vi.fn()
  }
}));

vi.mock('../../db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([{
        id: 1,
        stravaId: '1234567890',
        name: 'Test Activity',
        type: 'Run',
        distance: 5000,
        movingTime: 1800,
        elapsedTime: 1800,
        totalElevationGain: 100,
        startDate: new Date(),
        hasHeartrate: true,
        averageHeartrate: 150,
        maxHeartrate: 180,
        laps: [],
        splitMetrics: [],
        heartrateZones: [],
        paceZones: []
      }]))
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }))
    }))
  }
}));

// Mock fetch
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

// Now import everything after mocks
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db';
import { storage } from '../../storage';
import fetch from 'node-fetch';
import { 
  StravaService,
  exchangeStravaCode, 
  refreshStravaToken,
  syncStravaActivities,
  getStravaAuthUrl,
  StravaError 
} from '../../services/strava';

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

    // Reset mock implementations
    vi.mocked(storage.getUser).mockResolvedValue({
      id: TEST_USER_ID,
      stravaTokens: {
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: Date.now() / 1000 + 3600
      }
    });

    vi.mocked(storage.updateUser).mockResolvedValue(undefined);
    vi.mocked(fetch).mockImplementation(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve("")
      } as Response)
    );

    service = new StravaService(TEST_USER_ID);
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

      vi.mocked(fetch).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        } as Response)
      );

      const result = await exchangeStravaCode('test_code');
      expect(result).toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresAt: mockResponse.expires_at
      });
    });

    it('should handle token exchange failures', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          statusText: 'Bad Request',
          text: () => Promise.resolve('{"message":"Bad Request"}')
        } as Response)
      );

      await expect(exchangeStravaCode('invalid_code'))
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
      max_heartrate: 180
    };

    it('should transform and store activities', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockActivity])
        } as Response)
      );

      await syncStravaActivities(TEST_USER_ID, 'test_access_token');

      expect(db.insert).toHaveBeenCalled();
      const insertCall = vi.mocked(db.insert);
      const values = await insertCall().values();
      expect(values[0]).toMatchObject({
        userId: TEST_USER_ID,
        stravaId: mockActivity.id.toString(),
        name: mockActivity.name,
        type: mockActivity.type
      });
    });

    it('should handle rate limiting with retries', async () => {
      vi.mocked(fetch)
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: false,
            status: 429,
            headers: new Headers({ 'Retry-After': '1' })
          } as Response)
        )
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          } as Response)
        );

      await syncStravaActivities(TEST_USER_ID, 'test_access_token');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should handle database errors', async () => {
      vi.mocked(fetch).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockActivity])
        } as Response)
      );

      vi.mocked(db.insert).mockImplementationOnce(() => ({
        values: vi.fn().mockRejectedValue(new Error('Database error'))
      }));

      await expect(syncStravaActivities(TEST_USER_ID, 'test_access_token'))
        .rejects
        .toThrow('Database error');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh expired token automatically', async () => {
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
        id: TEST_USER_ID,
        stravaTokens: expiredTokens
      });

      vi.mocked(fetch)
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(newTokens)
          } as Response)
        )
        .mockImplementationOnce(() => 
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({})
          } as Response)
        );

      await service.getAthleteProfile();

      expect(storage.updateUser).toHaveBeenCalledWith(
        TEST_USER_ID,
        { stravaTokens: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: newTokens.expires_at
        }}
      );
    });

    it('should handle token refresh failures', async () => {
      vi.mocked(storage.getUser).mockResolvedValueOnce({
        id: TEST_USER_ID,
        stravaTokens: {
          accessToken: 'invalid_token',
          refreshToken: 'invalid_refresh',
          expiresAt: Date.now() / 1000 - 3600
        }
      });

      vi.mocked(fetch).mockRejectedValueOnce(new Error('Token refresh failed'));

      await expect(service.getAthleteProfile())
        .rejects
        .toThrow(StravaError);
    });
  });
});