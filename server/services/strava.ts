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
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return "http://localhost:5000";
}

const REDIRECT_URI = `${getAppDomain()}/api/auth/strava/callback`;

export function getStravaAuthUrl(options: StravaAuthOptions = {}): string {
  if (!process.env.STRAVA_CLIENT_ID) {
    throw new Error("STRAVA_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: options.scope?.join(',') || "activity:read_all",
    state: options.state || "",
    approval_prompt: "auto"
  });

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
    throw error instanceof Error ? error : new Error("Failed to exchange Strava code");
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
    throw error instanceof Error ? error : new Error("Failed to refresh Strava token");
  }
}

export async function syncStravaActivities(userId: number, accessToken: string): Promise<void> {
  try {
    // Get the latest activity in our database
    const [latestActivity] = await db
      .select()
      .from(stravaActivities)
      .where(eq(stravaActivities.userId, userId))
      .orderBy(desc(stravaActivities.startDate))
      .limit(1);

    // If we have activities, only fetch newer ones
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

    // Process and save new activities
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
          map: activity.map?.summary_polyline ? {
            summaryPolyline: activity.map.summary_polyline,
            resourceState: activity.map.resource_state
          } : null,
        };

        await db.insert(stravaActivities).values(newActivity).execute();
        console.log(`Inserted activity ${activity.id} for user ${userId}`);
      } catch (error) {
        // Log but don't fail if a single activity insert fails
        if (error instanceof Error) {
          console.error(`Failed to insert activity ${activity.id}:`, error.message);
        } else {
          console.error(`Failed to insert activity ${activity.id}`);
        }
      }
    }

    console.log(`Synced ${activities.length} activities for user ${userId}`);
  } catch (error) {
    // Re-throw any unexpected errors with proper error message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred while syncing activities");
  }
}