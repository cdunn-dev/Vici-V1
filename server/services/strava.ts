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

// Add type definitions for Strava API responses
interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    firstname?: string;
    lastname?: string;
  };
}

// Update the StravaActivity interface with additional fields
interface StravaActivity {
  id: number;
  name: string;
  description?: string;
  type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  start_latitude?: number;
  start_longitude?: number;
  // Additional fields
  gear_id?: string;
  device_name?: string;
  average_cadence?: number;
  average_temp?: number;
  suffer_score?: number;
  perceived_exertion?: number;
  elevation_high?: number;
  elevation_low?: number;
  start_address?: string;
  achievement_count?: number;
  kudos_count?: number;
  comment_count?: number;
  athlete_count?: number;
  photo_count?: number;
  device_watts?: boolean;
  has_heartrate?: boolean;
  map?: {
    summary_polyline?: string;
    polyline?: string;
    resource_state?: number;
  };
  laps?: Array<{
    lap_index: number;
    split_index: number;
    distance: number;
    elapsed_time: number;
    moving_time: number;
    start_date: string;
    average_speed: number;
    max_speed?: number;
    average_heartrate?: number;
    max_heartrate?: number;
    pace_zone?: number;
  }>;
  splits_metric?: Array<{
    distance: number;
    elapsed_time: number;
    elevation_difference: number;
    moving_time: number;
    split: number;
    average_speed: number;
    average_heartrate?: number;
    pace_zone?: number;
  }>;
}

// Rate limiting configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_WINDOW: 100,
  WINDOW_SIZE_MS: 15 * 60 * 1000, // 15 minutes
  REQUESTS: new Map<number, number[]>()
};

function checkRateLimit(userId: number): boolean {
  const now = Date.now();
  const requests = RATE_LIMIT.REQUESTS.get(userId) || [];

  // Clean up old requests
  const validRequests = requests.filter(time =>
    now - time < RATE_LIMIT.WINDOW_SIZE_MS
  );

  if (validRequests.length >= RATE_LIMIT.MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  validRequests.push(now);
  RATE_LIMIT.REQUESTS.set(userId, validRequests);
  return true;
}

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
      const errorText = await response.text();
      console.error('[Strava] Token exchange failed:', response.status, response.statusText, errorText);
      throw new StravaError(
        `${ERROR_MESSAGES.FAILED_EXCHANGE}: ${response.statusText}. Details: ${errorText}`,
        'AUTH_ERROR'
      );
    }

    const data = await response.json() as StravaTokenResponse;
    console.log('[Strava] Token exchange successful');

    // Validate response data
    if (!data.access_token || !data.refresh_token || !data.expires_at) {
      throw new StravaError('Invalid token response format', 'API_ERROR');
    }

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
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      throw new StravaError(ERROR_MESSAGES.MISSING_CLIENT_SECRET, 'CONFIG_ERROR');
    }

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
      const errorText = await response.text();
      console.error('[Strava] Token refresh failed:', response.status, response.statusText, errorText);
      throw new StravaError(
        `${ERROR_MESSAGES.FAILED_REFRESH}: ${response.statusText}. Details: ${errorText}`,
        'AUTH_ERROR'
      );
    }

    const data = await response.json() as StravaTokenResponse;
    console.log('[Strava] Token refresh successful');

    // Validate response data
    if (!data.access_token || !data.refresh_token || !data.expires_at) {
      throw new StravaError('Invalid token response format', 'API_ERROR');
    }

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

// Add at the top of the file after imports
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);

    // If rate limited, wait and retry
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1');
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchWithRetry(url, options, retries - 1);
      }
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

// Add this function to handle detailed activity fetching
async function fetchDetailedActivity(activityId: number, accessToken: string): Promise<StravaActivity> {
  const response = await fetchWithRetry(
    `${STRAVA_API_BASE}/activities/${activityId}?include_all_efforts=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Strava] Failed to fetch detailed activity ${activityId}:`, response.status, response.statusText, errorText);
    throw new StravaError(`Failed to fetch detailed activity: ${response.statusText}`, 'API_ERROR');
  }

  return await response.json();
}

export async function syncStravaActivities(userId: number, accessToken: string): Promise<void> {
  console.log('[Strava] Starting activity sync for user:', userId);

  try {
    if (!checkRateLimit(userId)) {
      throw new StravaError('Rate limit exceeded. Please try again later.', 'API_ERROR');
    }

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

    const response = await fetchWithRetry(
      `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Strava] Activities fetch failed:', response.status, response.statusText, errorText);
      throw new StravaError(
        `${ERROR_MESSAGES.FAILED_FETCH}: ${response.statusText}. Details: ${errorText}`,
        'API_ERROR'
      );
    }

    const activities = await response.json() as StravaActivity[];
    console.log(`[Strava] Retrieved ${activities.length} activities from API`);

    if (!Array.isArray(activities)) {
      console.error('[Strava] Invalid activities response:', activities);
      throw new StravaError(ERROR_MESSAGES.INVALID_RESPONSE, 'DATA_ERROR');
    }

    const processedActivities: InsertStravaActivity[] = [];
    const errors: Error[] = [];

    for (const activity of activities) {
      try {
        if (activity.type !== 'Run') {
          console.log('[Strava] Skipping non-running activity:', activity.id, activity.type);
          continue;
        }

        console.log(`[Strava] Fetching detailed data for activity ${activity.id}`);
        const detailedActivity = await fetchDetailedActivity(activity.id, accessToken);

        // Debug log the detailed activity data
        console.log('[Strava] Detailed activity data:', JSON.stringify({
          id: detailedActivity.id,
          has_heartrate: detailedActivity.has_heartrate,
          laps: detailedActivity.laps?.length,
          splits: detailedActivity.splits_metric?.length
        }));

        const heartrateZones = detailedActivity.has_heartrate ? calculateHeartRateZones({
          avgHeartrate: detailedActivity.average_heartrate || 0,
          maxHeartrate: detailedActivity.max_heartrate || 0
        }) : [];

        const paceZones = detailedActivity.splits_metric ? calculatePaceZones(
          detailedActivity.splits_metric.map(split => ({
            distance: split.distance,
            time: split.moving_time
          }))
        ) : [];

        const laps = detailedActivity.laps?.map(lap => ({
          lapIndex: lap.lap_index,
          splitIndex: lap.split_index,
          distance: lap.distance,
          elapsedTime: lap.elapsed_time,
          movingTime: lap.moving_time,
          startDate: new Date(lap.start_date).toISOString(),
          averageSpeed: lap.average_speed,
          maxSpeed: lap.max_speed || null,
          averageHeartrate: lap.average_heartrate || null,
          maxHeartrate: lap.max_heartrate || null,
          paceZone: lap.pace_zone || null
        }));

        const splitMetrics = detailedActivity.splits_metric?.map(split => ({
          distance: split.distance,
          elapsedTime: split.elapsed_time,
          elevationDifference: split.elevation_difference,
          movingTime: split.moving_time,
          split: split.split,
          averageSpeed: split.average_speed,
          averageHeartrate: split.average_heartrate || null,
          paceZone: split.pace_zone || null
        }));

        const insertActivity: InsertStravaActivity = {
          userId,
          stravaId: detailedActivity.id.toString(),
          name: detailedActivity.name,
          description: detailedActivity.description || null,
          type: detailedActivity.type,
          startDate: new Date(detailedActivity.start_date),
          distance: Math.round(detailedActivity.distance * 100) / 100,
          movingTime: detailedActivity.moving_time,
          elapsedTime: detailedActivity.elapsed_time,
          totalElevationGain: Math.round(detailedActivity.total_elevation_gain),
          averageSpeed: Math.round(detailedActivity.average_speed * 100) / 100,
          maxSpeed: Math.round(detailedActivity.max_speed * 100) / 100,
          averageHeartrate: detailedActivity.average_heartrate ? Math.round(detailedActivity.average_heartrate) : null,
          maxHeartrate: detailedActivity.max_heartrate ? Math.round(detailedActivity.max_heartrate) : null,
          startLatitude: detailedActivity.start_latitude?.toString() || null,
          startLongitude: detailedActivity.start_longitude?.toString() || null,
          gearId: detailedActivity.gear_id || null,
          deviceName: detailedActivity.device_name || null,
          averageCadence: detailedActivity.average_cadence ? Math.round(detailedActivity.average_cadence) : null,
          averageTemp: detailedActivity.average_temp ? Math.round(detailedActivity.average_temp) : null,
          sufferScore: detailedActivity.suffer_score || null,
          perceivedExertion: detailedActivity.perceived_exertion || null,
          elevationHigh: detailedActivity.elevation_high ? Math.round(detailedActivity.elevation_high) : null,
          elevationLow: detailedActivity.elevation_low ? Math.round(detailedActivity.elevation_low) : null,
          startAddress: detailedActivity.start_address || null,
          achievementCount: detailedActivity.achievement_count || null,
          kudosCount: detailedActivity.kudos_count || null,
          commentCount: detailedActivity.comment_count || null,
          athleteCount: detailedActivity.athlete_count || null,
          photoCount: detailedActivity.photo_count || null,
          deviceWatts: detailedActivity.device_watts || false,
          hasHeartrate: detailedActivity.has_heartrate || false,
          map: detailedActivity.map ? {
            summaryPolyline: detailedActivity.map.summary_polyline || '',
            resourceState: detailedActivity.map.resource_state || 1,
          } : null,
          laps: laps || [],
          splitMetrics: splitMetrics || [],
          heartrateZones: heartrateZones,
          paceZones: paceZones,
          workoutId: null
        };

        // Debug log the processed activity data
        console.log('[Strava] Processed activity data:', JSON.stringify({
          id: insertActivity.stravaId,
          hasHeartrate: insertActivity.hasHeartrate,
          heartrateZones: insertActivity.heartrateZones?.length,
          laps: insertActivity.laps?.length,
          splitMetrics: insertActivity.splitMetrics?.length
        }));

        processedActivities.push(insertActivity);
      } catch (error) {
        console.error('[Strava] Failed to process activity:', error);
        errors.push(error as Error);
      }
    }

    if (processedActivities.length > 0) {
      console.log('[Strava] Inserting activities:', processedActivities.length);
      await db.insert(stravaActivities).values(processedActivities);
      console.log('[Strava] Successfully inserted activities');
    }

    if (errors.length > 0) {
      console.error('[Strava] Encountered errors while processing activities:', errors);
    }

    console.log('[Strava] Activity sync completed');
  } catch (error) {
    console.error('[Strava] Error during activity sync:', error);
    throw error;
  }
}

// Helper function to calculate heart rate zones
function calculateHeartRateZones(heartRate: { avgHeartrate: number; maxHeartrate: number }) {
  // Using standard heart rate zone calculations
  return [
    { zone: 1, min: 0, max: Math.round(heartRate.maxHeartrate * 0.6) },
    { zone: 2, min: Math.round(heartRate.maxHeartrate * 0.6), max: Math.round(heartRate.maxHeartrate * 0.7) },
    { zone: 3, min: Math.round(heartRate.maxHeartrate * 0.7), max: Math.round(heartRate.maxHeartrate * 0.8) },
    { zone: 4, min: Math.round(heartRate.maxHeartrate * 0.8), max: Math.round(heartRate.maxHeartrate * 0.9) },
    { zone: 5, min: Math.round(heartRate.maxHeartrate * 0.9), max: heartRate.maxHeartrate }
  ];
}

// Helper function to calculate pace zones
function calculatePaceZones(splits: Array<{ distance: number; time: number }>) {
  const paces = splits.map(split => (split.time / 60) / (split.distance / 1609.34));
  const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;

  return [
    { zone: 1, description: 'Recovery', pace: avgPace * 1.2 },
    { zone: 2, description: 'Easy', pace: avgPace * 1.1 },
    { zone: 3, description: 'Steady', pace: avgPace },
    { zone: 4, description: 'Tempo', pace: avgPace * 0.9 },
    { zone: 5, description: 'Interval', pace: avgPace * 0.85 }
  ];
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
      // Fetch athlete profile
      const response = await fetchWithRetry('https://www.strava.com/api/v3/athlete', {
        headers: { Authorization: `Bearer ${this.tokens!.accessToken}` }
      });

      if (!response.ok) {
        throw new Error(`Strava API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[StravaService] Raw athlete data:', {
        ...data,
        tokens: 'REDACTED'
      });

      // Transform gender from Strava format to our schema format
      let normalizedGender = data.sex;
      if (normalizedGender === 'M') normalizedGender = 'male';
      if (normalizedGender === 'F') normalizedGender = 'female';

      // Extract personal bests from activities
      const personalBests = await this.analyzePersonalBests(this.userId);

      // Analyze running profile
      const runningProfile = await this.analyzeRunningProfile(this.userId);

      const profile: AthleteProfile = {
        gender: normalizedGender || null,
        birthday: data.birthday ? new Date(data.birthday).toISOString() : null,
        measurementPreference: data.measurement_preference || 'miles',
        weight: data.weight || null,
        profile: {
          firstName: data.firstname || '',
          lastName: data.lastname || '',
          city: data.city || null,
          state: data.state || null,
          country: data.country || null,
          profilePicture: data.profile_medium || null
        },
        personalBests: personalBests.map(pb => ({
          ...pb,
          // Ensure date is in ISO format
          date: new Date(pb.date).toISOString()
        })),
        stravaStats: {
          totalDistance: Math.round(data.total_running_distance || 0),
          totalRuns: data.total_runs || 0,
          recentRaces: [],
          predictedRaces: []
        },
        runningExperience: {
          level: runningProfile.fitnessLevel,
          weeklyMileage: runningProfile.weeklyMileage,
          preferredRunDays: runningProfile.preferredRunDays,
          commonWorkoutTypes: runningProfile.commonWorkoutTypes,
          fitnessLevel: runningProfile.fitnessLevel
        }
      };

      console.log('[StravaService] Processed profile:', {
        ...profile,
        tokens: 'REDACTED'
      });

      return profile;
    } catch (error) {
      console.error('[StravaService] Error fetching athlete profile:', error);
      throw error;
    }
  }

  private async analyzePersonalBests(userId: number): Promise<Array<{
    distance: string;
    time: string;
    date: string;
  }>> {
    // Get activities for analysis
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

    // Track both standard race distances and best efforts
    const personalBests = new Map<string, { time: number; date: string }>();
    const raceDistances = {
      '5K': 5000,
      '10K': 10000,
      'Half Marathon': 21097.5,
      'Marathon': 42195
    };

    // Process each activity
    for (const activity of activities) {
      // Check standard race distances
      for (const [raceName, raceDistance] of Object.entries(raceDistances)) {
        if (Math.abs(activity.distance - raceDistance) / raceDistance <= 0.01) {
          const time = activity.movingTime;
          const existingPB = personalBests.get(raceName);

          if (!existingPB || time < existingPB.time) {
            personalBests.set(raceName, {
              time,
              date: activity.startDate.toISOString()
            });
          }
        }
      }

      // Process best efforts from split metrics if available
      if (activity.splitMetrics) {
        for (const split of activity.splitMetrics) {
          // Common racing distances in meters
          const distances = {
            '1K': 1000,
            '1 Mile': 1609.34,
            '5K': 5000,
            '10K': 10000
          };

          for (const [effortName, effortDistance] of Object.entries(distances)) {
            if (Math.abs(split.distance - effortDistance) / effortDistance <= 0.01) {
              const time = split.elapsedTime;
              const existingPB = personalBests.get(effortName);

              if (!existingPB || time < existingPB.time) {
                personalBests.set(effortName, {
                  time,
                  date: activity.startDate.toISOString()
                });
              }
            }
          }
        }
      }
    }

    // Convert to array and format times
    return Array.from(personalBests.entries()).map(([distance, record]) => ({
      distance,
      time: this.formatTime(record.time),
      date: record.date
    }));
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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