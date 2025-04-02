import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../db';

// Use a separate test database
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/vici_test';

// Create a new connection for tests
const sql = postgres(TEST_DATABASE_URL);
const testDb = drizzle(sql);

// Run migrations before tests
beforeAll(async () => {
  await migrate(testDb, { migrationsFolder: './drizzle' });
});

// Close database connection after tests
afterAll(async () => {
  await sql.end();
});

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

// Extend NodeJS.Global interface
declare global {
  namespace NodeJS {
    interface Global {
      flushPromises: () => Promise<void>;
    }
  }
}

// Mock environment variables
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';

// Global test setup
beforeAll(() => {
  // Add any global setup here
});

afterAll(() => {
  // Add any global cleanup here
});

// Global mocks
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Global test utilities
(global as any).flushPromises = () => new Promise(resolve => setImmediate(resolve));

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
}); 