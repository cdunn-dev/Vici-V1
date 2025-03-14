// Mock modules before imports
vi.mock('@shared/schema', () => ({
  stravaActivities: {
    name: 'strava_activities',
    userId: 'number',
    stravaId: 'text',
    type: 'text'
  }
}));

// Import types first
import type { Response } from 'node-fetch';
import type { User } from '@shared/schema';

// Import test utilities
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Import dependencies after mocks
import fetch from 'node-fetch';
import { storage } from '../../storage';
import { db } from '../../db';
import { 
  StravaService,
  exchangeStravaCode, 
  refreshStravaToken,
  syncStravaActivities,
  getStravaAuthUrl,
  StravaError 
} from '../../services/strava';

// Test constants
const TEST_USER_ID = 1;
const TEST_ACCESS_TOKEN = 'test_access_token';
const TEST_REFRESH_TOKEN = 'test_refresh_token';
const TEST_EXPIRES_AT = Math.floor(Date.now() / 1000) + 3600;

// Test data factory functions
function createMockActivity(overrides = {}) {
  return {
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
    laps: [{
      lap_index: 1,
      split_index: 1,
      distance: 1000,
      elapsed_time: 360,
      moving_time: 360,
      start_date: "2025-03-15T08:05:00Z",
      average_speed: 2.8,
      average_heartrate: 155
    }],
    splits_metric: [{
      distance: 1000,
      elapsed_time: 360,
      elevation_difference: 10,
      moving_time: 360,
      split: 1,
      average_speed: 2.8,
      average_heartrate: 155
    }],
    map: {
      summary_polyline: "test_polyline",
      resource_state: 2
    },
    ...overrides
  };
}

function createMockUser(overrides = {}): Partial<User> {
  return {
    id: TEST_USER_ID,
    stravaTokens: {
      accessToken: TEST_ACCESS_TOKEN,
      refreshToken: TEST_REFRESH_TOKEN,
      expiresAt: TEST_EXPIRES_AT
    },
    ...overrides
  };
}

describe('Strava Service', () => {
  let service: StravaService;

  beforeEach(() => {
    // Reset environment variables
    process.env.STRAVA_CLIENT_ID = 'test_client_id';
    process.env.STRAVA_CLIENT_SECRET = 'test_client_secret';

    // Clear all mocks
    vi.clearAllMocks();

    // Setup default mock responses
    vi.mocked(storage.getUser).mockResolvedValue(createMockUser());
    vi.mocked(storage.updateUser).mockResolvedValue(undefined);
    vi.mocked(fetch).mockResolvedValue(new Response({}, { status: 200 }));
    vi.mocked(db.insert().values).mockResolvedValue([]);

    // Initialize service
    service = new StravaService(TEST_USER_ID);
  });

  describe('Authentication', () => {
    it('should generate correct auth URL', () => {
      const url = new URL(getStravaAuthUrl('test-state'));

      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');

      const params = url.searchParams;
      expect(params.get('client_id')).toBe(process.env.STRAVA_CLIENT_ID);
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
        access_token: TEST_ACCESS_TOKEN,
        refresh_token: TEST_REFRESH_TOKEN,
        expires_at: TEST_EXPIRES_AT
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      const result = await exchangeStravaCode('test_code');
      expect(result).toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresAt: mockResponse.expires_at
      });
    });

    it('should handle token exchange failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: 'Invalid code' }),
          { status: 400, statusText: 'Bad Request', headers: { 'Content-Type': 'application/json' } }
        )
      );

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow(StravaError);
    });

    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: TEST_EXPIRES_AT + 3600
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200, headers: { 'Content-Type': 'application/json' } })
      );

      const result = await refreshStravaToken(TEST_REFRESH_TOKEN);
      expect(result).toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresAt: mockResponse.expires_at
      });
    });
  });

  describe('Activity Synchronization', () => {
    const mockActivity = createMockActivity();

    it('should transform and store activities', async () => {
      // Mock the initial activities list fetch
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify([mockActivity]), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        )
        // Mock the detailed activity fetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockActivity), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        );

      await syncStravaActivities(TEST_USER_ID, TEST_ACCESS_TOKEN);

      expect(db.insert).toHaveBeenCalled();
      expect(db.insert().values).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: TEST_USER_ID,
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
            },
            laps: mockActivity.laps,
            splitMetrics: mockActivity.splits_metric
          })
        ])
      );
    });

    it('should handle rate limiting with retries', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(null, { 
            status: 429,
            headers: { 'Retry-After': '1' }
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify([mockActivity]), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockActivity), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        );

      await syncStravaActivities(TEST_USER_ID, TEST_ACCESS_TOKEN);
      expect(fetch).toHaveBeenCalledTimes(3); // Initial call, retry, and detailed fetch
    });

    it('should handle database errors', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify([mockActivity]), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(mockActivity), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        );

      vi.mocked(db.insert().values).mockRejectedValueOnce(
        new Error('Database error')
      );

      await expect(syncStravaActivities(TEST_USER_ID, TEST_ACCESS_TOKEN))
        .rejects
        .toThrow('Database error');
    });

    it('should handle detailed activity fetch errors', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(JSON.stringify([mockActivity]), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          })
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ message: 'Activity not found' }), 
            { 
              status: 404, 
              statusText: 'Not Found',
              headers: { 'Content-Type': 'application/json' } 
            }
          )
        );

      await expect(syncStravaActivities(TEST_USER_ID, TEST_ACCESS_TOKEN))
        .rejects
        .toThrow(StravaError);
    });
  });
});