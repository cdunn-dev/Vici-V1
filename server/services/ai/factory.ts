import { AIProvider, AIServiceConfig, AIServiceError } from './types';
import { OpenAIService } from './openai';
import { GoogleAIService } from './google';

export class AIServiceFactory {
  private static instances: Map<string, AIProvider> = new Map();

  static getService(config: AIServiceConfig): AIProvider {
    const key = `${config.provider}-${config.apiKey}`;

    if (!this.instances.has(key)) {
      try {
        const service = this.createService(config);
        this.instances.set(key, service);
      } catch (error) {
        console.error(`[AIServiceFactory] Failed to create service for provider ${config.provider}:`, error);
        throw new AIServiceError(
          `Failed to initialize AI service: ${error instanceof Error ? error.message : 'Unknown error'}`,
          config.provider,
          'initialization',
          'CONFIGURATION',
          error instanceof Error ? error : undefined
        );
      }
    }

    const service = this.instances.get(key);
    if (!service) {
      throw new AIServiceError(
        'Failed to retrieve AI service instance',
        config.provider,
        'initialization',
        'CONFIGURATION'
      );
    }

    return service;
  }

  private static createService(config: AIServiceConfig): AIProvider {
    if (!config.provider) {
      throw new AIServiceError(
        'AI provider must be specified',
        'unknown',
        'initialization',
        'CONFIGURATION'
      );
    }

    console.log(`[AIServiceFactory] Creating new service instance for provider: ${config.provider}`);

    switch (config.provider.toLowerCase()) {
      case 'openai':
        return new OpenAIService(config);
      case 'google':
        return new GoogleAIService(config);
      default:
        throw new AIServiceError(
          `Unsupported AI provider: ${config.provider}`,
          config.provider,
          'initialization',
          'CONFIGURATION'
        );
    }
  }
}

// Create service instance with configurations from environment
export const aiService = AIServiceFactory.getService({
  provider: process.env.AI_PROVIDER || 'openai',
  apiKey: process.env.OPENAI_API_KEY || '',
  modelName: process.env.AI_MODEL_NAME,
  maxRetries: 3,
  timeout: 30000,
});