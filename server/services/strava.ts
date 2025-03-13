import { ActivityProvider, ProviderCredentials, Activity, AthleteProfile } from './activity/types';
import fetch from 'node-fetch';
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { stravaActivities } from "@shared/schema";
import type { InsertStravaActivity } from "@shared/schema";
import { storage } from "../storage";

// Constants
const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// Update getAppDomain to handle Replit.dev domains
function getAppDomain() {
  // Use environment variable if set (for production)
  if (process.env.APP_DOMAIN) {
    console.log('[Strava Domain] Using APP_DOMAIN:', process.env.APP_DOMAIN);
    return process.env.APP_DOMAIN;
  }

  // For development/preview, use Replit.dev domain
  const replId = process.env.REPL_ID;

  if (!replId) {
    console.log('[Strava Domain] Missing Replit identifiers, using localhost');
    return 'localhost:5000';
  }

  // Construct the Replit.dev domain
  const domain = `${replId}-00-3tg7kax6mu3y4.riker.replit.dev`;
  console.log('[Strava Domain] Using Replit.dev domain:', domain);
  return domain;
}

const REDIRECT_URI = `https://${getAppDomain()}/api/auth/strava/callback`;

// Update getStravaAuthUrl to be more explicit with scopes and parameters
export function getStravaAuthUrl(state: string = ""): string {
  console.log('[Strava Auth] Generating auth URL');

  if (!process.env.STRAVA_CLIENT_ID) {
    console.error('[Strava Auth] Missing client ID');
    throw new StravaError(ERROR_MESSAGES.MISSING_CLIENT_ID, 'CONFIG_ERROR');
  }

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "read,activity:read_all,profile:read_all",
    state: state,
    approval_prompt: "auto"
  });

  const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log('[Strava Auth] Generated auth URL:', authUrl);
  console.log('[Strava Auth] Using redirect URI:', REDIRECT_URI);
  return authUrl;
}

// Error handling
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

const ERROR_MESSAGES = {
  MISSING_CLIENT_ID: 'Strava client ID is not configured',
  MISSING_CLIENT_SECRET: 'Strava client secret is not configured',
  FAILED_EXCHANGE: 'Failed to exchange authorization code',
  FAILED_REFRESH: 'Failed to refresh access token',
  FAILED_FETCH: 'Failed to fetch activities',
  INVALID_RESPONSE: 'Invalid response from Strava API',
  NOT_CONNECTED: 'Not connected to Strava'
} as const;


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
      throw new StravaError(
        `${ERROR_MESSAGES.FAILED_EXCHANGE}: ${response.statusText}`,
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

// Update syncStravaActivities to properly handle types and add debug logging
export async function syncStravaActivities(userId: number, accessToken: string): Promise<void> {
  console.log('[Strava] Starting activity sync for user:', userId);

  try {
    // Get latest synced activity
    const [latestActivity] = await db
      .select()
      .from(stravaActivities)
      .where(eq(stravaActivities.userId, userId))
      .orderBy(desc(stravaActivities.startDate))
      .limit(1);

    // Configure pagination and time filtering
    const params = new URLSearchParams({
      per_page: "50",
      page: "1"
    });

    if (latestActivity) {
      const after = Math.floor(new Date(latestActivity.startDate).getTime() / 1000);
      params.append("after", after.toString());
    }

    console.log('[Strava] Fetching activities with params:', params.toString());

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
    console.log(`[Strava] Retrieved ${activities.length} activities from API`);

    if (!Array.isArray(activities)) {
      console.error('[Strava] Invalid activities response:', activities);
      throw new StravaError(ERROR_MESSAGES.INVALID_RESPONSE, 'DATA_ERROR');
    }

    for (const activity of activities) {
      try {
        // Only process running activities
        if (activity.type !== 'Run') {
          console.log('[Strava] Skipping non-running activity:', activity.id, activity.type);
          continue;
        }

        // Check if activity already exists
        const [existingActivity] = await db
          .select()
          .from(stravaActivities)
          .where(eq(stravaActivities.stravaId, activity.id.toString()))
          .limit(1);

        if (existingActivity) {
          console.log('[Strava] Activity already exists:', activity.id);
          continue;
        }

        // Convert the start date string to a Date object for proper formatting
        const startDate = new Date(activity.start_date);

        // Prepare activity data with proper type conversions
        const insertActivity = {
          userId,
          stravaId: activity.id.toString(),
          name: activity.name,
          type: activity.type,
          startDate,
          distance: Math.round(activity.distance * 100) / 100,
          movingTime: activity.moving_time,
          elapsedTime: activity.elapsed_time,
          totalElevationGain: Math.round(activity.total_elevation_gain),
          averageSpeed: Math.round(activity.average_speed * 100) / 100,
          maxSpeed: Math.round(activity.max_speed * 100) / 100,
          averageHeartrate: activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
          maxHeartrate: activity.max_heartrate ? Math.round(activity.max_heartrate) : null,
          startLatitude: activity.start_latitude?.toString() || null,
          startLongitude: activity.start_longitude?.toString() || null,
          mapPolyline: activity.map?.summary_polyline || null,
        };

        // Insert the activity
        await db.insert(stravaActivities).values(insertActivity);
        console.log('[Strava] Successfully inserted activity:', activity.id);
      } catch (error) {
        console.error('[Strava] Failed to insert activity:', error);
        // Continue with next activity even if one fails
      }
    }

    console.log('[Strava] Activity sync completed');
  } catch (error) {
    console.error('[Strava] Error during activity sync:', error);
    throw error;
  }
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class StravaService {
  private clientId: string;
  private clientSecret: string;
  private userId: number;
  private tokens?: ProviderCredentials;

  constructor(userId: number) {
    console.log('[StravaService] Initializing for user:', userId);
    this.clientId = process.env.STRAVA_CLIENT_ID || '';
    this.clientSecret = process.env.STRAVA_CLIENT_SECRET || '';
    this.userId = userId;

    if (!this.clientId || !this.clientSecret) {
      throw new StravaError(ERROR_MESSAGES.MISSING_CLIENT_SECRET, 'CONFIG_ERROR');
    }
  }

  private async refreshTokenIfNeeded() {
    try {
      if (!this.tokens) {
        console.log('[StravaService] Fetching tokens from storage for user:', this.userId);
        const user = await storage.getUser(this.userId);
        if (!user?.stravaTokens) {
          throw new StravaError(ERROR_MESSAGES.NOT_CONNECTED, 'AUTH_ERROR');
        }
        this.tokens = user.stravaTokens;
      }

      if (Date.now() >= this.tokens.expiresAt * 1000) {
        console.log('[StravaService] Refreshing expired token');
        const newTokens = await refreshStravaToken(this.tokens.refreshToken);
        this.tokens = newTokens;
        await storage.updateUser(this.userId, { stravaTokens: newTokens });
      }
    } catch (error) {
      console.error('[StravaService] Token refresh error:', error);
      if (error instanceof StravaError) throw error;
      throw new StravaError(ERROR_MESSAGES.FAILED_REFRESH, 'AUTH_ERROR', error instanceof Error ? error : undefined);
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

  async analyzeRunningProfile(userId: number): Promise<{
    weeklyMileage: number;
    preferredRunDays: string[];
    fitnessLevel: string;
    commonWorkoutTypes: string[];
  }> {
    try {
      // Get last 4 weeks of activities
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const activities = await db
        .select()
        .from(stravaActivities)
        .where(
          and(
            eq(stravaActivities.userId, userId),
            eq(stravaActivities.type, "Run")
          )
        )
        .orderBy(desc(stravaActivities.startDate));

      // Calculate weekly stats
      const weeklyMileages: number[] = [];
      const runDays = new Set<string>();
      const workoutTypes = new Map<string, number>();

      let totalMileage = 0;
      let activityCount = 0;

      for (const activity of activities) {
        const activityDate = new Date(activity.startDate);
        if (activityDate >= fourWeeksAgo) {
          // Convert meters to miles and add to total
          const miles = activity.distance / 1609.34;
          totalMileage += miles;
          activityCount++;

          // Track run days
          const day = activityDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
          runDays.add(day);

          // Analyze workout type from name
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
      }

      // Calculate average weekly mileage
      const avgWeeklyMileage = totalMileage / 4; // 4 weeks

      // Determine fitness level based on weekly mileage and workout variety
      let fitnessLevel = 'beginner';
      if (avgWeeklyMileage > 40 && workoutTypes.size >= 3) {
        fitnessLevel = 'advanced';
      } else if (avgWeeklyMileage > 20 && workoutTypes.size >= 2) {
        fitnessLevel = 'intermediate';
      }

      // Get most common workout types
      const sortedWorkouts = Array.from(workoutTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type);

      return {
        weeklyMileage: Math.round(avgWeeklyMileage),
        preferredRunDays: Array.from(runDays),
        fitnessLevel,
        commonWorkoutTypes: sortedWorkouts
      };
    } catch (error) {
      console.error('Error analyzing running profile:', error);
      throw error;
    }
  }
}