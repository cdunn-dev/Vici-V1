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