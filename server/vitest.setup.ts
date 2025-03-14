import { vi } from 'vitest';

console.log('[Test Setup] Starting...');

// Clean environment for each test
process.env = {
  NODE_ENV: 'test',
  STRAVA_CLIENT_ID: 'test_client_id',
  STRAVA_CLIENT_SECRET: 'test_client_secret',
  REPL_ID: 'test-repl-id'
};

console.log('[Test Setup] Environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  REPL_ID: process.env.REPL_ID
});

// Reset environment after each test
afterEach(() => {
  console.log('[Test Setup] Cleaning up after test');
  vi.clearAllMocks();
});