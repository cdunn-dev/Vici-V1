import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fetch from 'node-fetch';
import { getStravaAuthUrl, StravaError } from '../../services/strava';

describe('Strava Service', () => {
  describe('Authentication URL Generation', () => {
    beforeEach(() => {
      console.log('[Test] Setting up test environment');
      process.env.STRAVA_CLIENT_ID = 'test_client_id';
      process.env.STRAVA_CLIENT_SECRET = 'test_client_secret';
      process.env.REPL_ID = 'test-repl-id';

      console.log('[Test] Environment configured:', {
        STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
        STRAVA_CLIENT_SECRET: '[REDACTED]',
        REPL_ID: process.env.REPL_ID
      });

      // Mock fetch for this specific test suite
      vi.mocked(fetch).mockImplementation((url: string, options?: RequestInit) => {
        console.log('[Test] Mock fetch called with:', { url, options });
        return Promise.resolve(new Response({}, { status: 200 }));
      });
    });

    it('should generate correct auth URL', () => {
      console.log('[Test] Testing auth URL generation');

      const url = new URL(getStravaAuthUrl('test-state'));
      console.log('[Test] Generated URL:', url.toString());

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

      console.log('[Test] URL validation complete');
    });

    it('should throw error if client ID is missing', () => {
      console.log('[Test] Testing missing client ID error');
      process.env.STRAVA_CLIENT_ID = '';

      expect(() => getStravaAuthUrl('test-state'))
        .toThrow(StravaError);

      console.log('[Test] Error handling verified');
    });

    afterEach(() => {
      console.log('[Test] Cleaning up test environment');
      vi.restoreAllMocks();
    });
  });
});