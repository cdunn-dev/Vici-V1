import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertWorkoutSchema, insertTrainingPlanSchema } from "@shared/schema";
import { generateTrainingPlan, analyzeWorkoutAndSuggestAdjustments } from "./services/ai";
import { getStravaAuthUrl, exchangeStravaCode, getStravaActivities } from "./services/strava";

export async function registerRoutes(app: Express) {
  // User routes
  app.post("/api/users", async (req, res) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const user = await storage.createUser(result.data);
    res.json(user);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  // Workout routes
  app.get("/api/workouts", async (req, res) => {
    const userId = parseInt(req.query.userId as string);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
    const workouts = await storage.getWorkouts(userId);
    res.json(workouts);
  });

  app.post("/api/workouts", async (req, res) => {
    const result = insertWorkoutSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const workout = await storage.createWorkout(result.data);
    res.json(workout);
  });

  // Training plan routes
  app.get("/api/training-plans", async (req, res) => {
    const userId = parseInt(req.query.userId as string);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
    const plans = await storage.getTrainingPlans(userId);
    res.json(plans);
  });

  app.post("/api/training-plans", async (req, res) => {
    const result = insertTrainingPlanSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const plan = await storage.createTrainingPlan(result.data);
    res.json(plan);
  });

  app.patch("/api/training-plans/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid plan ID" });

    try {
      const plan = await storage.updateTrainingPlan(id, req.body);
      res.json(plan);
    } catch (error) {
      res.status(404).json({ error: "Training plan not found" });
    }
  });

  // AI Training Plan Generation
  app.post("/api/training-plans/generate", async (req, res) => {
    try {
      const preferences = req.body;
      const generatedPlan = await generateTrainingPlan(preferences);

      // Convert the AI response into a training plan
      const trainingPlan = {
        userId: parseInt(req.body.userId),
        name: `AI Generated Plan - ${preferences.goal}`,
        startDate: new Date(),
        endDate: preferences.targetRace ? new Date(preferences.targetRace.date) : new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000), // 12 weeks if no target race
        weeklyMileage: preferences.weeklyMileage,
        workouts: generatedPlan.weeklyPlans.flatMap(week =>
          week.workouts.map(workout => ({
            day: workout.day,
            type: workout.type,
            distance: workout.distance,
            description: workout.description
          }))
        ),
      };

      const plan = await storage.createTrainingPlan(trainingPlan);
      res.json(plan);
    } catch (error) {
      console.error("Error generating training plan:", error);
      res.status(500).json({ error: "Failed to generate training plan" });
    }
  });

  // Real-time Plan Adjustments
  app.post("/api/training-plans/:id/analyze", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      const { recentWorkouts } = req.body;

      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        return res.status(404).json({ error: "Training plan not found" });
      }

      const recommendations = await analyzeWorkoutAndSuggestAdjustments(
        recentWorkouts,
        {
          goal: plan.name,
          weeklyMileage: plan.weeklyMileage,
          currentPhase: "Current", // You might want to calculate this based on the plan's progress
        }
      );

      res.json(recommendations);
    } catch (error) {
      console.error("Error analyzing workouts:", error);
      res.status(500).json({ error: "Failed to analyze workouts" });
    }
  });

  // Strava OAuth Routes
  app.get("/api/strava/auth", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const authUrl = getStravaAuthUrl(userId);
    res.json({ url: authUrl });
  });

  app.get("/api/strava/callback", async (req, res) => {
    const { code, state: userId, error } = req.query;

    if (error) {
      return res.redirect(`/profile?error=${error}`);
    }

    if (!code || !userId) {
      return res.redirect("/profile?error=missing_params");
    }

    try {
      const tokens = await exchangeStravaCode(code as string);
      const user = await storage.getUser(parseInt(userId as string));

      if (!user) {
        return res.redirect("/profile?error=user_not_found");
      }

      // Update user with Strava tokens
      await storage.updateUser(user.id, {
        stravaTokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at,
        },
        connectedApps: [...(user.connectedApps || []), "strava"],
      });

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

      const activities = await getStravaActivities(user.stravaTokens.accessToken);

      // Convert Strava activities to our workout format
      const workouts = activities.map(activity => ({
        userId,
        date: new Date(activity.start_date),
        type: activity.type,
        distance: activity.distance, // in meters
        duration: activity.moving_time, // in seconds
        perceivedEffort: activity.perceived_exertion || null,
        notes: activity.description || null,
      }));

      // Save workouts
      for (const workout of workouts) {
        await storage.createWorkout(workout);
      }

      res.json({ message: "Activities synced successfully", count: workouts.length });
    } catch (error) {
      console.error("Error syncing Strava activities:", error);
      res.status(500).json({ error: "Failed to sync activities" });
    }
  });

  return createServer(app);
}