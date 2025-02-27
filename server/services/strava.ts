import axios from "axios";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;

// Get the correct domain based on environment
function getAppDomain() {
  if (process.env.REPLIT_SLUG && process.env.REPLIT_OWNER) {
    // We're on Replit - use the Replit URL format
    return `https://${process.env.REPLIT_SLUG}.${process.env.REPLIT_OWNER}.repl.co`;
  }
  return "http://localhost:5000"; // Local development fallback
}

const REDIRECT_URI = `${getAppDomain()}/api/strava/callback`;

// Log the callback URL at startup
console.log("\nStrava Configuration:");
console.log("====================");
console.log("Callback URL to use in Strava API settings:");
console.log(REDIRECT_URI);
console.log("Client ID configured:", STRAVA_CLIENT_ID ? "Yes" : "No");
console.log("Client Secret configured:", STRAVA_CLIENT_SECRET ? "Yes" : "No");
console.log("Running on Replit:", process.env.REPLIT_SLUG ? "Yes" : "No");
if (process.env.REPLIT_SLUG) {
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
    state: userId, // Ensure we're passing the userId as state
  });

  const authUrl = `${STRAVA_AUTH_URL}?${params.toString()}`;
  console.log("Generated Strava auth URL:", authUrl);
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