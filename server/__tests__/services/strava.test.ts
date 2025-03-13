import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { 
  exchangeStravaCode, 
  refreshStravaToken, 
  syncStravaActivities, 
  getStravaAuthUrl,
  StravaError 
} from '../../services/strava';
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
    console.error = vi.fn();
    console.log = vi.fn();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = new URL(getStravaAuthUrl('test-state'));
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('activity:read_all');
      expect(url.searchParams.get('state')).toBe('test-state');
    });

    it('should throw CONFIG_ERROR if client ID is not configured', () => {
      const originalClientId = process.env.STRAVA_CLIENT_ID;
      process.env.STRAVA_CLIENT_ID = '';

      expect(() => getStravaAuthUrl('test-state'))
        .toThrow(StravaError);

      const error = (() => {
        try {
          getStravaAuthUrl('test-state');
        } catch (e) {
          return e as StravaError;
        }
      })();

      expect(error.code).toBe('CONFIG_ERROR');
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

    it('should throw AUTH_ERROR with proper message on exchange failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request'
      });

      try {
        await exchangeStravaCode('invalid_code');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StravaError);
        expect((error as StravaError).code).toBe('AUTH_ERROR');
        expect(error.message).toContain('Failed to exchange authorization code');
      }
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

    it('should throw AUTH_ERROR with proper message on refresh failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      try {
        await refreshStravaToken('invalid_token');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StravaError);
        expect((error as StravaError).code).toBe('AUTH_ERROR');
        expect(error.message).toContain('Failed to refresh access token');
      }
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

    it('should throw API_ERROR with proper message on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Too Many Requests'
      });

      try {
        await syncStravaActivities(1, 'test_access_token');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StravaError);
        expect((error as StravaError).code).toBe('API_ERROR');
        expect(error.message).toContain('Failed to fetch activities');
      }
    });

    it('should throw DATA_ERROR on invalid response format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }) // Not an array
      });

      try {
        await syncStravaActivities(1, 'test_access_token');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StravaError);
        expect((error as StravaError).code).toBe('DATA_ERROR');
        expect(error.message).toContain('Invalid response from Strava API');
      }
    });
  });
});