import { Router, Response } from 'express';
import { db } from '../../../db';
import { desc, eq, and, gte, lte } from 'drizzle-orm';
import { workouts } from '@shared/schema';
import { AuthenticatedRequest, AuthenticatedRequestHandler } from '../../shared/types/express';
import { validateRequest } from '../../shared/middleware/validation';
import { workoutSchema, workoutUpdateSchema, workoutQuerySchema } from './schema';

const router = Router();

// Get user's workouts with optional filters
router.get("/", validateRequest(workoutQuerySchema), (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, type, completed } = req.query;
    
    let query = db.query.workouts.findMany({
      where: eq(workouts.userId, req.user.id),
      orderBy: [desc(workouts.date)]
    });

    if (startDate) {
      query = query.where(gte(workouts.date, startDate as string));
    }
    if (endDate) {
      query = query.where(lte(workouts.date, endDate as string));
    }
    if (type) {
      query = query.where(eq(workouts.type, type as string));
    }
    if (completed !== undefined) {
      query = query.where(eq(workouts.completed, completed as boolean));
    }

    const userWorkouts = await query;
    res.json(userWorkouts);
  } catch (error) {
    console.error("Error fetching workouts:", error);
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
}) as AuthenticatedRequestHandler);

// Create a new workout
router.post("/", validateRequest(workoutSchema), (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const newWorkout = await db.insert(workouts).values({
      ...req.body,
      userId: req.user.id
    }).returning();

    res.status(201).json(newWorkout[0]);
  } catch (error) {
    console.error("Error creating workout:", error);
    res.status(500).json({ error: "Failed to create workout" });
  }
}) as AuthenticatedRequestHandler);

// Get a specific workout
router.get("/:id", (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workout = await db.query.workouts.findFirst({
      where: and(
        eq(workouts.id, req.params.id),
        eq(workouts.userId, req.user.id)
      )
    });

    if (!workout) {
      return res.status(404).json({ error: "Workout not found" });
    }

    res.json(workout);
  } catch (error) {
    console.error("Error fetching workout:", error);
    res.status(500).json({ error: "Failed to fetch workout" });
  }
}) as AuthenticatedRequestHandler);

// Update a workout
router.patch("/:id", validateRequest(workoutUpdateSchema), (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updatedWorkout = await db.update(workouts)
      .set(req.body)
      .where(and(
        eq(workouts.id, req.params.id),
        eq(workouts.userId, req.user.id)
      ))
      .returning();

    if (!updatedWorkout[0]) {
      return res.status(404).json({ error: "Workout not found" });
    }

    res.json(updatedWorkout[0]);
  } catch (error) {
    console.error("Error updating workout:", error);
    res.status(500).json({ error: "Failed to update workout" });
  }
}) as AuthenticatedRequestHandler);

// Delete a workout
router.delete("/:id", (async (req: AuthenticatedRequest, res: Response) => {
  try {
    const deletedWorkout = await db.delete(workouts)
      .where(and(
        eq(workouts.id, req.params.id),
        eq(workouts.userId, req.user.id)
      ))
      .returning();

    if (!deletedWorkout[0]) {
      return res.status(404).json({ error: "Workout not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting workout:", error);
    res.status(500).json({ error: "Failed to delete workout" });
  }
}) as AuthenticatedRequestHandler);

export default router; 