
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

// Create database client if DATABASE_URL is available
let db: ReturnType<typeof drizzle> | null = null;

try {
  if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql, { schema });
    console.log('Database client initialized successfully');
  } else {
    console.warn('DATABASE_URL is not set. File-based storage will be used instead.');
  }
} catch (error) {
  console.error('Failed to initialize database client:', error);
}

export { db };
