import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../../db';
import { workoutNotes, workouts } from '../../db/schema';
import { eq } from 'drizzle-orm';
import workoutNotesRouter from '../workout-notes';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
    }
  }
}

const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { id: 1, email: 'test@example.com' };
  next();
});

// Mount the router
app.use('/api/workout-notes', workoutNotesRouter as express.Router);

describe('Workout Notes Routes', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
  };

  const mockWorkout = {
    id: '1',
    planId: '1',
    templateId: '1',
    scheduledDate: new Date(),
    status: 'scheduled',
    notes: 'Test workout',
    actualDuration: 30,
    actualDistance: '5.0',
    actualPace: '6.0',
  };

  beforeEach(async () => {
    // Clear workout notes table
    await db.delete(workoutNotes);
    
    // Insert test workout
    await db.insert(workouts).values(mockWorkout);
  });

  describe('POST /api/workout-notes', () => {
    it('should create a new note', async () => {
      const noteData = {
        workoutId: mockWorkout.id,
        content: 'Test note',
        type: 'note',
        tags: ['test'],
        metrics: {
          perceivedEffort: 7,
          energyLevel: 8,
          sleepQuality: 9,
          nutritionQuality: 8,
          stressLevel: 2,
          recoveryStatus: 8,
        },
      };

      const response = await request(app)
        .post('/api/workout-notes')
        .send(noteData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        content: noteData.content,
        type: noteData.type,
        tags: noteData.tags,
        metrics: noteData.metrics,
      });
    });

    it('should create a new feedback note', async () => {
      const feedbackData = {
        workoutId: mockWorkout.id,
        content: 'Great workout!',
        type: 'feedback',
        rating: 5,
        tags: ['positive'],
      };

      const response = await request(app)
        .post('/api/workout-notes')
        .send(feedbackData);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        content: feedbackData.content,
        type: feedbackData.type,
        rating: feedbackData.rating,
        tags: feedbackData.tags,
      });
    });
  });

  describe('GET /api/workout-notes/workout/:workoutId', () => {
    it('should get all notes for a workout', async () => {
      // Create test notes
      const notes = [
        {
          userId: mockUser.id,
          workoutId: mockWorkout.id,
          content: 'Test note 1',
          type: 'note',
        },
        {
          userId: mockUser.id,
          workoutId: mockWorkout.id,
          content: 'Test note 2',
          type: 'note',
        },
      ];

      await db.insert(workoutNotes).values(notes);

      const response = await request(app)
        .get(`/api/workout-notes/workout/${mockWorkout.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject(notes[0]);
      expect(response.body[1]).toMatchObject(notes[1]);
    });
  });

  describe('GET /api/workout-notes/:id', () => {
    it('should get a specific note', async () => {
      const [note] = await db.insert(workoutNotes).values({
        userId: mockUser.id,
        workoutId: mockWorkout.id,
        content: 'Test note',
        type: 'note',
      }).returning();

      const response = await request(app)
        .get(`/api/workout-notes/${note.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject(note);
    });
  });

  describe('PATCH /api/workout-notes/:id', () => {
    it('should update a note', async () => {
      const [note] = await db.insert(workoutNotes).values({
        userId: mockUser.id,
        workoutId: mockWorkout.id,
        content: 'Test note',
        type: 'note',
      }).returning();

      const updateData = {
        content: 'Updated note',
        tags: ['updated'],
      };

      const response = await request(app)
        .patch(`/api/workout-notes/${note.id}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ...note,
        content: updateData.content,
        tags: updateData.tags,
      });
    });
  });

  describe('DELETE /api/workout-notes/:id', () => {
    it('should delete a note', async () => {
      const [note] = await db.insert(workoutNotes).values({
        userId: mockUser.id,
        workoutId: mockWorkout.id,
        content: 'Test note',
        type: 'note',
      }).returning();

      const response = await request(app)
        .delete(`/api/workout-notes/${note.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ message: 'Workout note deleted successfully' });

      const [deletedNote] = await db
        .select()
        .from(workoutNotes)
        .where(eq(workoutNotes.id, note.id));

      expect(deletedNote).toBeUndefined();
    });
  });
}); 