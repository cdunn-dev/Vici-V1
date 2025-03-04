import { AIProvider, AIServiceConfig } from './types';
import { OpenAIService } from './openai';
import { GoogleAIService } from './google';

export class AIServiceFactory {
  private static instances: Map<string, AIProvider> = new Map();

  static getService(config: AIServiceConfig): AIProvider {
    const key = `${config.provider}-${config.apiKey}`;
    
    if (!this.instances.has(key)) {
      const service = this.createService(config);
      this.instances.set(key, service);
    }

    return this.instances.get(key)!;
  }

  private static createService(config: AIServiceConfig): AIProvider {
    switch (config.provider.toLowerCase()) {
      case 'openai':
        return new OpenAIService(config);
      case 'google':
        return new GoogleAIService(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
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
