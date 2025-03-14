import { vi } from 'vitest';
import type { Response, ResponseType } from 'node-fetch';

console.log('[Test Setup] Starting...');

// Set up clean environment for all tests
process.env = {
  NODE_ENV: 'test',
  STRAVA_CLIENT_ID: 'test_client_id',
  STRAVA_CLIENT_SECRET: 'test_client_secret',
  REPL_ID: 'test-repl-id'
};

// Create a proper Response mock that matches node-fetch behavior
class MockResponse implements Response {
  private _body: any;
  public headers: Headers;
  public ok: boolean;
  public status: number;
  public statusText: string;
  public type: ResponseType;
  public url: string;
  public bodyUsed: boolean;
  public redirected: boolean;
  public size: number;

  constructor(body: any, init: ResponseInit = {}) {
    console.log('[MockResponse] Creating response with:', {
      body: typeof body === 'object' ? JSON.stringify(body) : body,
      init
    });

    this._body = body;
    this.headers = new Headers(init.headers);
    this.status = init.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = init.statusText || '';
    this.type = 'default';
    this.url = '';
    this.bodyUsed = false;
    this.redirected = false;
    this.size = 0;
  }

  async json() {
    console.log('[MockResponse] Parsing JSON body:', this._body);
    if (this.bodyUsed) {
      throw new Error('Body has already been consumed');
    }
    this.bodyUsed = true;
    if (typeof this._body === 'string') {
      return JSON.parse(this._body);
    }
    return this._body;
  }

  async text() {
    console.log('[MockResponse] Converting body to text');
    if (this.bodyUsed) {
      throw new Error('Body has already been consumed');
    }
    this.bodyUsed = true;
    if (typeof this._body === 'string') {
      return this._body;
    }
    return JSON.stringify(this._body);
  }

  clone(): Response {
    console.log('[MockResponse] Cloning response');
    const cloned = new MockResponse(this._body, {
      status: this.status,
      statusText: this.statusText,
      headers: this.headers
    });
    return cloned as Response;
  }
  arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error("Method not implemented.");
  }
  blob(): Promise<Blob> {
    throw new Error("Method not implemented.");
  }
  formData(): Promise<FormData> {
    throw new Error("Method not implemented.");
  }
  body: ReadableStream<Uint8Array> | null = null;
}

// Mock fetch with detailed logging
vi.mock('node-fetch', () => ({
  default: vi.fn((url: string, options?: RequestInit) => {
    console.log('[fetch mock] Called with:', { url, options });
    return Promise.resolve(new MockResponse({}, { status: 200 }));
  }),
  Response: MockResponse
}));

// Mock storage
vi.mock('./storage', () => ({
  storage: {
    getUser: vi.fn(),
    updateUser: vi.fn()
  }
}));

// Mock database
vi.mock('./db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn()
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

// Reset all mocks after each test
afterEach(() => {
  console.log('[Test Setup] Cleaning up after test');
  vi.clearAllMocks();
});