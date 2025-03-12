import { vi } from 'vitest';

// Mock config
vi.mock('../../config', () => ({
  default: {
    STRAVA_CLIENT_ID: 'test_client_id',
    STRAVA_CLIENT_SECRET: 'test_client_secret',
    APP_URL: 'https://test.app'
  }
}));

// Mock database operations
vi.mock('../../db', () => {
  const mockDbResponse = vi.fn().mockResolvedValue([]);

  const createChain = () => ({
    from: () => ({
      where: () => ({
        orderBy: () => ({
          limit: () => ({
            execute: mockDbResponse
          })
        })
      })
    })
  });

  return {
    db: {
      select: vi.fn(() => createChain()),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 1 }])
        }))
      }))
    }
  };
});

import {
  getStravaAuthUrl,
  exchangeStravaCode,
  refreshStravaToken,
  syncStravaActivities
} from '../../services/strava';
import { db } from '../../db';
import { activities as stravaActivities } from '../../schema/strava.js';

process.env.STRAVA_CLIENT_ID = 'test_client_id';
process.env.STRAVA_CLIENT_SECRET = 'test_client_secret';

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authentication URL with default parameters', () => {
      const url = new URL(getStravaAuthUrl({}));
      const params = url.searchParams;

      expect(url.origin).toBe('https://www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');
      expect(params.get('client_id')).toBe('test_client_id');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('activity:read_all');
      expect(params.get('approval_prompt')).toBe('auto');
    });

    it('should generate URL with custom scope and state', () => {
      const options = {
        scope: ['read', 'activity:write'],
        state: 'custom-state'
      };
      const url = new URL(getStravaAuthUrl(options));
      const params = url.searchParams;

      expect(params.get('scope')).toBe('read,activity:write');
      expect(params.get('state')).toBe('custom-state');
    });
  });

  describe('exchangeStravaCode', () => {
    const mockTokenResponse = {
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      expiresAt: Date.now() + 21600,
    };

    it('should exchange authorization code for tokens', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: mockTokenResponse.accessToken,
          refresh_token: mockTokenResponse.refreshToken,
          expires_at: mockTokenResponse.expiresAt
        })
      }) as unknown as typeof fetch;

      const result = await exchangeStravaCode('test_code');
      expect(result).toEqual(mockTokenResponse);
    });

    it('should handle exchange errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      }) as unknown as typeof fetch;

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow('Failed to exchange code: Bad Request');
    });
  });

  describe('refreshStravaToken', () => {
    const mockRefreshResponse = {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresAt: Date.now() + 21600,
    };

    it('should refresh expired token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: mockRefreshResponse.accessToken,
          refresh_token: mockRefreshResponse.refreshToken,
          expires_at: mockRefreshResponse.expiresAt
        })
      }) as unknown as typeof fetch;

      const result = await refreshStravaToken('old_refresh_token');
      expect(result).toEqual(mockRefreshResponse);
    });

    it('should handle refresh errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      }) as unknown as typeof fetch;

      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow('Failed to refresh token: Unauthorized');
    });
  });

  describe('syncStravaActivities', () => {
    const mockActivities = [{
      id: 1234567890,
      name: 'Morning Run',
      type: 'Run',
      start_date: '2025-03-11T08:00:00Z',
      distance: 5000.0,
      moving_time: 1800,
      elapsed_time: 1800,
      total_elevation_gain: 50.0,
      average_speed: 2.78,
      max_speed: 3.5,
      average_heartrate: 150.0,
      max_heartrate: 175.0,
      start_latitude: '40.7128',
      start_longitude: '-74.0060',
      map: {
        summary_polyline: 'test_polyline',
        resource_state: 2
      }
    }];

    it('should fetch and store activities', async () => {
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivities)
      }) as unknown as typeof fetch;

      await syncStravaActivities(1, 'test_access_token');

      expect(db.insert).toHaveBeenCalledWith(stravaActivities);
    });

    it('should handle API errors', async () => {
      // Mock API error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      }) as unknown as typeof fetch;

      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow('Failed to fetch activities: Too Many Requests');
    });
  });
});