import { vi, describe, it, expect, beforeEach } from 'vitest';

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
  const mockActivities = [{ id: 1, stravaId: '123' }];
  const mockQueryChain = {
    execute: vi.fn().mockResolvedValue(mockActivities),
    limit: function() { return this; },
    orderBy: function() { return this; },
    where: function() { return this; },
    from: function() { return this; }
  };

  return {
    db: {
      select: vi.fn().mockReturnValue(mockQueryChain),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(mockActivities)
        })
      })
    }
  };
});

import { getStravaAuthUrl, exchangeStravaCode, refreshStravaToken, syncStravaActivities } from '../../services/strava';
import { db } from '../../db';
import { activities as stravaActivities } from '../../schema/strava';

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authentication URL with default parameters', () => {
      const url = new URL(getStravaAuthUrl({}));
      expect(url.origin).toBe('https://www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('activity:read_all');
    });

    it('should generate URL with custom scope and state', () => {
      const options = {
        scope: ['read', 'activity:write'],
        state: 'custom-state'
      };

      const url = new URL(getStravaAuthUrl(options));
      expect(url.searchParams.get('scope')).toBe('read,activity:write');
      expect(url.searchParams.get('state')).toBe('custom-state');
    });
  });

  describe('exchangeStravaCode', () => {
    const mockTokenResponse = {
      access_token: 'test_access_token',
      refresh_token: 'test_refresh_token',
      expires_at: Date.now() + 21600
    };

    it('should exchange authorization code for tokens', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse)
      }) as unknown as typeof fetch;

      const result = await exchangeStravaCode('test_code');
      expect(result).toEqual({
        accessToken: mockTokenResponse.access_token,
        refreshToken: mockTokenResponse.refresh_token,
        expiresAt: mockTokenResponse.expires_at
      });
    });

    it('should handle exchange errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Failed to exchange code: Bad Request')
      );

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow('Failed to exchange code: Bad Request');
    });
  });

  describe('refreshStravaToken', () => {
    const mockRefreshResponse = {
      access_token: 'new_access_token',
      refresh_token: 'new_refresh_token',
      expires_at: Date.now() + 21600
    };

    it('should refresh expired token', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse)
      }) as unknown as typeof fetch;

      const result = await refreshStravaToken('test_refresh_token');
      expect(result).toEqual({
        accessToken: mockRefreshResponse.access_token,
        refreshToken: mockRefreshResponse.refresh_token,
        expiresAt: mockRefreshResponse.expires_at
      });
    });

    it('should handle refresh errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Failed to refresh token: Unauthorized')
      );

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
        summary_polyline: 'test_polyline'
      }
    }];

    it('should fetch and store activities', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivities)
      }) as unknown as typeof fetch;

      await syncStravaActivities(1, 'test_access_token');
      expect(db.insert).toHaveBeenCalledWith(stravaActivities);
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Failed to fetch activities: Too Many Requests')
      );

      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow('Failed to fetch activities: Too Many Requests');
    });
  });
});