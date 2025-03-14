import { vi, describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../db'; // Added import statement
import { 
  StravaService,
  exchangeStravaCode, 
  refreshStravaToken,
  syncStravaActivities,
  getStravaAuthUrl,
  StravaError 
} from '../../services/strava';
import { storage } from '../../storage';
import { stravaActivities } from '@shared/schema';

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    getUser: vi.fn(),
    updateUser: vi.fn()
  }
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authorization URL with all required parameters', () => {
      const url = new URL(getStravaAuthUrl('test-state'));

      // Check URL structure
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');

      // Check all required parameters
      const params = url.searchParams;
      expect(params.get('client_id')).toBe(process.env.STRAVA_CLIENT_ID);
      expect(params.get('redirect_uri')).toContain('/api/auth/strava/callback');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('read,activity:read_all,profile:read_all');
      expect(params.get('state')).toBe('test-state');
      expect(params.get('approval_prompt')).toBe('force');
    });

    it('should properly encode special characters in the state parameter', () => {
      const specialState = 'test/state with spaces & special chars';
      const url = new URL(getStravaAuthUrl(specialState));

      // The encoded state should not contain raw special characters
      const encodedState = url.searchParams.get('state');
      expect(encodedState).not.toContain(' ');
      expect(encodedState).not.toContain('&');
      expect(encodedState).not.toContain('/');

      // But when decoded should match original
      expect(decodeURIComponent(encodedState!)).toBe(specialState);
    });

    it('should handle empty state parameter', () => {
      const url = new URL(getStravaAuthUrl());
      expect(url.searchParams.get('state')).toBe('');
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
      expect(error.message).toBe('Strava client ID is not configured');

      process.env.STRAVA_CLIENT_ID = originalClientId;
    });

    it('should use correct Replit domain in redirect URI', () => {
      const url = new URL(getStravaAuthUrl('test-state'));
      const redirectUri = url.searchParams.get('redirect_uri');

      expect(redirectUri).toContain('b69d20e7-bda1-4cf0-b59c-eedcc77485c7-00-3tg7kax6mu3y4.riker.replit.dev');
      expect(redirectUri).toContain('/api/auth/strava/callback');
    });
  });

  describe('exchangeStravaCode', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: 1234567890
      };

      mockFetch.mockResolvedValueOnce({
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request'
      });

      await expect(exchangeStravaCode('invalid_code'))
        .rejects
        .toThrow(StravaError);
    });

    it('should throw CONFIG_ERROR when credentials are missing', async () => {
      const originalClientId = process.env.STRAVA_CLIENT_ID;
      const originalClientSecret = process.env.STRAVA_CLIENT_SECRET;
      process.env.STRAVA_CLIENT_ID = '';
      process.env.STRAVA_CLIENT_SECRET = '';

      await expect(exchangeStravaCode('test_code'))
        .rejects
        .toThrow(StravaError);

      process.env.STRAVA_CLIENT_ID = originalClientId;
      process.env.STRAVA_CLIENT_SECRET = originalClientSecret;
    });

    it('should handle network errors appropriately', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(exchangeStravaCode('test_code'))
        .rejects
        .toThrow(StravaError);
    });

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(exchangeStravaCode('test_code'))
        .rejects
        .toThrow(StravaError);
    });
  });

  describe('refreshStravaToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: 1234567890
      };

      mockFetch.mockResolvedValueOnce({
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
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(refreshStravaToken('invalid_token'))
        .rejects
        .toThrow(StravaError);
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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([mockActivity])
      });

      await syncStravaActivities(1, 'test_access_token');
      expect(vi.mocked(db.insert)).toHaveBeenCalledWith(stravaActivities); //Corrected line
    });

    it('should throw API_ERROR with proper message on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Too Many Requests'
      });

      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow(StravaError);
    });

    it('should throw DATA_ERROR on invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: 'response' }) // Not an array
      });

      await expect(syncStravaActivities(1, 'test_access_token'))
        .rejects
        .toThrow(StravaError);
    });
  });

  describe('analyzeRunningExperience', () => {
    const mockActivities = [
      {
        type: 'Run',
        distance: 10000, // 10km
        start_date: '2025-03-13T08:00:00Z',
        name: 'Morning Easy Run'
      },
      {
        type: 'Run',
        distance: 15000,
        start_date: '2025-03-14T08:00:00Z',
        name: 'Long Run'
      },
      {
        type: 'Run',
        distance: 8000,
        start_date: '2025-03-15T08:00:00Z',
        name: 'Tempo Run'
      }
    ];

    beforeEach(() => {
      vi.mocked(storage.getUser).mockResolvedValue({
        id: userId,
        stravaTokens: {
          accessToken: 'valid_token',
          refreshToken: 'refresh_token',
          expiresAt: Date.now() / 1000 + 3600
        }
      } as any);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities)
      });
    });

    it('should analyze running experience correctly', async () => {
      const analysis = await service.analyzeRunningExperience();

      expect(analysis).toEqual({
        level: 'beginner', // Based on weekly mileage
        weeklyMileage: expect.any(Number),
        preferredRunDays: expect.arrayContaining(['wednesday', 'thursday', 'friday']),
        commonWorkoutTypes: expect.arrayContaining(['easy', 'long run', 'tempo'])
      });
    });

    it('should determine correct experience level based on mileage and workouts', async () => {
      // Mock higher volume runner
      const highVolumeActivities = mockActivities.map(a => ({
        ...a,
        distance: a.distance * 4 // 4x the distance
      }));

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(highVolumeActivities)
      });

      const analysis = await service.analyzeRunningExperience();
      expect(analysis.level).toBe('intermediate');
    });

    it('should handle empty activity list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const analysis = await service.analyzeRunningExperience();
      expect(analysis).toEqual({
        level: 'beginner',
        weeklyMileage: 0,
        preferredRunDays: [],
        commonWorkoutTypes: []
      });
    });
  });

  describe('token refresh', () => {
    it('should refresh expired token automatically', async () => {
      const expiredTokens = {
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: Date.now() / 1000 - 3600 // Expired 1 hour ago
      };

      const newTokens = {
        accessToken: 'new_token',
        refreshToken: 'new_refresh_token',
        expiresAt: Date.now() / 1000 + 3600
      };

      vi.mocked(storage.getUser).mockResolvedValueOnce({
        id: userId,
        stravaTokens: expiredTokens
      } as any);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(newTokens)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({})
        });

      await service.getAthleteProfile();

      expect(vi.mocked(storage.updateUser)).toHaveBeenCalledWith(
        userId,
        { stravaTokens: newTokens }
      );
    });
  });
});