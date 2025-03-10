import axios from "axios";
import { storage } from "../storage";
import { db } from "../db";
import { eq, desc, and } from "drizzle-orm";
import { stravaActivities, workouts, trainingPlans } from "@shared/schema";
import type { StravaActivity, InsertStravaActivity } from "@shared/schema";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

// Use VITE_ prefix for client ID to match frontend
const STRAVA_CLIENT_ID = process.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

// Get the correct domain based on environment
function getAppDomain() {
  // Check for both Replit domains
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
  }
  return "localhost:5000";
}

const REDIRECT_URI = `https://${getAppDomain()}/api/auth/strava/callback`;

// Log configuration details for debugging
console.log("\nStrava Configuration:");
console.log("====================");
console.log("Website URL:", `https://${getAppDomain()}`);
console.log("Callback URL:", REDIRECT_URI);
console.log("Client ID configured:", STRAVA_CLIENT_ID ? "Yes" : "No");
console.log("Client Secret configured:", STRAVA_CLIENT_SECRET ? "Yes" : "No");
console.log("====================\n");

export interface StravaTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export function getStravaAuthUrl(userId: string): string {
  if (!STRAVA_CLIENT_ID) {
    throw new Error("STRAVA_CLIENT_ID is not configured");
  }

  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "read,activity:read_all",
    state: userId,
  });

  const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log("Generated Strava Auth URL:", authUrl);
  console.log("Using Client ID:", STRAVA_CLIENT_ID);
  console.log("Using Redirect URI:", REDIRECT_URI);
  return authUrl;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  try {
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
      throw new Error("Strava credentials not properly configured");
    }

    console.log("Exchanging Strava code for tokens...");
    console.log("Using Client ID:", STRAVA_CLIENT_ID);
    console.log("Using Redirect URI:", REDIRECT_URI);

    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI
    });

    console.log("Successfully received Strava tokens");

    // Map the response to our internal token structure
    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: response.data.expires_at,
    };
  } catch (error: any) {
    console.error("Error exchanging Strava code:", error.response?.data || error.message);
    console.error("Full error details:", JSON.stringify(error.response?.data, null, 2));
    throw new Error(error.response?.data?.message || "Failed to exchange Strava code");
  }
}

export async function refreshStravaToken(refreshToken: string): Promise<StravaTokens> {
  try {
    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    return {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt: response.data.expires_at,
    };
  } catch (error: any) {
    console.error("Error refreshing Strava token:", error.response?.data || error.message);
    throw error;
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

    const response = await axios.get(
      `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    // Process and save new activities
    for (const activity of response.data) {
      const newActivity: InsertStravaActivity = {
        userId,
        stravaId: activity.id.toString(),
        name: activity.name,
        type: activity.type,
        startDate: new Date(activity.start_date).toISOString(),
        distance: Math.round(activity.distance),
        movingTime: activity.moving_time,
        elapsedTime: activity.elapsed_time,
        totalElevationGain: Math.round(activity.total_elevation_gain),
        averageSpeed: Math.round(activity.average_speed * 1000), // Convert to mm/s
        maxSpeed: Math.round(activity.max_speed * 1000), // Convert to mm/s
        averageHeartrate: activity.average_heartrate,
        maxHeartrate: activity.max_heartrate,
        startLatitude: activity.start_latitude?.toString(),
        startLongitude: activity.start_longitude?.toString(),
        map: activity.map,
      };

      // Try to match with a workout from the training plan
      await matchActivityWithWorkout(newActivity);

      // Insert the activity
      await db.insert(stravaActivities).values(newActivity);
    }

    console.log(`Synced ${response.data.length} activities for user ${userId}`);
  } catch (error: any) {
    console.error("Error syncing Strava activities:", error.response?.data || error.message);
    throw error;
  }
}

async function matchActivityWithWorkout(activity: InsertStravaActivity): Promise<void> {
  // Get active training plan workouts for this user on the activity date
  const [workout] = await db
    .select()
    .from(workouts)
    .innerJoin(trainingPlans, eq(workouts.trainingPlanId, trainingPlans.id))
    .where(
      and(
        eq(trainingPlans.userId, activity.userId),
        eq(trainingPlans.isActive, true),
        eq(workouts.day, new Date(activity.startDate).toISOString().split('T')[0])
      )
    );

  if (workout) {
    // Match based on distance (within 10% tolerance)
    const distanceDiff = Math.abs(workout.distance - activity.distance);
    const distanceMatch = distanceDiff <= workout.distance * 0.1;

    if (distanceMatch) {
      // Update the workout with the activity ID and mark as completed
      await db
        .update(workouts)
        .set({
          stravaActivityId: activity.stravaId, // Use stravaId here
          completed: true
        })
        .where(eq(workouts.id, workout.id));

      // Update the activity with the workout ID
      activity.workoutId = workout.id;
    }
  }
}

export async function getStravaActivities(accessToken: string, after?: number): Promise<any[]> {
  try {
    const params = new URLSearchParams();
    if (after) {
      params.append("after", after.toString());
    }

    const response = await axios.get(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Error fetching Strava activities:", error.response?.data || error.message);
    throw error;
  }
}