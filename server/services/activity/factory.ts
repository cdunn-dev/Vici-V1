import { ActivityProvider } from './types';
import { StravaService } from './strava';

export class ActivityServiceFactory {
  private static instances: Map<string, ActivityProvider> = new Map();

  static getService(provider: string): ActivityProvider {
    if (!this.instances.has(provider)) {
      const service = this.createService(provider);
      this.instances.set(provider, service);
    }

    return this.instances.get(provider)!;
  }

  private static createService(provider: string): ActivityProvider {
    switch (provider.toLowerCase()) {
      case 'strava':
        return new StravaService();
      default:
        throw new Error(`Unsupported activity provider: ${provider}`);
    }
  }
}

// Create a shared instance for the application
export const stravaService = ActivityServiceFactory.getService('strava');
