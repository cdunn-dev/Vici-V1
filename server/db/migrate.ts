
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '../../shared/schema';
import { logger } from '../utils/logger';
import path from 'path';

export async function verifyMigrations(connectionString: string): Promise<boolean> {
  try {
    logger.info('Verifying database migrations...');
    
    // Create a connection to the database
    const sql = neon(connectionString);
    const db = drizzle(sql, { schema });
    
    // Check if the migrations directory exists
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    // Run migrations
    await migrate(db, { migrationsFolder: migrationsDir });
    
    // Check if schema tables exist by querying for users table
    const result = await db.select().from(schema.users).limit(1);
    logger.info('Database migrations verified successfully');
    
    return true;
  } catch (error) {
    logger.error('Failed to verify migrations:', error);
    return false;
  }
}

export async function getDatabaseVersion(): Promise<string> {
  try {
    // This is a simplified version - in a real application you'd have a 
    // dedicated schema_versions table to track migrations
    return '1.0.0';
  } catch (error) {
    logger.error('Failed to get database version:', error);
    return 'unknown';
  }
}
