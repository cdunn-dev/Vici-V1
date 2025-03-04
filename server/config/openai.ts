
import OpenAI from 'openai';
import { env } from './env';
import { logger } from '../utils/logger';

// Initialize OpenAI with API key from environment variables
let openai: OpenAI | null = null;

try {
  if (env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    logger.info('OpenAI client initialized successfully');
  } else {
    logger.warn('OpenAI API key not provided, AI features will be limited');
  }
} catch (error) {
  logger.error('Failed to initialize OpenAI client:', error);
}

// Function to check if OpenAI is properly configured
export function isOpenAIConfigured(): boolean {
  return !!openai;
}

// Export openai instance for use in services
export { openai };
