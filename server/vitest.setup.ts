import { vi } from 'vitest';
import type { Response } from 'node-fetch';

// Set environment variables first
process.env = {
  ...process.env,
  STRAVA_CLIENT_ID: 'test_client_id',
  STRAVA_CLIENT_SECRET: 'test_client_secret',
  NODE_ENV: 'test'
};

// Mock modules before any tests run
vi.mock('node-fetch', () => ({
  default: vi.fn(() => Promise.resolve(new MockResponse({}, { status: 200 })))
}));

vi.mock('@shared/schema', () => ({
  stravaActivities: {
    name: 'strava_activities',
    userId: 'number',
    stravaId: 'text',
    type: 'text'
  }
}));

vi.mock('./storage', () => ({
  storage: {
    getUser: vi.fn(() => Promise.resolve(undefined)),
    updateUser: vi.fn(() => Promise.resolve())
  }
}));

vi.mock('./db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve([]))
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }))
    }))
  }
}));

// Add type-safe Response mock implementation
class MockResponse implements Partial<Response> {
  ok: boolean;
  status: number;
  statusText: string;
  private body: any;
  headers: Headers;

  constructor(body: any, init: ResponseInit = {}) {
    this.ok = init.status ? init.status >= 200 && init.status < 300 : true;
    this.status = init.status || 200;
    this.statusText = init.statusText || '';
    this.body = body;
    this.headers = new Headers(init.headers || {});
  }

  async json() {
    return this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
}

// Replace global Response
global.Response = MockResponse as any;

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});