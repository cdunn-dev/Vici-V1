import { ActivityProvider, ProviderCredentials, Activity, AthleteProfile } from './activity/types';
import fetch from 'node-fetch';
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { stravaActivities } from "@shared/schema";
import type { InsertStravaActivity } from "@shared/schema";

// Standardized error categories for Strava operations
export class StravaError extends Error {
  constructor(
    message: string,
    public readonly code: keyof typeof ERROR_CODES,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'StravaError';
  }
}

const ERROR_CODES = {
  CONFIG_ERROR: 'Configuration error',
  AUTH_ERROR: 'Authentication error',
  API_ERROR: 'API error',
  DATA_ERROR: 'Data processing error'
} as const;

// Standard error messages for consistent error handling
const ERROR_MESSAGES = {
  MISSING_CLIENT_ID: 'Strava client ID is not configured',
  MISSING_CLIENT_SECRET: 'Strava client secret is not configured',
  FAILED_EXCHANGE: 'Failed to exchange authorization code',
  FAILED_REFRESH: 'Failed to refresh access token',
  FAILED_FETCH: 'Failed to fetch activities',
  INVALID_RESPONSE: 'Invalid response from Strava API'
} as const;

function getAppDomain() {
  // Use the correct Replit domain format
  const domain = 'b69d20e7-bda1-4cf0-b59c-eedcc77485c7-00-3tg7kax6mu3y4.riker.replit.dev';
  console.log('[Strava] Using Replit domain:', domain);
  return `https://${domain}`;
}

const REDIRECT_URI = `${getAppDomain()}/api/auth/strava/callback`;

export function getStravaAuthUrl(state: string = ""): string {
  console.log('[Strava] Generating auth URL');

  if (!process.env.STRAVA_CLIENT_ID) {
    console.error('[Strava] Missing client ID');
    throw new StravaError(ERROR_MESSAGES.MISSING_CLIENT_ID, 'CONFIG_ERROR');
  }

  // Add more granular scopes to ensure proper permissions
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "read,activity:read_all,profile:read_all",
    state: state,
    approval_prompt: "force" // Force approval screen to ensure proper scope acceptance
  });

  const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log('[Strava] Generated auth URL with redirect URI:', REDIRECT_URI);
  console.log('[Strava] Full auth URL:', authUrl);

  return authUrl;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  console.log('[Strava] Exchanging authorization code');

  try {
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      console.error('[Strava] Missing credentials');
      throw new StravaError(ERROR_MESSAGES.MISSING_CLIENT_SECRET, 'CONFIG_ERROR');
    }

    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code"
      }),
    });

    if (!response.ok) {
      console.error('[Strava] Token exchange failed:', response.status, response.statusText);
      const errorData = await response.json().catch(() => ({})); // Try to get error details
      throw new StravaError(
        `${ERROR_MESSAGES.FAILED_EXCHANGE}: ${response.statusText} - ${JSON.stringify(errorData)}`,
        'AUTH_ERROR'
      );
    }

    const data = await response.json();
    console.log('[Strava] Token exchange successful');

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    if (error instanceof StravaError) throw error;

    console.error('[Strava] Error during code exchange:', error);
    throw new StravaError(
      ERROR_MESSAGES.FAILED_EXCHANGE,
      'AUTH_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  console.log('[Strava] Refreshing access token');

  try {
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error('[Strava] Token refresh failed:', response.status, response.statusText);
      throw new StravaError(
        `${ERROR_MESSAGES.FAILED_REFRESH}: ${response.statusText}`,
        'AUTH_ERROR'
      );
    }

    const data = await response.json();
    console.log('[Strava] Token refresh successful');

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    if (error instanceof StravaError) throw error;

    console.error('[Strava] Error during token refresh:', error);
    throw new StravaError(
      ERROR_MESSAGES.FAILED_REFRESH,
      'AUTH_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

export async function syncStravaActivities(userId: number, accessToken: string): Promise<void> {
  console.log('[Strava] Starting activity sync for user:', userId);

  try {
    const [latestActivity] = await db
      .select()
      .from(stravaActivities)
      .where(eq(stravaActivities.userId, userId))
      .orderBy(desc(stravaActivities.startDate))
      .limit(1);

    const params = new URLSearchParams();
    if (latestActivity) {
      const after = Math.floor(new Date(latestActivity.startDate).getTime() / 1000);
      params.append("after", after.toString());
    }

    const response = await fetch(
      `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error('[Strava] Activities fetch failed:', response.status, response.statusText);
      throw new StravaError(
        `${ERROR_MESSAGES.FAILED_FETCH}: ${response.statusText}`,
        'API_ERROR'
      );
    }

    const activities = await response.json();
    if (!Array.isArray(activities)) {
      console.error('[Strava] Invalid activities response:', activities);
      throw new StravaError(ERROR_MESSAGES.INVALID_RESPONSE, 'DATA_ERROR');
    }

    console.log(`[Strava] Processing ${activities.length} activities`);

    for (const activity of activities) {
      try {
        const startDate = new Date(activity.start_date);
        const newActivity: InsertStravaActivity = {
          userId,
          stravaId: activity.id.toString(),
          name: activity.name,
          type: activity.type,
          startDate: startDate.toISOString(),
          distance: activity.distance,
          movingTime: activity.moving_time,
          elapsedTime: activity.elapsed_time,
          totalElevationGain: activity.total_elevation_gain,
          averageSpeed: activity.average_speed,
          maxSpeed: activity.max_speed,
          averageHeartrate: activity.average_heartrate,
          maxHeartrate: activity.max_heartrate,
          startLatitude: activity.start_latitude?.toString(),
          startLongitude: activity.start_longitude?.toString(),
          mapPolyline: activity.map?.summary_polyline || null,
        };

        await db.insert(stravaActivities).values(newActivity).execute();
        console.log('[Strava] Inserted activity:', activity.id);
      } catch (error) {
        console.error('[Strava] Failed to insert activity:', error);
        // Continue with next activity
      }
    }

    console.log('[Strava] Activity sync completed');
  } catch (error) {
    if (error instanceof StravaError) throw error;

    console.error('[Strava] Error during activity sync:', error);
    throw new StravaError(
      ERROR_MESSAGES.FAILED_FETCH,
      'API_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}

export interface StravaAuthOptions {
  scope?: string[];
  state?: string;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export class StravaService {
  private clientId: string;
  private clientSecret: string;
  private userId: number;
  private tokens?: ProviderCredentials;

  constructor(userId: number) {
    this.clientId = process.env.STRAVA_CLIENT_ID || '';
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET || '';
    this.userId = userId;

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Strava credentials not configured');
    }
  }

  private async refreshTokenIfNeeded() {
    if (!this.tokens) {
      // Get tokens from storage
      const user = await storage.getUser(this.userId);
      if (!user?.stravaTokens) {
        throw new Error('Not connected to Strava');
      }
      this.tokens = user.stravaTokens;
    }

    // Check if token needs refresh
    if (Date.now() >= this.tokens.expiresAt * 1000) {
      const newTokens = await refreshStravaToken(this.tokens.refreshToken);
      this.tokens = newTokens;
      // Update user's tokens in storage
      await storage.updateUser(this.userId, { stravaTokens: newTokens });
    }
  }

  async getAthleteProfile(): Promise<AthleteProfile> {
    await this.refreshTokenIfNeeded();

    try {
      const response = await fetch('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${this.tokens!.accessToken}` }
      });

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        gender: data.sex,
        birthday: data.birthday,
        measurementPreference: data.measurement_preference,
        weight: data.weight,
        profile: {
          firstName: data.firstname,
          lastName: data.lastname,
          city: data.city,
          state: data.state,
          country: data.country
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
    await this.refreshTokenIfNeeded();

    try {
      // Get last 6 months of activities
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(sixMonthsAgo.getTime() / 1000)}&per_page=200`,
        {
          headers: { Authorization: `Bearer ${this.tokens!.accessToken}` }
        }
      );

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.statusText}`);
      }

      const activities = await response.json();

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
}

// Export other existing functions
export {
  getStravaAuthUrl,
  exchangeStravaCode,
  refreshStravaToken,
  syncStravaActivities,
  StravaService
};