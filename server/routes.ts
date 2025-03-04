import type { Express } from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { authenticate, AuthRequest } from "./middleware/auth";
import authRoutes from "./routes/auth";
import { insertUserSchema, insertWorkoutSchema, insertTrainingPlanSchema } from "@shared/schema";
import { generateTrainingPlan } from "./services/training-plan-generator";
import { analyzeWorkoutAndSuggestAdjustments, generateTrainingPlanAdjustments } from "./services/ai";
import { getStravaAuthUrl, exchangeStravaCode, getStravaActivities } from "./services/strava";
import express from "express";
import healthApi from "./routes/health";
import { logger } from "./utils/logger";

export async function registerRoutes(app: Express) {
  // Create HTTP server instance
  const server = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    logger.info('New WebSocket connection established');

    ws.on('message', (message) => {
      logger.info('Received WebSocket message:', message.toString());
    });

    ws.on('close', () => {
      logger.info('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });

  // Register routes
  app.use("/api/auth", authRoutes);
  app.use('/api', healthApi);

  // User routes
  app.post("/api/users", async (req, res) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const user = await storage.createUser(result.data);
    res.json(user);
  });

  app.get("/api/users/:id", authenticate, async (req: AuthRequest, res) => {
    if (req.user?.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const user = await storage.getUser(parseInt(req.params.id));
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  // Workout routes
  app.get("/api/workouts", authenticate, async (req: AuthRequest, res) => {
    const userId = parseInt(req.query.userId as string);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

    // Users can only access their own workouts
    if (req.user?.id !== userId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const workouts = await storage.getWorkouts(userId);
    res.json(workouts);
  });

  app.post("/api/workouts", authenticate, async (req: AuthRequest, res) => {
    // Ensure the user can only create workouts for themselves
    if (req.user?.id !== req.body.userId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }
    const result = insertWorkoutSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const workout = await storage.createWorkout(result.data);
    res.json(workout);
  });

  // Training plan routes
  app.get("/api/training-plans", authenticate, async (req: AuthRequest, res) => {
    try {
      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Users can only access their own training plans
      if (req.user?.id !== userId) {
        return res.status(403).json({ error: "Unauthorized access" });
      }

      const plans = await storage.getTrainingPlans(userId);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching training plans:", error);
      res.status(500).json({ error: "Failed to fetch training plans" });
    }
  });

  app.get("/api/training-plans/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid plan ID" });
      }
      const plan = await storage.getTrainingPlan(id);
      if (!plan) {
        return res.status(404).json({ error: "Training plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching training plan:", error);
      res.status(500).json({ error: "Failed to fetch training plan" });
    }
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
      console.log("Generating training plan with preferences:", preferences);

      const generatedPlan = await generateTrainingPlan(preferences);

      // Convert the generated plan into a training plan
      const trainingPlan = {
        userId: parseInt(req.body.userId),
        name: `AI Generated Plan - ${preferences.goal}`,
        goal: preferences.goal,
        goalDescription: preferences.goalDescription,
        startDate: new Date(preferences.startDate),
        endDate: preferences.targetRace?.date
          ? new Date(preferences.targetRace.date)
          : new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000), // 12 weeks if no target race
        weeklyMileage: preferences.trainingPreferences.maxWeeklyMileage,
        weeklyPlans: generatedPlan.weeklyPlans,
        targetRace: preferences.targetRace || null,
        runningExperience: preferences.runningExperience,
        trainingPreferences: preferences.trainingPreferences,
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

  // Add this new route after the existing training plan routes
  app.post("/api/training-plans/:id/adjust", async (req, res) => {
    try {
      console.log("Received adjustment request:", {
        planId: req.params.id,
        feedback: req.body.feedback,
        currentPlan: req.body.currentPlan ? "Present" : "Missing"
      });

      const { feedback, currentPlan } = req.body;
      const planId = parseInt(req.params.id);

      if (!feedback || !currentPlan) {
        console.error("Missing required fields:", { feedback: !!feedback, currentPlan: !!currentPlan });
        return res.status(400).json({ error: "Missing required fields" });
      }

      const plan = await storage.getTrainingPlan(planId);
      if (!plan) {
        console.error("Training plan not found:", planId);
        return res.status(404).json({ error: "Training plan not found" });
      }

      try {
        // Get AI suggestions for plan adjustments
        const adjustments = await generateTrainingPlanAdjustments(
          feedback,
          currentPlan
        );
        console.log("AI adjustments generated successfully");
        res.json(adjustments);
      } catch (aiError) {
        console.error("AI service error:", aiError);
        res.status(500).json({
          error: "Failed to generate AI adjustments",
          details: aiError.message
        });
      }
    } catch (error) {
      console.error("Error adjusting training plan:", error);
      res.status(500).json({
        error: "Failed to adjust training plan",
        details: error.message
      });
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
      console.log("Successfully obtained Strava tokens:", tokens); //Added more detailed logging

      const user = await storage.getUser(parseInt(userId as string));
      if (!user) {
        console.error("User not found:", userId);
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

  logger.info('API routes and WebSocket server registered successfully');
  return server;
}