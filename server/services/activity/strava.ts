import { BaseActivityService } from './base';
import { Activity, ProviderCredentials } from './types';
import axios from 'axios';

interface StravaTokens extends ProviderCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class StravaService extends BaseActivityService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    super('strava');
    this.clientId = process.env.STRAVA_CLIENT_ID || '';
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Strava credentials not configured');
    }
  }

  protected async validateCredentials(credentials: StravaTokens): Promise<boolean> {
    try {
      const response = await axios.get('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` }
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  protected async refreshTokenIfNeeded(): Promise<void> {
    if (!this.credentials) return;

    const tokens = this.credentials as StravaTokens;
    if (Date.now() >= tokens.expiresAt * 1000) {
      const response = await axios.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken
      });

      this.credentials = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: response.data.expires_at
      };
    }
  }

  protected async fetchActivities(since?: Date): Promise<Activity[]> {
    if (!this.credentials) throw new Error('Not connected to Strava');

    const params = new URLSearchParams();
    if (since) {
      params.append('after', Math.floor(since.getTime() / 1000).toString());
    }

    const response = await axios.get(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${this.credentials.accessToken}` }
      }
    );

    return response.data.map(this.transformStravaActivity.bind(this));
  }

  protected async fetchActivity(id: string): Promise<Activity> {
    if (!this.credentials) throw new Error('Not connected to Strava');

    const response = await axios.get(
      `https://www.strava.com/api/v3/activities/${id}`,
      {
        headers: { Authorization: `Bearer ${this.credentials.accessToken}` }
      }
    );

    return this.transformStravaActivity(response.data);
  }

  private transformStravaActivity(stravaActivity: any): Activity {
    return {
      id: stravaActivity.id.toString(),
      source: 'strava',
      type: this.normalizeActivityType(stravaActivity.type),
      startTime: new Date(stravaActivity.start_date),
      endTime: new Date(stravaActivity.start_date_local),
      distance: stravaActivity.distance, // meters
      duration: stravaActivity.moving_time, // seconds
      elevation: stravaActivity.total_elevation_gain ? {
        gain: stravaActivity.total_elevation_gain,
        loss: stravaActivity.total_elevation_gain // Strava doesn't provide loss
      } : undefined,
      pace: {
        average: this.calculatePace(stravaActivity.distance, stravaActivity.moving_time),
        best: stravaActivity.best_efforts?.[0]?.average_speed || 0
      },
      heartRate: stravaActivity.average_heartrate ? {
        average: stravaActivity.average_heartrate,
        max: stravaActivity.max_heartrate
      } : undefined,
      calories: stravaActivity.calories,
      perceivedEffort: stravaActivity.perceived_exertion,
      notes: stravaActivity.description,
      originalData: stravaActivity
    };
  }
}
