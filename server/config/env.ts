
import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define schema for environment variables
const envSchema = z.object({
  // Database (optional but validated if present)
  DATABASE_URL: z.string().optional(),
  
  // Authentication (required)
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  
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
    const env = envSchema.safeParse(process.env);
    
    if (!env.success) {
      console.error('❌ Invalid environment variables:');
      for (const error of env.error.errors) {
        console.error(`- ${error.path}: ${error.message}`);
      }
      return false;
    }
    
    // Additional validation logic
    if (process.env.DATABASE_URL) {
      console.log('✅ Database URL provided');
    } else {
      console.warn('⚠️ DATABASE_URL not set - will use file-based storage');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating environment variables:', error);
    return false;
  }
};

// Typed environment variables access
export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET!,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000'),
  MIGRATE_DATA: process.env.MIGRATE_DATA === 'true',
  STRAVA_CLIENT_ID: process.env.STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET: process.env.STRAVA_CLIENT_SECRET,
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEV: process.env.NODE_ENV === 'development',
};
