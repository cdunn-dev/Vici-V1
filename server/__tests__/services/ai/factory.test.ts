import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { AIServiceFactory } from '../../../services/ai/factory';
import { AIServiceError } from '../../../services/ai/types';

describe('AIServiceFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.log = vi.fn();
  });

  it('should throw AIServiceError when provider is missing', () => {
    try {
      AIServiceFactory.getService({ provider: '', apiKey: 'test-key' });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(AIServiceError);
      expect(error.code).toBe('CONFIGURATION');
      expect(error.message).toBe('AI provider must be specified');
    }
  });

  it('should throw AIServiceError for unsupported provider', () => {
    try {
      AIServiceFactory.getService({ provider: 'unsupported', apiKey: 'test-key' });
      fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(AIServiceError);
      expect(error.code).toBe('CONFIGURATION');
      expect(error.message).toContain('Unsupported AI provider');
    }
  });

  it('should create OpenAI service successfully', () => {
    const service = AIServiceFactory.getService({
      provider: 'openai',
      apiKey: 'test-key',
    });
    expect(service).toBeDefined();
    expect(service.name).toBe('openai');
  });

  it('should reuse existing service instance', () => {
    const config = { provider: 'openai', apiKey: 'test-key' };
    const service1 = AIServiceFactory.getService(config);
    const service2 = AIServiceFactory.getService(config);
    expect(service1).toBe(service2);
  });

  it('should create separate instances for different configs', () => {
    const service1 = AIServiceFactory.getService({
      provider: 'openai',
      apiKey: 'key1',
    });
    const service2 = AIServiceFactory.getService({
      provider: 'openai',
      apiKey: 'key2',
    });
    expect(service1).not.toBe(service2);
  });
});
