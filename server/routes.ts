import type { Express } from "express";
import { createServer } from "http";
import fetch from "node-fetch";
import { storage } from "./storage";
import { generateTrainingPlan } from "./services/training-plan-generator";
import { insertUserSchema } from "@shared/schema";

function addWeeks(date: Date, weeks: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + weeks * 7);
  return newDate;
}

export async function registerRoutes(app: Express) {
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
      if (!code) {
        console.error("No code provided in Strava callback");
        return res.status(400).json({ error: "No code provided" });
      }

      console.log("Received Strava callback with code:", code);
      console.log("Exchanging code for tokens with Strava...");

      // Exchange code for tokens
      const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.STRAVA_CLIENT_ID,
          client_secret: process.env.STRAVA_CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.text();
        console.error("Failed to exchange Strava token:", errorData);
        throw new Error("Failed to exchange token");
      }

      const tokens = await tokenResponse.json();
      console.log("Successfully received Strava tokens");

      // If user is already authenticated, update their Strava tokens
      if (req.isAuthenticated() && req.user) {
        console.log("Updating user Strava tokens for user:", req.user.id);
        await storage.updateUser(req.user.id, {
          stravaTokens: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: tokens.expires_at,
          },
          connectedApps: [...(req.user.connectedApps || []), "strava"],
        });
        console.log("Successfully updated user Strava tokens");
      } else {
        console.log("No authenticated user found for Strava token update");
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

      const trainingPlan = {
        userId,
        name: `Training Plan - ${req.body.goal}`,
        goal: req.body.goal,
        goalDescription: req.body.goalDescription,
        startDate: new Date(req.body.startDate),
        endDate: req.body.targetRace?.date
          ? new Date(req.body.targetRace.date)
          : addWeeks(new Date(req.body.startDate), 12),
        weeklyMileage: req.body.trainingPreferences.maxWeeklyMileage,
        weeklyPlans: req.body.weeklyPlans || [],
        targetRace: req.body.targetRace || null,
        runningExperience: req.body.runningExperience,
        trainingPreferences: req.body.trainingPreferences,
        isActive: true,
      };

      const plan = await storage.createTrainingPlan(trainingPlan);
      res.json(plan);
    } catch (error) {
      console.error("Error generating training plan:", error);
      res.status(500).json({ error: "Failed to generate training plan", details: error.message });
    }
  });

  return createServer(app);
}