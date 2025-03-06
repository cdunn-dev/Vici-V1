import type { Express } from "express";
import { createServer } from "http";
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

  // Training plan routes
  app.get("/api/training-plans", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = parseInt(req.query.userId as string);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Only allow users to access their own plans
      if (req.user?.id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const plans = await storage.getTrainingPlans(userId);
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

      console.log("Generating training plan preview with data:", req.body);

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

  app.post("/api/training-plans/generate", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const userId = parseInt(req.body.userId);
      if (isNaN(userId) || req.user?.id !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      console.log("Generating training plan for user:", userId);
      console.log("Request body:", req.body);

      const trainingPlan = {
        userId,
        name: `Training Plan - ${req.body.goal}`,
        goal: req.body.goal,
        goalDescription: req.body.goalDescription,
        startDate: new Date(req.body.startDate),
        endDate: req.body.targetRace?.date
          ? new Date(req.body.targetRace.date)
          : new Date(Date.now() + 12 * 7 * 24 * 60 * 60 * 1000), // 12 weeks default
        weeklyMileage: req.body.trainingPreferences.maxWeeklyMileage,
        weeklyPlans: req.body.weeklyPlans || [],
        targetRace: req.body.targetRace || null,
        runningExperience: req.body.runningExperience,
        trainingPreferences: req.body.trainingPreferences,
      };

      const plan = await storage.createTrainingPlan(trainingPlan);
      console.log("Training plan created successfully:", plan.id);
      res.json(plan);
    } catch (error) {
      console.error("Error generating training plan:", error);
      res.status(500).json({ error: "Failed to generate training plan", details: error.message });
    }
  });

  return createServer(app);
}