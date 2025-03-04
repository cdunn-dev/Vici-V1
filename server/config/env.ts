import { z } from 'zod';
import * as dotenv from 'dotenv';
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Define schema for environment variables
const envSchema = z.object({
  // Database (optional but validated if present)
  DATABASE_URL: z.string().optional(),

  // Authentication (required)
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),

  // OpenAI API Key (required)
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),

  // Optional environment variables
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MIGRATE_DATA: z.enum(['true', 'false']).optional(),

  // Strava integration (optional)
  STRAVA_CLIENT_ID: z.string().optional(),
  STRAVA_CLIENT_SECRET: z.string().optional(),
});

// Parse and validate environment variables
export const validateEnv = () => {
  try {
    logger.info('Validating environment variables...');

    const env = envSchema.safeParse(process.env);

    if (!env.success) {
      logger.error('❌ Invalid environment variables:');
      for (const error of env.error.errors) {
        logger.error(`- ${error.path.join('.')}: ${error.message}`);
      }
      return false;
    }

    // Additional validation logic
    logger.info('✅ Environment validation successful');
    if (process.env.DATABASE_URL) {
      logger.info('✅ Database URL provided');
    } else {
      logger.warn('⚠️ DATABASE_URL not set - will use file-based storage');
    }

    return true;
  } catch (error) {
    logger.error('❌ Error validating environment variables:', error);
    return false;
  }
};

// Typed environment variables access
export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET!,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MIGRATE_DATA: process.env.MIGRATE_DATA === 'true',
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEV: process.env.NODE_ENV === 'development',
};