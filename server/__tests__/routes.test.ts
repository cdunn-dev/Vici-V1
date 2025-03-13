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

describe('API Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    registerRoutes(app);
  });

  describe('Strava Profile Endpoint', () => {
    const mockProfile = {
      gender: 'M',
      birthday: '1990-01-01',
      measurementPreference: 'meters',
      weight: 70,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        city: 'New York',
        state: 'NY',
        country: 'United States'
      },
      runningExperience: {
        level: 'intermediate',
        weeklyMileage: 30,
        preferredRunDays: ['monday', 'wednesday', 'saturday'],
        commonWorkoutTypes: ['easy', 'tempo', 'long run']
      }
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app).get('/api/strava/profile');
      expect(response.status).toBe(401);
    });

    it('should return 400 when Strava is not connected', async () => {
      const response = await request(app)
        .get('/api/strava/profile')
        .set('user', JSON.stringify({ id: 1, stravaTokens: null }));
      expect(response.status).toBe(400);
    });

    it('should return profile data when authenticated and connected', async () => {
      vi.mocked(StravaService).mockImplementation(() => ({
        getAthleteProfile: vi.fn().mockResolvedValue(mockProfile),
        analyzeRunningExperience: vi.fn().mockResolvedValue(mockProfile.runningExperience)
      }));

      const response = await request(app)
        .get('/api/strava/profile')
        .set('user', JSON.stringify({
          id: 1,
          stravaTokens: {
            accessToken: 'valid_token',
            refreshToken: 'refresh_token',
            expiresAt: Date.now() / 1000 + 3600
          }
        }));

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
    });

    it('should handle errors from Strava API', async () => {
      vi.mocked(StravaService).mockImplementation(() => ({
        getAthleteProfile: vi.fn().mockRejectedValue(new Error('Strava API error')),
        analyzeRunningExperience: vi.fn().mockRejectedValue(new Error('Strava API error'))
      }));

      const response = await request(app)
        .get('/api/strava/profile')
        .set('user', JSON.stringify({
          id: 1,
          stravaTokens: {
            accessToken: 'valid_token',
            refreshToken: 'refresh_token',
            expiresAt: Date.now() / 1000 + 3600
          }
        }));

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to fetch Strava profile');
    });
  });
});

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
        .set('user', JSON.stringify({ id: 123 }));

      expect(response.status).toBe(302); // Redirect after success
      expect(response.header.location).toBe('/training');
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
});