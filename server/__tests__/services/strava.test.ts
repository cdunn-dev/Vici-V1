import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getStravaAuthUrl, StravaError } from '../../services/strava';

describe('Strava Service', () => {
  describe('Authentication URL Generation', () => {
    beforeEach(() => {
      // Ensure environment is clean for each test
      process.env.STRAVA_CLIENT_ID = 'test_client_id';
      console.log('Test environment setup with CLIENT_ID:', process.env.STRAVA_CLIENT_ID);
    });

    it('should generate correct auth URL', () => {
      const url = new URL(getStravaAuthUrl('test-state'));
      console.log('Generated URL:', url.toString());

      // Basic URL structure
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toBe('www.strava.com');
      expect(url.pathname).toBe('/oauth/authorize');

      // Required parameters
      const params = url.searchParams;
      expect(params.get('client_id')).toBe('test_client_id');
      expect(params.get('response_type')).toBe('code');
      expect(params.get('scope')).toBe('read,activity:read_all,profile:read_all');
      expect(params.get('state')).toBe('test-state');
    });

    it('should throw error if client ID is missing', () => {
      process.env.STRAVA_CLIENT_ID = '';
      console.log('Testing with empty CLIENT_ID');

      expect(() => getStravaAuthUrl('test-state')).toThrow(StravaError);
    });
  });
});