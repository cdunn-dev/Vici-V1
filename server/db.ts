
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

// Check for DATABASE_URL environment variable
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Please set it in your environment variables.');
  process.exit(1);
}

// Create database client
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
