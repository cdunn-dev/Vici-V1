import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock config before imports
vi.mock('../../config', () => ({
  default: {
    STRAVA_CLIENT_ID: 'test_client_id',
    STRAVA_CLIENT_SECRET: 'test_client_secret',
    APP_URL: 'https://test.app'
  }
}));

// Mock database operations
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([])
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([])
      })
    })
  }
}));

import { getStravaAuthUrl, exchangeStravaCode, refreshStravaToken, syncStravaActivities } from '../../services/strava';
import { db } from '../../db';
import { activities as stravaActivities } from '../../schema/strava';

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authentication URL', () => {
      const url = new URL(getStravaAuthUrl({}));
      expect(url.origin).toBe('https://www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('activity:read_all');
    });
  });

  describe('exchangeStravaCode', () => {
    it('should exchange code for tokens', async () => {
      const mockResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: Date.now() + 21600
      };

      global.fetch = vi.fn().mockResolvedValue({
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

    it('should handle exchange errors', async () => {
      // Mock the raw error that will be wrapped by the service
      global.fetch = vi.fn().mockRejectedValue(new Error('Bad Request'));

      // The service will wrap the error with context
      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow('Error exchanging Strava code: Error: Bad Request');
    });
  });

  describe('refreshStravaToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: Date.now() + 21600
      };

      global.fetch = vi.fn().mockResolvedValue({
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

    it('should handle refresh errors', async () => {
      // Mock the raw error that will be wrapped by the service
      global.fetch = vi.fn().mockRejectedValue(new Error('Unauthorized'));

      // The service will wrap the error with context
      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow('Error refreshing Strava token: Error: Unauthorized');
    });
  });

  describe('syncStravaActivities', () => {
    const mockActivities = [{
      id: 1234567890,
      name: 'Morning Run',
      type: 'Run',
      start_date: '2025-03-15T08:00:00Z',
      distance: 5000.0,
      moving_time: 1800,
      elapsed_time: 1800
    }];

    it('should fetch and store activities', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivities)
      });

      await syncStravaActivities(1, 'test_access_token');
      expect(db.insert).toHaveBeenCalledWith(stravaActivities);
    });

    it('should handle API errors', async () => {
      // Mock the raw error that will be wrapped by the service
      global.fetch = vi.fn().mockRejectedValue(new Error('Too Many Requests'));

      // The service will wrap the error with context
      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow('Error syncing Strava activities: Error: Too Many Requests');
    });
  });
});