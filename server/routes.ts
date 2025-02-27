import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertWorkoutSchema, insertTrainingPlanSchema } from "@shared/schema";

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

  return createServer(app);
}
