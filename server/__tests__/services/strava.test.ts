import { vi } from 'vitest';

// Mock DB operations
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }])
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue([])
    })
  }
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { exchangeStravaCode, refreshStravaToken, syncStravaActivities, getStravaAuthUrl } from '../../services/strava';
import { activities as stravaActivities } from '../../schema/strava';
import { db } from '../../db';

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = new URL(getStravaAuthUrl({}));
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('activity:read_all');
    });
  });

  describe('exchangeStravaCode', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: 1234567890
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
      global.fetch = vi.fn().mockRejectedValue(new Error('Bad Request'));
      return expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow('Error exchanging Strava code');
    });
  });

  describe('refreshStravaToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: 1234567890
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
      global.fetch = vi.fn().mockRejectedValue(new Error('Unauthorized'));
      return expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow('Error refreshing Strava token');
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
      elapsed_time: 1800,
      total_elevation_gain: 50,
      average_speed: 2.78,
      max_speed: 3.5,
      average_heartrate: 150,
      max_heartrate: 175,
      start_latitude: '40.7128',
      start_longitude: '-74.0060'
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
      global.fetch = vi.fn().mockRejectedValue(new Error('Too Many Requests'));
      return expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow('Error syncing Strava activities');
    });
  });
});