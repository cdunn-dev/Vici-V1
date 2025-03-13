import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { stravaActivities } from "@shared/schema";
import type { InsertStravaActivity } from "@shared/schema";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

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

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "activity:read_all",
    state: state,
    approval_prompt: "auto"
  });

  const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log('[Strava] Generated auth URL with redirect URI:', REDIRECT_URI);

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