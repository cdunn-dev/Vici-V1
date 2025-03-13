import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { stravaActivities } from "@shared/schema";
import type { InsertStravaActivity } from "@shared/schema";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// Standard error messages for consistent error handling
const ERRORS = {
  EXCHANGE_CODE: "Failed to exchange code",
  REFRESH_TOKEN: "Failed to refresh token",
  FETCH_ACTIVITIES: "Failed to fetch activities",
  CLIENT_ID_MISSING: "STRAVA_CLIENT_ID is not configured",
  CLIENT_SECRET_MISSING: "STRAVA_CLIENT_SECRET is not configured",
} as const;

export interface StravaAuthOptions {
  scope?: string[];
  state?: string;
}

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function getAppDomain() {
  // For Replit deployments, use the workspace URL
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    const domain = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
    console.log('Using Replit domain:', domain);
    return `https://${domain}`;
  }
  // For local development
  console.log('Using localhost domain');
  return "http://localhost:5000";
}

// Generate the OAuth redirect URI
const REDIRECT_URI = `${getAppDomain()}/api/auth/strava/callback`;

export function getStravaAuthUrl(state: string = ""): string {
  if (!process.env.STRAVA_CLIENT_ID) {
    console.error('Missing STRAVA_CLIENT_ID environment variable');
    throw new Error(ERRORS.CLIENT_ID_MISSING);
  }

  console.log('Generating Strava auth URL with:');
  console.log('- Client ID:', process.env.STRAVA_CLIENT_ID);
  console.log('- Redirect URI:', REDIRECT_URI);
  console.log('- State:', state);

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "activity:read_all",
    state: state,
    approval_prompt: "auto"
  });

  const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log('Generated auth URL:', authUrl);
  return authUrl;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  try {
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      console.error('Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET environment variable');
      throw new Error(ERRORS.CLIENT_SECRET_MISSING);
    }

    console.log('Exchanging Strava code:', code);

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
      console.error('Strava token exchange failed:', response.status, response.statusText);
      throw new Error(ERRORS.EXCHANGE_CODE);
    }

    const data = await response.json();
    console.log('Strava token exchange successful:', data);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("Error exchanging Strava code:", error);
    throw new Error(ERRORS.EXCHANGE_CODE);
  }
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  try {
    console.log('Refreshing Strava token');
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
      console.error('Strava token refresh failed:', response.status, response.statusText);
      throw new Error(ERRORS.REFRESH_TOKEN);
    }

    const data = await response.json();
    console.log('Strava token refresh successful:', data);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("Error refreshing Strava token:", error);
    throw new Error(ERRORS.REFRESH_TOKEN);
  }
}

export async function syncStravaActivities(userId: number, accessToken: string): Promise<void> {
  try {
    console.log('Syncing Strava activities for user:', userId);
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
      console.error('Failed to fetch Strava activities:', response.status, response.statusText);
      throw new Error(ERRORS.FETCH_ACTIVITIES);
    }

    const activities = await response.json();
    if (!Array.isArray(activities)) {
      console.error('Invalid Strava activities response:', activities);
      throw new Error(ERRORS.FETCH_ACTIVITIES);
    }

    console.log('Fetched', activities.length, 'Strava activities');
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
        console.log('Inserted Strava activity:', activity.id);
      } catch (error) {
        console.error(`Failed to insert activity ${activity.id}:`, error);
        // Continue with next activity
      }
    }
  } catch (error) {
    console.error("Error syncing Strava activities:", error);
    throw new Error(ERRORS.FETCH_ACTIVITIES);
  }
}