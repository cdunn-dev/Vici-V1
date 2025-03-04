import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express) {
  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Update user
  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Only allow users to update their own profile
      if (req.user?.id !== id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const user = await storage.updateUser(id, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });


  // Strava OAuth Routes
  app.get("/api/strava/auth", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      console.log("Generating Strava auth URL for user:", userId);
      const authUrl = getStravaAuthUrl(userId);
      console.log("Generated Strava auth URL:", authUrl);
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating Strava auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  app.get("/api/strava/callback", async (req, res) => {
    console.log("Strava callback received:", {
      code: req.query.code ? "present" : "missing",
      state: req.query.state,
      error: req.query.error,
    });

    const { code, state: userId, error } = req.query;

    if (error) {
      console.error("Strava auth error:", error);
      return res.redirect(`/profile?error=${error}`);
    }

    if (!code || !userId) {
      console.error("Missing params in callback:", { code, userId });
      return res.redirect("/profile?error=missing_params");
    }

    try {
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log("Exchanging code for tokens...");
      const tokens = await exchangeStravaCode(code as string);
      console.log("Successfully obtained Strava tokens");

      const user = await storage.getUser(parseInt(userId as string));
      if (!user) {
        console.error("User not found:", userId);
        return res.redirect("/profile?error=user_not_found");
      }

      // Connect to Strava using our new service
      await stravaService.connect({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expires_at,
      });

      // Update user with Strava tokens
      await storage.updateUser(user.id, {
        stravaTokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at,
        },
        connectedApps: [...(user.connectedApps || []), "strava"],
      });

      console.log("Successfully connected Strava for user:", user.id);
      res.redirect("/profile?success=strava_connected");
    } catch (error) {
      console.error("Error connecting Strava:", error);
      res.redirect("/profile?error=strava_connection_failed");
    }
  });

  // Strava Data Sync
  app.post("/api/strava/sync", async (req, res) => {
    const userId = parseInt(req.body.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || !user.stravaTokens) {
        return res.status(400).json({ error: "User not connected to Strava" });
      }

      // Connect to Strava with user's tokens
      await stravaService.connect(user.stravaTokens as ProviderCredentials);

      // Fetch activities using our new service
      const activities = await stravaService.syncActivities();

      // Save workouts
      for (const activity of activities) {
        const workout = {
          userId,
          date: activity.startTime,
          type: activity.type,
          distance: activity.distance,
          duration: activity.duration,
          perceivedEffort: activity.perceivedEffort || null,
          notes: activity.notes || null,
          heartRate: activity.heartRate,
          elevation: activity.elevation,
          pace: activity.pace,
        };
        await storage.createWorkout(workout);
      }

      res.json({
        message: "Activities synced successfully",
        count: activities.length
      });
    } catch (error) {
      console.error("Error syncing Strava activities:", error);
      res.status(500).json({ error: "Failed to sync activities" });
    }
  });

  return createServer(app);
}