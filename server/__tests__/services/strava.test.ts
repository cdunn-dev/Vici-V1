import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
  getStravaAuthUrl,
  exchangeStravaCode,
  refreshStravaToken,
  syncStravaActivities,
  type StravaAuthOptions,
  type StravaTokens
} from '../../services/strava';
import { type DatabaseStorage } from '../../storage';

// Mock storage
vi.mock('../../storage', () => ({
  storage: {
    createActivity: vi.fn(),
    getActivityByStravaId: vi.fn(),
    updateActivity: vi.fn()
  } as Partial<DatabaseStorage>
}));

// Mock environment variables
vi.mock('../../config', () => ({
  STRAVA_CLIENT_ID: 'test_client_id',
  STRAVA_CLIENT_SECRET: 'test_client_secret',
  APP_URL: 'https://test.app'
}));

// Mock fetch calls
global.fetch = vi.fn();

describe('Strava Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStravaAuthUrl', () => {
    it('should generate correct authentication URL with default parameters', () => {
      const url = getStravaAuthUrl({} as StravaAuthOptions);
      expect(url).toContain('https://www.strava.com/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('redirect_uri=https://test.app/api/auth/strava/callback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=read,activity:read');
    });

    it('should generate URL with custom scope and state', () => {
      const options: StravaAuthOptions = {
        scope: ['read', 'activity:write'],
        state: 'custom-state'
      };
      const url = getStravaAuthUrl(options);
      expect(url).toContain('scope=read,activity:write');
      expect(url).toContain('state=custom-state');
    });
  });

  describe('exchangeStravaCode', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse: StravaTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: Date.now() + 21600,
      };

      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const result = await exchangeStravaCode('test_code');
      expect(result).toEqual(mockTokenResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('client_id=test_client_id'),
        })
      );
    });

    it('should handle exchange errors', async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(exchangeStravaCode('invalid_code')).rejects.toThrow();
    });
  });

  describe('refreshStravaToken', () => {
    it('should refresh expired token', async () => {
      const mockRefreshResponse: StravaTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: Date.now() + 21600,
      };

      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse),
      });

      const result = await refreshStravaToken('old_refresh_token');
      expect(result).toEqual(mockRefreshResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('refresh_token=old_refresh_token'),
        })
      );
    });

    it('should handle refresh errors', async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      await expect(refreshStravaToken('invalid_token')).rejects.toThrow();
    });
  });

  describe('syncStravaActivities', () => {
    const mockUser = {
      id: 1,
      stravaTokens: {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        expires_at: Date.now() + 21600,
      },
    };

    const mockActivities: {
      id: number;
      name: string;
      type: string;
      start_date: string;
      distance: number;
      moving_time: number;
      total_elevation_gain: number;
    }[] = [
      {
        id: 1234567890,
        name: 'Morning Run',
        type: 'Run',
        start_date: '2025-03-11T08:00:00Z',
        distance: 5000,
        moving_time: 1800,
        total_elevation_gain: 50,
      },
    ];

    it('should fetch and store activities', async () => {
      // Mock getActivityByStravaId to return null (new activity)
      (storage.getActivityByStravaId as vi.Mock).mockResolvedValue(null);

      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities),
      });

      const result = await syncStravaActivities(mockUser, storage);

      expect(result).toBeTruthy();
      expect(storage.createActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          stravaId: mockActivities[0].id,
          name: mockActivities[0].name,
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/api/v3/athlete/activities',
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockUser.stravaTokens.access_token}`,
          },
        })
      );
    });

    it('should handle existing activities', async () => {
      // Mock getActivityByStravaId to return an existing activity
      const existingActivity = {
        id: 1,
        stravaId: mockActivities[0].id,
        name: 'Old Run Name',
      };
      (storage.getActivityByStravaId as vi.Mock).mockResolvedValue(existingActivity);

      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockActivities),
      });

      await syncStravaActivities(mockUser, storage);

      expect(storage.updateActivity).toHaveBeenCalledWith(
        existingActivity.id,
        expect.objectContaining({
          name: mockActivities[0].name,
        })
      );
    });

    it('should handle API errors', async () => {
      (global.fetch as unknown as vi.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      await expect(syncStravaActivities(mockUser, storage)).rejects.toThrow();
    });

    it('should refresh token if expired', async () => {
      const userWithExpiredToken = {
        ...mockUser,
        stravaTokens: {
          ...mockUser.stravaTokens,
          expires_at: Date.now() - 3600,
        },
      };

      const mockRefreshResponse: StravaTokens = {
        access_token: 'new_access_token',
        refresh_token: 'new_refresh_token',
        expires_at: Date.now() + 21600,
      };

      // Mock refresh token call
      (global.fetch as unknown as vi.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRefreshResponse),
        })
        // Mock activities fetch call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockActivities),
        });

      await syncStravaActivities(userWithExpiredToken, storage);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.strava.com/oauth/token',
        expect.any(Object)
      );
    });
  });
});