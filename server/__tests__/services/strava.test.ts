import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { exchangeStravaCode, refreshStravaToken, syncStravaActivities, getStravaAuthUrl } from '../../services/strava';
import { activities as stravaActivities } from '../../schema/strava';
import { db } from '../../db';

// Mock DB operations
vi.mock('../../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue(undefined)
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([])
    })
  }
}));

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = new URL(getStravaAuthUrl('test-state'));
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('activity:read_all');
      expect(url.searchParams.get('state')).toBe('test-state');
    });

    it('should throw error if client ID is not configured', () => {
      const originalClientId = process.env.STRAVA_CLIENT_ID;
      process.env.STRAVA_CLIENT_ID = '';
      expect(() => getStravaAuthUrl('test-state')).toThrow('STRAVA_CLIENT_ID is not configured');
      process.env.STRAVA_CLIENT_ID = originalClientId;
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
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request'
      });

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow('Failed to exchange code');
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
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow('Failed to refresh token');
    });
  });

  describe('syncStravaActivities', () => {
    const mockActivity = {
      id: 1234567890,
      name: 'Morning Run',
      type: 'Run',
      start_date: '2025-03-15T08:00:00Z',
      distance: 5000,
      moving_time: 1800,
      elapsed_time: 1800,
      total_elevation_gain: 50,
      average_speed: 2.78,
      max_speed: 3.5,
      average_heartrate: 150,
      max_heartrate: 175,
      start_latitude: '40.7128',
      start_longitude: '-74.0060',
      map: {
        summary_polyline: 'test_polyline'
      }
    };

    it('should fetch and store activities successfully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockActivity])
      });

      await syncStravaActivities(1, 'test_access_token');
      expect(db.insert).toHaveBeenCalledWith(stravaActivities);
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Too Many Requests'
      });

      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow('Failed to fetch activities');
    });
  });
});