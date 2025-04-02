import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import { registerRoutes } from '../routes';
import request from 'supertest';
import { StravaService } from '../services/strava';
import { exchangeStravaCode, syncStravaActivities } from '../services/strava';

// Mock StravaService
vi.mock('../services/strava', () => ({
  StravaService: vi.fn(),
  exchangeStravaCode: vi.fn(),
  syncStravaActivities: vi.fn()
}));

describe('Strava OAuth Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    registerRoutes(app);
  });

  describe('Strava OAuth Callback', () => {
    it('should handle successful authorization', async () => {
      const mockTokens = {
        accessToken: 'test_access',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() / 1000 + 3600
      };

      vi.mocked(exchangeStravaCode).mockResolvedValueOnce(mockTokens);
      vi.mocked(syncStravaActivities).mockResolvedValueOnce();

      const response = await request(app)
        .get('/api/auth/strava/callback')
        .query({
          code: 'valid_code',
          state: '123'
        })
        .set('user', JSON.stringify({ id: '123' }));

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('/profile/review');
    });

    it('should handle authorization errors', async () => {
      const response = await request(app)
        .get('/api/auth/strava/callback')
        .query({
          error: 'access_denied',
          error_description: 'User denied access'
        });

      expect(response.status).toBe(302);
      expect(response.header.location).toContain('/auth?error=');
    });

    it('should handle missing code parameter', async () => {
      const response = await request(app)
        .get('/api/auth/strava/callback')
        .query({ state: '123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No code provided');
    });

    it('should handle token exchange failures', async () => {
      vi.mocked(exchangeStravaCode).mockRejectedValueOnce(
        new Error('Token exchange failed')
      );

      const response = await request(app)
        .get('/api/auth/strava/callback')
        .query({
          code: 'invalid_code',
          state: '123'
        });

      expect(response.status).toBe(302);
      expect(response.header.location).toBe('/auth?error=strava-auth-failed');
    });
  });

  describe('Profile Data Sync and Storage', () => {
    const mockProfile = {
      gender: 'M',
      birthday: '1990-01-01',
      measurementPreference: 'miles',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: 'https://example.com/pic.jpg'
      },
      personalBests: [
        { distance: '5K', time: '20:00', date: '2025-01-01' }
      ],
      stravaStats: {
        totalDistance: 1000000,
        totalRuns: 100
      },
      runningExperience: {
        level: 'intermediate',
        weeklyMileage: 30,
        preferredRunDays: ['monday', 'wednesday', 'saturday'],
        commonWorkoutTypes: ['easy', 'tempo', 'long run']
      }
    };

    it('should properly store and return profile data', async () => {
      vi.mocked(StravaService).mockImplementation(() => ({
        getAthleteProfile: vi.fn().mockResolvedValue(mockProfile),
        analyzeRunningProfile: vi.fn().mockResolvedValue(mockProfile.runningExperience)
      }));

      // Test profile storage during OAuth callback
      const tokens = {
        accessToken: 'test_access',
        refreshToken: 'test_refresh',
        expiresAt: Date.now() / 1000 + 3600
      };

      vi.mocked(exchangeStravaCode).mockResolvedValueOnce(tokens);

      const callbackResponse = await request(app)
        .get('/api/auth/strava/callback')
        .query({ code: 'valid_code' })
        .set('user', JSON.stringify({ id: '123' }));

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.header.location).toBe('/profile/review');

      // Verify stored data can be retrieved
      const profileResponse = await request(app)
        .get('/api/strava/profile')
        .set('user', JSON.stringify({
          id: '123',
          stravaTokens: tokens
        }));

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body).toMatchObject({
        gender: mockProfile.gender,
        birthday: mockProfile.birthday,
        measurementPreference: mockProfile.measurementPreference,
        runningExperience: mockProfile.runningExperience
      });
    });

    it('should handle profile update errors gracefully', async () => {
      vi.mocked(StravaService).mockImplementation(() => ({
        getAthleteProfile: vi.fn().mockRejectedValue(new Error('Failed to fetch profile')),
        analyzeRunningProfile: vi.fn().mockRejectedValue(new Error('Analysis failed'))
      }));

      const response = await request(app)
        .patch('/api/users/123')
        .set('user', JSON.stringify({ id: '123' }))
        .send({
          gender: 'M',
          birthday: '1990-01-01',
          preferredDistanceUnit: 'miles'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeTruthy();
    });
  });

  describe('Continuous Sync', () => {
    it('should handle activity sync requests', async () => {
      const user = {
        id: '123',
        stravaTokens: {
          accessToken: 'valid_token',
          refreshToken: 'refresh_token',
          expiresAt: Date.now() / 1000 + 3600
        }
      };

      vi.mocked(syncStravaActivities).mockResolvedValueOnce();

      const response = await request(app)
        .post('/api/activities/sync')
        .set('user', JSON.stringify(user));

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Activities synced successfully');
    });

    it('should handle sync failures appropriately', async () => {
      const user = {
        id: '123',
        stravaTokens: {
          accessToken: 'invalid_token',
          refreshToken: 'refresh_token',
          expiresAt: Date.now() / 1000 + 3600
        }
      };

      vi.mocked(syncStravaActivities).mockRejectedValueOnce(
        new Error('Sync failed')
      );

      const response = await request(app)
        .post('/api/activities/sync')
        .set('user', JSON.stringify(user));

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to sync activities');
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 OK', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('user', JSON.stringify({ id: '123' }));
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/metrics', () => {
    it('should return 200 OK', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .set('user', JSON.stringify({ id: '123' }));
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: '123',
        metrics: {
          activeUsers: 0,
          totalUsers: 0,
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0
        }
      });
    });
  });

  describe('GET /api/status', () => {
    it('should return 200 OK', async () => {
      const response = await request(app)
        .get('/api/status')
        .set('user', JSON.stringify({ id: '123' }))
        .expect(200);

      expect(response.body).toEqual({
        id: '123',
        status: 'ok',
        uptime: expect.any(Number),
        timestamp: expect.any(String)
      });
    });
  });
});