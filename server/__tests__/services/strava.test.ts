// Mock setup must be before imports
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// Mock environment variables must be before imports
vi.mock('../../config', () => ({
  default: {
    STRAVA_CLIENT_ID: 'test_client_id',
    STRAVA_CLIENT_SECRET: 'test_client_secret',
    APP_URL: 'https://test.app'
  }
}));

import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStravaAuthUrl,
  exchangeStravaCode,
  refreshStravaToken,
  syncStravaActivities,
  type StravaAuthOptions,
  type StravaTokens
} from '../../services/strava';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import { stravaActivities } from '@shared/schema';

// Mock database operations
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => [])
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve())
    }))
  }
}));

// Mock environment variables
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
      const options: StravaAuthOptions = {
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
    const mockTokenResponse: StravaTokens = {
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      expiresAt: Date.now() + 21600,
    };

    it('should exchange authorization code for tokens', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: mockTokenResponse.accessToken,
          refresh_token: mockTokenResponse.refreshToken,
          expires_at: mockTokenResponse.expiresAt
        })
      });

      const result = await exchangeStravaCode('test_code');
      expect(result).toEqual(mockTokenResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.strava.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            code: 'test_code',
            grant_type: 'authorization_code'
          })
        })
      );
    });

    it('should handle exchange errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request'
      });

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow('Failed to exchange code: Bad Request');
    });
  });

  describe('refreshStravaToken', () => {
    const mockRefreshResponse: StravaTokens = {
      accessToken: 'new_access_token',
      refreshToken: 'new_refresh_token',
      expiresAt: Date.now() + 21600,
    };

    it('should refresh expired token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: mockRefreshResponse.accessToken,
          refresh_token: mockRefreshResponse.refreshToken,
          expires_at: mockRefreshResponse.expiresAt
        })
      });

      const result = await refreshStravaToken('old_refresh_token');
      expect(result).toEqual(mockRefreshResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.strava.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: 'test_client_id',
            client_secret: 'test_client_secret',
            refresh_token: 'old_refresh_token',
            grant_type: 'refresh_token'
          })
        })
      );
    });

    it('should handle refresh errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow('Failed to refresh token: Unauthorized');
    });
  });

  describe('syncStravaActivities', () => {
    const mockActivities = [
      {
        id: 1234567890,
        name: 'Morning Run',
        type: 'Run',
        start_date: '2025-03-11T08:00:00Z',
        distance: 5000,
        moving_time: 1800,
        elapsed_time: 1800,
        total_elevation_gain: 50,
        average_speed: 2.78,
        max_speed: 3.5,
        average_heartrate: null,
        max_heartrate: null,
        start_latitude: '40.7128',
        start_longitude: '-74.0060',
        map: {
          summary_polyline: 'test_polyline',
          resource_state: 2
        }
      }
    ];

    it('should fetch and store activities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities)
      });

      await syncStravaActivities(1, 'test_access_token');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.strava.com/api/v3/athlete/activities'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test_access_token'
          }
        })
      );

      expect(db.insert).toHaveBeenCalledWith(stravaActivities);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests'
      });

      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow('Failed to fetch activities: Too Many Requests');
    });
  });
});