import { vi } from 'vitest';

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
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn()
    })
  }
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { getStravaAuthUrl, exchangeStravaCode, refreshStravaToken, syncStravaActivities } from '../../services/strava';
import { activities as stravaActivities } from '../../schema/strava';
import { db } from '../../db';

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = new URL(getStravaAuthUrl({}));
      expect(url.origin).toBe('https://www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('activity:read_all');
    });
  });

  describe('exchangeStravaCode', () => {
    it('should exchange code for tokens successfully', () => {
      const mockResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: 1234567890
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      return expect(exchangeStravaCode('test_code')).resolves.toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresAt: mockResponse.expires_at
      });
    });

    it('should handle exchange errors', async () => {
      global.fetch = vi.fn().mockRejectedValue('Bad Request');

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toMatchObject({
          message: expect.stringContaining('Error exchanging Strava code')
        });
    });
  });

  describe('refreshStravaToken', () => {
    it('should refresh tokens successfully', () => {
      const mockResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: 1234567890
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      return expect(refreshStravaToken('test_refresh_token')).resolves.toEqual({
        accessToken: mockResponse.access_token,
        refreshToken: mockResponse.refresh_token,
        expiresAt: mockResponse.expires_at
      });
    });

    it('should handle refresh errors', async () => {
      global.fetch = vi.fn().mockRejectedValue('Unauthorized');

      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toMatchObject({
          message: expect.stringContaining('Error refreshing Strava token')
        });
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

    it('should fetch and store activities successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivities)
      });

      await syncStravaActivities(1, 'test_access_token');
      expect(db.insert).toHaveBeenCalledWith(stravaActivities);
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockRejectedValue('Too Many Requests');

      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toMatchObject({
          message: expect.stringContaining('Error syncing Strava activities')
        });
    });
  });
});