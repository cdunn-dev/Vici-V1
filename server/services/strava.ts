import axios from "axios";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

// Get the correct domain based on environment
function getAppDomain() {
  if (process.env.REPL_ID && process.env.REPL_OWNER) {
    // We're on Replit - construct the URL using Replit's domain format
    return `${process.env.REPL_ID}.${process.env.REPL_OWNER}.repl.co`;
  }
  return "localhost:5000"; // Local development fallback
}

const REDIRECT_URI = `https://${getAppDomain()}/api/strava/callback`;

// Log the callback URL at startup
console.log("\nStrava Configuration:");
console.log("====================");
console.log("Website URL to use in Strava API settings:");
console.log(`https://${getAppDomain()}`);
console.log("\nCallback Domain to use in Strava API settings:");
console.log(getAppDomain());
console.log("Client ID configured:", STRAVA_CLIENT_ID ? "Yes" : "No");
console.log("Client Secret configured:", STRAVA_CLIENT_SECRET ? "Yes" : "No");
console.log("Running on Replit:", process.env.REPL_ID ? "Yes" : "No");
if (process.env.REPL_ID) {
  console.log("Replit Domain:", getAppDomain());
}
console.log("====================\n");

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export function getStravaAuthUrl(userId: string): string {
  if (!STRAVA_CLIENT_ID) {
    throw new Error("STRAVA_CLIENT_ID is not configured");
  }

  if (!userId) {
    throw new Error("User ID is required for Strava authentication");
  }

  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "activity:read_all",
    state: userId, // Using userId as state for verification
  });

  const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log("Generated Strava auth URL with params:", {
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: userId,
    scope: "activity:read_all"
  });
  return authUrl;
}

export async function exchangeStravaCode(code: string): Promise<StravaTokens> {
  try {
    console.log("Attempting to exchange Strava code for tokens...");

    // Add a small delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await axios.post(STRAVA_TOKEN_URL, {
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI, // Added this to ensure it matches
    });

    console.log("Successfully obtained Strava tokens");
    return {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: response.data.expires_at,
    };
  } catch (error: any) {
    console.error("Error exchanging Strava code:", error.response?.data || error.message);
    console.error("Full error response:", JSON.stringify(error.response?.data, null, 2));

    // Check for specific error types
    if (error.response?.status === 429) {
      throw new Error("Too many requests. Please wait a moment and try again.");
    }

    // If there's a specific OAuth error, format it nicely
    if (error.response?.data?.errors) {
      throw new Error(`Strava Auth Error: ${error.response.data.errors[0]?.field}: ${error.response.data.errors[0]?.code}`);
    }

    throw error;
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
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: response.data.expires_at,
    };
  } catch (error: any) {
    console.error("Error refreshing Strava token:", error.response?.data || error.message);
    throw error;
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