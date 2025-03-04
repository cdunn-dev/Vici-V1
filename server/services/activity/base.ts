import { ActivityProvider, Activity, ActivityType, ActivityServiceError, ProviderCredentials } from './types';

export abstract class BaseActivityService implements ActivityProvider {
  protected credentials: ProviderCredentials | null = null;
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  protected abstract fetchActivities(since?: Date): Promise<Activity[]>;
  protected abstract fetchActivity(id: string): Promise<Activity>;
  protected abstract validateCredentials(credentials: ProviderCredentials): Promise<boolean>;
  protected abstract refreshTokenIfNeeded(): Promise<void>;

  async isConnected(): Promise<boolean> {
    return !!this.credentials && await this.validateCredentials(this.credentials);
  }

  async connect(credentials: ProviderCredentials): Promise<void> {
    try {
      const isValid = await this.validateCredentials(credentials);
      if (!isValid) {
        throw new Error("Invalid credentials");
      }
      this.credentials = credentials;
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to connect to ${this.name}`,
        this.name,
        'connect',
        error as Error
      );
    }
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
  }

  async syncActivities(since?: Date): Promise<Activity[]> {
    try {
      await this.refreshTokenIfNeeded();
      return await this.withRetry(() => this.fetchActivities(since));
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to sync activities from ${this.name}`,
        this.name,
        'syncActivities',
        error as Error
      );
    }
  }

  async getActivity(id: string): Promise<Activity> {
    try {
      await this.refreshTokenIfNeeded();
      return await this.withRetry(() => this.fetchActivity(id));
    } catch (error) {
      throw new ActivityServiceError(
        `Failed to get activity from ${this.name}`,
        this.name,
        'getActivity',
        error as Error
      );
    }
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) break;
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    throw lastError;
  }

  protected normalizeActivityType(providerType: string): ActivityType {
    const normalized = providerType.toLowerCase();
    if (normalized.includes('run') || normalized.includes('running')) {
      if (normalized.includes('trail')) return 'trail_run';
      if (normalized.includes('treadmill')) return 'treadmill';
      if (normalized.includes('track')) return 'track';
      if (normalized.includes('race')) return 'race';
      return 'run';
    }
    if (normalized.includes('walk')) return 'walk';
    return 'other';
  }

  protected metersToKilometers(meters: number): number {
    return Math.round((meters / 1000) * 100) / 100;
  }

  protected calculatePace(distanceMeters: number, durationSeconds: number): number {
    if (distanceMeters === 0 || durationSeconds === 0) return 0;
    // Returns seconds per kilometer
    return (durationSeconds / (distanceMeters / 1000));
  }
}
