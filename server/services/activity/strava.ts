import { BaseActivityService } from './base';
import { Activity, ProviderCredentials, AthleteProfile } from './types';
import axios from 'axios';
import { exchangeStravaCode, refreshStravaToken, syncStravaActivities } from '../strava';
import { storage } from '../../storage';
import { db } from '../../db';
import { StravaError, ERROR_MESSAGES } from '../errors';

interface StravaTokens extends ProviderCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class StravaService extends BaseActivityService {
  private clientId: string;
  private clientSecret: string;
  private userId: number;
  private syncInterval: NodeJS.Timeout | null = null;
  private static readonly SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

  constructor(userId: number) {
    super('strava');
    this.clientId = process.env.STRAVA_CLIENT_ID || '';
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET || '';
    this.userId = userId;

    if (!this.clientId || !this.clientSecret) {
      throw new StravaError(ERROR_MESSAGES.MISSING_CLIENT_SECRET, 'CONFIG_ERROR');
    }

    // Start automatic sync when service is initialized
    this.startAutoSync();
  }

  private startAutoSync() {
    // Clear any existing sync interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Start new sync interval
    this.syncInterval = setInterval(async () => {
      try {
        console.log('[StravaService] Starting automatic sync for user:', this.userId);
        const user = await storage.getUser(this.userId);
        if (user?.stravaTokens) {
          await syncStravaActivities(this.userId, user.stravaTokens.accessToken);
        }
      } catch (error) {
        console.error('[StravaService] Auto-sync failed:', error);
      }
    }, StravaService.SYNC_INTERVAL);
  }

  async stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async cleanup() {
    await this.stopAutoSync();
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
      const newTokens = await refreshStravaToken(tokens.refreshToken);
      this.credentials = newTokens;
    }
  }

  async getAthleteProfile(): Promise<AthleteProfile> {
    if (!this.credentials) throw new Error('Not connected to Strava');
    await this.refreshTokenIfNeeded();

    try {
      const response = await axios.get('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${this.credentials.accessToken}` }
      });

      return {
        gender: response.data.sex,
        birthday: response.data.birthday,
        measurementPreference: response.data.measurement_preference,
        weight: response.data.weight,
        profile: {
          firstName: response.data.firstname,
          lastName: response.data.lastname,
          city: response.data.city,
          state: response.data.state,
          country: response.data.country
        }
      };
    } catch (error) {
      console.error('Error fetching athlete profile:', error);
      throw error;
    }
  }

  async analyzeRunningExperience(): Promise<{
    level: string;
    weeklyMileage: number;
    preferredRunDays: string[];
    commonWorkoutTypes: string[];
  }> {
    if (!this.credentials) throw new Error('Not connected to Strava');
    await this.refreshTokenIfNeeded();

    try {
      // Get last 6 months of activities
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const response = await axios.get(
        `https://www.strava.com/api/v3/athlete/activities`, {
          headers: { Authorization: `Bearer ${this.credentials.accessToken}` },
          params: {
            after: Math.floor(sixMonthsAgo.getTime() / 1000),
            per_page: 200
          }
        }
      );

      const activities = response.data;

      // Calculate weekly stats
      const weeklyMileages: number[] = [];
      const runDays = new Set<string>();
      const workoutTypes = new Map<string, number>();

      activities.forEach((activity: any) => {
        if (activity.type === 'Run') {
          // Track weekly mileage
          const week = Math.floor(new Date(activity.start_date).getTime() / (7 * 24 * 60 * 60 * 1000));
          weeklyMileages[week] = (weeklyMileages[week] || 0) + activity.distance / 1609.34; // Convert to miles

          // Track preferred run days
          const day = new Date(activity.start_date).toLocaleDateString('en-US', { weekday: 'lowercase' });
          runDays.add(day);

          // Track workout types based on name patterns
          const name = activity.name.toLowerCase();
          if (name.includes('tempo') || name.includes('threshold')) {
            workoutTypes.set('tempo', (workoutTypes.get('tempo') || 0) + 1);
          } else if (name.includes('interval') || name.includes('speed')) {
            workoutTypes.set('interval', (workoutTypes.get('interval') || 0) + 1);
          } else if (name.includes('long')) {
            workoutTypes.set('long run', (workoutTypes.get('long run') || 0) + 1);
          } else {
            workoutTypes.set('easy', (workoutTypes.get('easy') || 0) + 1);
          }
        }
      });

      // Calculate average weekly mileage
      const avgWeeklyMileage = weeklyMileages.reduce((sum, miles) => sum + miles, 0) / weeklyMileages.length || 0;

      // Determine experience level based on mileage and workout variety
      let level = 'beginner';
      if (avgWeeklyMileage > 40 && workoutTypes.size >= 3) {
        level = 'advanced';
      } else if (avgWeeklyMileage > 20 && workoutTypes.size >= 2) {
        level = 'intermediate';
      }

      // Get most common workout types
      const sortedWorkouts = Array.from(workoutTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

      return {
        level,
        weeklyMileage: Math.round(avgWeeklyMileage),
        preferredRunDays: Array.from(runDays),
        commonWorkoutTypes: sortedWorkouts
      };
    } catch (error) {
      console.error('Error analyzing running experience:', error);
      throw error;
    }
  }

  protected async fetchActivities(since?: Date): Promise<Activity[]> {
    if (!this.credentials) throw new Error('Not connected to Strava');
    await this.refreshTokenIfNeeded();

    try {
      await syncStravaActivities(this.userId, this.credentials.accessToken);
      return []; // Activities are synced to database, no need to return them here
    } catch (error) {
      console.error('Error syncing Strava activities:', error);
      throw error;
    }
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