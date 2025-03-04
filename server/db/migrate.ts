import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '../../shared/schema';
import { logger } from '../utils/logger';
import path from 'path';

export async function verifyMigrations(connectionString: string): Promise<boolean> {
  try {
    logger.info('Starting database migration verification...');
    logger.info('Attempting to create database connection...');

    // Create a connection to the database
    const sql = neon(connectionString);
    logger.info('Successfully created neon client');

    const db = drizzle(sql, { schema });
    logger.info('Successfully initialized Drizzle ORM');

    // Check if the migrations directory exists
    const migrationsDir = path.join(process.cwd(), 'migrations');
    logger.info(`Looking for migrations in: ${migrationsDir}`);

    // Run migrations
    logger.info('Starting database migrations...');
    await migrate(db, { migrationsFolder: migrationsDir });
    logger.info('Successfully completed database migrations');

    // Verify schema by checking users table
    logger.info('Verifying database schema...');
    const result = await db.select().from(schema.users).limit(1);
    logger.info('Successfully verified database schema');

    return true;
  } catch (error) {
    logger.error('Failed to verify migrations:', error);
    if (error instanceof Error) {
      logger.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
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