import type { Express } from "express";
import { createServer } from "http";
import fetch from "node-fetch";
import { storage } from "./storage";
import { generateTrainingPlan } from "./services/training-plan-generator";
import { userProfileUpdateSchema } from "@shared/schema";
import { getStravaAuthUrl, exchangeStravaCode, syncStravaActivities } from "./services/strava";
import { db } from "./db";
import { desc, eq } from "drizzle-orm";
import { stravaActivities, workouts } from "@shared/schema";
import multer from "multer";
import path from "path";
import { setupAuth } from "./auth";
import { addWeeks } from "date-fns";

// Configure multer for profile picture uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/profile-pictures',
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express) {
  // Setup authentication routes and middleware
  setupAuth(app);

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Strava OAuth callback
  app.get("/api/auth/strava/callback", async (req, res) => {
    try {
      const code = req.query.code;
      const state = req.query.state;

      if (!code) {
        console.error("No code provided in Strava callback");
        return res.status(400).json({ error: "No code provided" });
      }

      console.log("Received Strava callback with code:", code);
      console.log("State parameter:", state);

      // Exchange code for tokens
      const tokens = await exchangeStravaCode(code.toString());
      console.log("Successfully received Strava tokens");

      // If user is already authenticated, update their Strava tokens
      if (req.isAuthenticated() && req.user) {
        console.log("Updating Strava tokens for user:", req.user.id);
        await storage.updateUser(req.user.id, {
          stravaTokens: tokens,
          connectedApps: [...(req.user.connectedApps || []), "strava"],
        });

        // Sync activities after successful connection
        try {
          await syncStravaActivities(req.user.id, tokens.accessToken);
          console.log("Successfully synced Strava activities");
        } catch (syncError) {
          console.error("Error syncing activities:", syncError);
          // Continue with redirect even if sync fails
        }
      }

      // Redirect back to the app
      res.redirect("/training");
    } catch (error) {
      console.error("Error in Strava OAuth callback:", error);
      res.redirect("/auth?error=strava-auth-failed");
    }
  });

  // Training plan routes
  app.get("/api/training-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = parseInt(req.query.userId as string);
      const active = req.query.active === 'true';

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Only allow users to access their own plans
      if (req.user?.id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const plans = await storage.getTrainingPlans(userId, active);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching training plans:", error);
      res.status(500).json({ error: "Failed to fetch training plans" });
    }
  });

  // New endpoint for generating plan previews
  app.post("/api/training-plans/preview", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Generate a preview plan without saving
      const previewPlan = generateTrainingPlan({
        startDate: req.body.startDate,
        endDate: req.body.targetRace?.date || addWeeks(new Date(req.body.startDate), 12).toISOString(),
        goal: req.body.goal,
        runningExperience: req.body.runningExperience,
        trainingPreferences: req.body.trainingPreferences,
        targetRace: req.body.targetRace,
      });

      res.json(previewPlan);
    } catch (error) {
      console.error("Error generating plan preview:", error);
      res.status(500).json({ error: "Failed to generate plan preview" });
    }
  });

  // Handle plan modifications
  app.post("/api/training-plans/modify", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { planId, changes } = req.body;
      if (!planId || !changes) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get the existing plan
      const existingPlan = await storage.getTrainingPlan(planId);
      if (!existingPlan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      // Only allow users to modify their own plans
      if (req.user?.id !== existingPlan.userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Update the plan based on changes
      const updatedPlan = generateTrainingPlan({
        ...existingPlan,
        changes,
      });

      // Save the updated plan
      const savedPlan = await storage.updateTrainingPlan(planId, updatedPlan);
      res.json(savedPlan);
    } catch (error) {
      console.error("Error modifying plan:", error);
      res.status(500).json({ error: "Failed to modify plan" });
    }
  });

  // Update the generate route to properly handle dates
  app.post("/api/training-plans/generate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = parseInt(req.body.userId);
      if (isNaN(userId) || req.user?.id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Archive any existing active plans for this user
      await storage.archiveActiveTrainingPlans(userId);

      try {
        // Ensure proper date parsing
        const now = new Date();
        let endDate: Date;

        if (req.body.targetRace?.date) {
          const raceDate = new Date(req.body.targetRace.date);
          if (isNaN(raceDate.getTime())) {
            throw new Error("Invalid race date format");
          }
          endDate = raceDate;
        } else {
          endDate = addWeeks(now, 12);
        }

        // Format the training plan with proper date handling
        const trainingPlan = {
          userId,
          name: `Training Plan - ${req.body.goal}`,
          goal: req.body.goal,
          goalDescription: req.body.goalDescription || "",
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          weeklyMileage: req.body.weeklyMileage || req.body.trainingPreferences?.maxWeeklyMileage,
          weeklyPlans: req.body.weeklyPlans.map((week: any) => ({
            ...week,
            workouts: week.workouts.map((workout: any) => {
              const workoutDate = new Date(workout.day);
              if (isNaN(workoutDate.getTime())) {
                throw new Error("Invalid workout date format");
              }
              return {
                ...workout,
                day: workoutDate.toISOString()
              };
            })
          })),
          targetRace: req.body.targetRace ? {
            ...req.body.targetRace,
            date: endDate.toISOString()
          } : null,
          runningExperience: req.body.runningExperience,
          trainingPreferences: req.body.trainingPreferences,
          isActive: true,
        };

        // Log the plan for debugging
        console.log("Creating training plan:", JSON.stringify(trainingPlan, null, 2));

        // Create the plan
        const plan = await storage.createTrainingPlan(trainingPlan);
        console.log("Training plan created:", JSON.stringify(plan, null, 2));

        res.json(plan);
      } catch (dateError) {
        console.error("Date parsing error:", dateError);
        return res.status(400).json({ 
          error: "Invalid date format in request",
          details: dateError instanceof Error ? dateError.message : "Unknown date error"
        });
      }
    } catch (error) {
      console.error("Error generating training plan:", error);
      res.status(500).json({ error: "Failed to generate training plan" });
    }
  });

  // Activity log routes
  app.get("/api/activities", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = req.user.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      // Get activities with their matched workouts
      const activities = await db
        .select({
          activity: stravaActivities,
          workout: workouts,
        })
        .from(stravaActivities)
        .leftJoin(workouts, eq(stravaActivities.workoutId, workouts.id))
        .where(eq(stravaActivities.userId, userId))
        .orderBy(desc(stravaActivities.startDate))
        .limit(limit)
        .offset(offset);

      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  // Get Strava auth URL
  app.get("/api/strava/auth", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      if (!req.user?.id) {
        return res.status(400).json({ error: "User ID not found" });
      }

      console.log("Generating Strava auth URL for user:", req.user.id);
      const authUrl = getStravaAuthUrl(req.user.id.toString());
      console.log("Generated auth URL:", authUrl);
      res.json({ url: authUrl });
    } catch (error) {
      console.error("Error generating Strava auth URL:", error);
      res.status(500).json({ error: "Failed to generate Strava auth URL" });
    }
  });

  // Manual sync endpoint
  app.post("/api/activities/sync", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = req.user;
      if (!user.stravaTokens) {
        return res.status(400).json({ error: "Strava not connected" });
      }

      await syncStravaActivities(user.id, user.stravaTokens.accessToken);
      res.json({ message: "Activities synced successfully" });
    } catch (error) {
      console.error("Error syncing activities:", error);
      res.status(500).json({ error: "Failed to sync activities" });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.format()._errors.join(", ") });
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
        emailVerified: false,
        verificationToken: null,
        connectedApps: [],
        stravaTokens: null,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // Update user profile
  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = parseInt(req.params.id);
      if (userId !== req.user?.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const result = userProfileUpdateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.format()._errors.join(", ") });
      }

      const updatedUser = await storage.updateUser(userId, result.data);
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Upload profile picture
  app.post("/api/users/:id/profile-picture", upload.single('profilePicture'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = parseInt(req.params.id);
      if (userId !== req.user?.id) {
        return res.status(403).json({ error: "Not authorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const filePath = `/uploads/profile-pictures/${req.file.filename}`;
      await storage.updateUser(userId, { profilePicture: filePath });

      res.json({ profilePicture: filePath });
    } catch (error) {
      console.error("Profile picture upload error:", error);
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  });

  return createServer(app);
}