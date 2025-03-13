import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { stravaActivities } from "@shared/schema";
import type { InsertStravaActivity } from "@shared/schema";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

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
  // Ensure we're using HTTPS for Strava's security requirements
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  // For local development, use HTTP
  return "http://localhost:5000";
}

// Ensure the redirect URI matches exactly what's configured in Strava
const REDIRECT_URI = `${getAppDomain()}/api/auth/strava/callback`;

export function getStravaAuthUrl(state: string = ""): string {
  if (!process.env.STRAVA_CLIENT_ID) {
    throw new Error("STRAVA_CLIENT_ID is not configured");
  }

  // Add explicit approval_prompt and scope parameters
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "activity:read_all",
    state: state,
    approval_prompt: "auto"
  });

  console.log("Generated Strava auth URL with redirect URI:", REDIRECT_URI);
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  try {
    if (!process.env.STRAVA_CLIENT_ID || !process.env.STRAVA_CLIENT_SECRET) {
      throw new Error("Strava credentials not properly configured");
    }

    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code"
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("Error exchanging Strava code:", error);
    throw error instanceof Error ? error : new Error("Failed to exchange code");
  }
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  try {
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    };
  } catch (error) {
    console.error("Error refreshing Strava token:", error);
    throw error instanceof Error ? error : new Error("Failed to refresh token");
  }
}

export async function syncStravaActivities(userId: number, accessToken: string): Promise<void> {
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
      throw new Error(`Failed to fetch activities: ${response.statusText}`);
    }

    const activities = await response.json();

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
        console.log(`Inserted activity ${activity.id} for user ${userId}`);
      } catch (error) {
        console.error(`Failed to insert activity ${activity.id}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log(`Synced ${activities.length} activities for user ${userId}`);
  } catch (error) {
    console.error("Error syncing Strava activities:", error);
    throw error instanceof Error ? error : new Error("Failed to fetch activities");
  }
}