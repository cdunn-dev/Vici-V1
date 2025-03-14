import { vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock environment variables
process.env = {
  ...process.env,
  STRAVA_CLIENT_ID: 'test_client_id',
  STRAVA_CLIENT_SECRET: 'test_client_secret',
  APP_URL: 'https://test.app',
  NODE_ENV: 'test',
};

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// Add JSON methods to Response for mocking
global.Response = class Response {
  ok: boolean;
  status: number;
  statusText: string;
  _body: any;

  constructor(body: any, init?: ResponseInit) {
    this.ok = init?.status ? init.status >= 200 && init.status < 300 : true;
    this.status = init?.status || 200;
    this.statusText = init?.statusText || '';
    this._body = body;
  }

  async json() {
    return this._body;
  }
} as any;