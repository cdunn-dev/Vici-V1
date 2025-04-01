import { Router } from 'express';
import { createAuthenticatedRouter } from './shared/AuthenticatedRouter';
import { db } from '../db';
import { workoutNotes } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const router = createAuthenticatedRouter();

// Validation schemas
const createNoteSchema = z.object({
  workoutId: z.string().uuid(),
  content: z.string().min(1),
  type: z.enum(['note', 'feedback']),
  rating: z.number().min(1).max(5).optional(),
  tags: z.array(z.string()).optional(),
  metrics: z.object({
    perceivedEffort: z.number().min(1).max(10).optional(),
    energyLevel: z.number().min(1).max(10).optional(),
    sleepQuality: z.number().min(1).max(10).optional(),
    nutritionQuality: z.number().min(1).max(10).optional(),
    stressLevel: z.number().min(1).max(10).optional(),
    recoveryStatus: z.number().min(1).max(10).optional(),
  }).optional(),
});

const updateNoteSchema = createNoteSchema.partial();

// Create a new workout note
router.post('/', async (req, res) => {
  try {
    const validatedData = createNoteSchema.parse({
      ...req.body,
      userId: req.user.id,
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      metrics: req.body.metrics || {},
    });

    const insertData = {
      userId: req.user.id,
      workoutId: validatedData.workoutId,
      content: validatedData.content,
      type: validatedData.type,
      rating: validatedData.rating,
      tags: validatedData.tags,
      metrics: validatedData.metrics,
    };

    const [note] = await db.insert(workoutNotes).values(insertData).returning();
    res.status(201).json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input data', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to create workout note' });
  }
});

// Get all notes for a workout
router.get('/workout/:workoutId', async (req, res) => {
  try {
    const workoutId = req.params.workoutId;
    if (!workoutId) {
      res.status(400).json({ error: 'Invalid workout ID' });
      return;
    }

    const notes = await db
      .select()
      .from(workoutNotes)
      .where(
        and(
          eq(workoutNotes.workoutId, workoutId),
          eq(workoutNotes.userId, req.user.id)
        )
      )
      .orderBy(workoutNotes.createdAt);

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout notes' });
  }
});

// Get a specific note
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid note ID' });
      return;
    }

    const [note] = await db
      .select()
      .from(workoutNotes)
      .where(
        and(
          eq(workoutNotes.id, id),
          eq(workoutNotes.userId, req.user.id)
        )
      );

    if (!note) {
      res.status(404).json({ error: 'Workout note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workout note' });
  }
});

// Update a note
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid note ID' });
      return;
    }

    const validatedData = updateNoteSchema.parse(req.body);

    const [note] = await db
      .update(workoutNotes)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workoutNotes.id, id),
          eq(workoutNotes.userId, req.user.id)
        )
      )
      .returning();

    if (!note) {
      res.status(404).json({ error: 'Workout note not found' });
      return;
    }

    res.json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input data', details: error.errors });
      return;
    }
    res.status(500).json({ error: 'Failed to update workout note' });
  }
});

// Delete a note
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid note ID' });
      return;
    }

    const [note] = await db
      .delete(workoutNotes)
      .where(
        and(
          eq(workoutNotes.id, id),
          eq(workoutNotes.userId, req.user.id)
        )
      )
      .returning();

    if (!note) {
      res.status(404).json({ error: 'Workout note not found' });
      return;
    }

    res.json({ message: 'Workout note deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete workout note' });
  }
});

export default router; 