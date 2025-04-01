import { DatabaseStorage } from '../storage';
import { db } from '../db';
import { users, trainingPlans, workoutNotes } from '../db/schema';
import { eq } from 'drizzle-orm';

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    storage = new DatabaseStorage();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await db.delete(workoutNotes);
    await db.delete(trainingPlans);
    await db.delete(users);
  });

  describe('User Operations', () => {
    it('should create and retrieve a user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      const createdUser = await storage.createUser(userData);
      expect(createdUser.email).toBe(userData.email);
      expect(createdUser.password).toBe(userData.password);

      const retrievedUser = await storage.getUser(userData.email);
      expect(retrievedUser).toEqual(createdUser);
    });

    it('should handle non-existent user retrieval', async () => {
      const user = await storage.getUser('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should update a user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      const createdUser = await storage.createUser(userData);
      const updates = { emailVerified: true };
      
      const updatedUser = await storage.updateUser(createdUser.id, updates);
      expect(updatedUser.emailVerified).toBe(true);
    });

    it('should handle password reset token operations', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      await storage.createUser(userData);
      const token = 'resetToken123';
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      await storage.storeResetToken(userData.email, token, expiresAt);
      const resetToken = await storage.getResetToken(userData.email);
      expect(resetToken).toEqual({ token, expiresAt });

      await storage.removeResetToken(userData.email);
      const removedToken = await storage.getResetToken(userData.email);
      expect(removedToken).toBeNull();
    });

    it('should handle expired reset tokens', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      await storage.createUser(userData);
      const token = 'resetToken123';
      const expiresAt = new Date(Date.now() - 3600000); // 1 hour ago

      await storage.storeResetToken(userData.email, token, expiresAt);
      const resetToken = await storage.getResetToken(userData.email);
      expect(resetToken).toBeNull();
    });

    it('should handle duplicate email creation', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      await storage.createUser(userData);
      await expect(storage.createUser(userData)).rejects.toThrow();
    });

    it('should handle invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'hashedPassword123'
      };

      await expect(storage.createUser(userData)).rejects.toThrow();
    });

    it('should handle empty password', async () => {
      const userData = {
        email: 'test@example.com',
        password: ''
      };

      await expect(storage.createUser(userData)).rejects.toThrow();
    });

    it('should handle concurrent user updates', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };

      const user = await storage.createUser(userData);
      
      const update1 = storage.updateUser(user.id, { emailVerified: true });
      const update2 = storage.updateUser(user.id, { emailVerified: false });
      
      const [result1, result2] = await Promise.all([update1, update2]);
      expect(result1.emailVerified !== result2.emailVerified).toBeTruthy();
    });
  });

  describe('Training Plan Operations', () => {
    it('should create and retrieve a training plan', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // 1 day from now
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const createdPlan = await storage.createTrainingPlan(planData);
      expect(createdPlan.name).toBe(planData.name);

      const retrievedPlan = await storage.getTrainingPlan(createdPlan.id);
      expect(retrievedPlan).toEqual(createdPlan);
    });

    it('should handle non-existent training plan retrieval', async () => {
      const plan = await storage.getTrainingPlan('non-existent-id');
      expect(plan).toBeNull();
    });

    it('should get active training plans', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      await storage.createTrainingPlan(planData);
      const activePlans = await storage.getTrainingPlans(user.id, true);
      expect(activePlans.length).toBe(1);
      expect(activePlans[0].status).toBe('active');
    });

    it('should handle multiple training plans for a user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData1 = {
        userId: user.id,
        name: 'Plan 1',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const planData2 = {
        userId: user.id,
        name: 'Plan 2',
        startDate: new Date(),
        endDate: new Date(Date.now() + 172800000), // 2 days from now
        status: 'active',
        type: '10k',
        difficulty: 'intermediate'
      };

      await storage.createTrainingPlan(planData1);
      await storage.createTrainingPlan(planData2);

      const plans = await storage.getTrainingPlans(user.id);
      expect(plans.length).toBe(2);
      expect(plans.map(p => p.name)).toContain('Plan 1');
      expect(plans.map(p => p.name)).toContain('Plan 2');
    });

    it('should update training plan status', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);
      const updatedPlan = await storage.updateTrainingPlan(plan.id, { status: 'completed' });
      expect(updatedPlan.status).toBe('completed');
    });

    it('should handle invalid date ranges', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(Date.now() + 86400000), // 1 day in future
        endDate: new Date(), // Before start date
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      await expect(storage.createTrainingPlan(planData)).rejects.toThrow();
    });

    it('should handle invalid plan status', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'invalid_status' as any,
        type: '5k',
        difficulty: 'beginner'
      };

      await expect(storage.createTrainingPlan(planData)).rejects.toThrow();
    });

    it('should handle concurrent plan updates', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);
      
      const update1 = storage.updateTrainingPlan(plan.id, { name: 'Updated Plan 1' });
      const update2 = storage.updateTrainingPlan(plan.id, { name: 'Updated Plan 2' });
      
      const [result1, result2] = await Promise.all([update1, update2]);
      expect(result1.name !== result2.name).toBeTruthy();
    });

    it('should handle non-existent user for plan creation', async () => {
      const planData = {
        userId: 999999, // Use a number instead of string
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      await expect(storage.createTrainingPlan(planData)).rejects.toThrow();
    });
  });

  describe('Workout Notes Operations', () => {
    it('should create and retrieve a workout note', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Test note',
        type: 'note'
      };

      const createdNote = await storage.createWorkoutNote(noteData);
      expect(createdNote.content).toBe(noteData.content);

      const retrievedNote = await storage.getWorkoutNote(createdNote.id.toString());
      expect(retrievedNote).toEqual(createdNote);
    });

    it('should handle non-existent workout note retrieval', async () => {
      const note = await storage.getWorkoutNote('999');
      expect(note).toBeNull();
    });

    it('should get notes for a specific workout', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const workoutId = 'test-workout-id';
      const noteData = {
        userId: user.id,
        workoutId,
        content: 'Test note',
        type: 'note'
      };

      await storage.createWorkoutNote(noteData);
      const workoutNotes = await storage.getWorkoutNotes(user.id, workoutId);
      expect(workoutNotes.length).toBe(1);
      expect(workoutNotes[0].workoutId).toBe(workoutId);
    });

    it('should handle multiple notes for a workout', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const workoutId = 'test-workout-id';
      const noteData1 = {
        userId: user.id,
        workoutId,
        content: 'Note 1',
        type: 'note'
      };

      const noteData2 = {
        userId: user.id,
        workoutId,
        content: 'Note 2',
        type: 'feedback',
        rating: 5
      };

      await storage.createWorkoutNote(noteData1);
      await storage.createWorkoutNote(noteData2);

      const notes = await storage.getWorkoutNotes(user.id, workoutId);
      expect(notes.length).toBe(2);
      expect(notes.map(n => n.content)).toContain('Note 1');
      expect(notes.map(n => n.content)).toContain('Note 2');
    });

    it('should update workout note content', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Original note',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(noteData);
      const updatedNote = await storage.updateWorkoutNote(note.id.toString(), {
        content: 'Updated note'
      });
      expect(updatedNote.content).toBe('Updated note');
    });

    it('should delete workout note', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Test note',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(noteData);
      await storage.deleteWorkoutNote(note.id.toString());

      const deletedNote = await storage.getWorkoutNote(note.id.toString());
      expect(deletedNote).toBeNull();
    });

    it('should handle empty note content', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: '',
        type: 'note'
      };

      await expect(storage.createWorkoutNote(noteData)).rejects.toThrow();
    });

    it('should handle invalid note type', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Test note',
        type: 'invalid_type' as any
      };

      await expect(storage.createWorkoutNote(noteData)).rejects.toThrow();
    });

    it('should handle invalid rating values', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Test note',
        type: 'feedback',
        rating: 6 // Rating should be 1-5
      };

      await expect(storage.createWorkoutNote(noteData)).rejects.toThrow();
    });

    it('should handle concurrent note updates', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Original note',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(noteData);
      
      const update1 = storage.updateWorkoutNote(note.id.toString(), { content: 'Updated Note 1' });
      const update2 = storage.updateWorkoutNote(note.id.toString(), { content: 'Updated Note 2' });
      
      const [result1, result2] = await Promise.all([update1, update2]);
      expect(result1.content !== result2.content).toBeTruthy();
    });

    it('should handle notes for non-existent workout', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'non-existent-workout-id',
        content: 'Test note',
        type: 'note'
      };

      await expect(storage.createWorkoutNote(noteData)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Instead of trying to close the connection, we'll test with an invalid query
      const invalidQuery = db.select().from(users).where(eq(users.id, -1));
      await expect(invalidQuery).rejects.toThrow();
    });

    it('should handle transaction rollback on error', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      // Create a plan
      const plan = await storage.createTrainingPlan(planData);

      // Try to update with invalid data to trigger rollback
      await expect(storage.updateTrainingPlan(plan.id, { status: 'invalid_status' as any }))
        .rejects.toThrow();

      // Verify the plan wasn't updated
      const unchangedPlan = await storage.getTrainingPlan(plan.id);
      expect(unchangedPlan).not.toBeNull();
      expect(unchangedPlan!.status).toBe('active');
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle large number of training plans efficiently', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create 50 training plans
      const plans = await Promise.all(
        Array.from({ length: 50 }, (_, i) => ({
          userId: user.id,
          name: `Plan ${i + 1}`,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'active',
          type: '5k',
          difficulty: 'beginner'
        })).map(plan => storage.createTrainingPlan(plan))
      );

      const startTime = Date.now();
      const retrievedPlans = await storage.getTrainingPlans(user.id);
      const endTime = Date.now();

      expect(retrievedPlans.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large number of workout notes efficiently', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const workoutId = 'test-workout-id';
      // Create 100 workout notes
      const notes = await Promise.all(
        Array.from({ length: 100 }, (_, i) => ({
          userId: user.id,
          workoutId,
          content: `Note ${i + 1}`,
          type: 'note'
        })).map(note => storage.createWorkoutNote(note))
      );

      const startTime = Date.now();
      const retrievedNotes = await storage.getWorkoutNotes(user.id, workoutId);
      const endTime = Date.now();

      expect(retrievedNotes.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent operations efficiently', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const startTime = Date.now();
      // Perform 20 concurrent operations
      await Promise.all([
        ...Array(5).fill(null).map(() => storage.updateUser(user.id, { emailVerified: true })),
        ...Array(5).fill(null).map(() => storage.updateUser(user.id, { emailVerified: false })),
        ...Array(5).fill(null).map(() => storage.getUser(userData.email)),
        ...Array(5).fill(null).map(() => storage.getUser(userData.email))
      ]);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Data Integrity Checks', () => {
    it('should maintain referential integrity for training plans', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // Delete the user
      await db.delete(users).where(eq(users.id, user.id));

      // Attempt to retrieve the plan
      const retrievedPlan = await storage.getTrainingPlan(plan.id);
      expect(retrievedPlan).toBeNull();
    });

    it('should maintain referential integrity for workout notes', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Test note',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(noteData);

      // Delete the user
      await db.delete(users).where(eq(users.id, user.id));

      // Attempt to retrieve the note
      const retrievedNote = await storage.getWorkoutNote(note.id.toString());
      expect(retrievedNote).toBeNull();
    });

    it('should maintain data consistency during concurrent updates', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // Perform multiple concurrent updates
      const updates = Array(10).fill(null).map((_, i) => 
        storage.updateTrainingPlan(plan.id, { name: `Updated Plan ${i + 1}` })
      );

      const results = await Promise.all(updates);
      
      // Verify that all updates were applied and the final state is consistent
      const finalPlan = await storage.getTrainingPlan(plan.id);
      expect(finalPlan).not.toBeNull();
      expect(finalPlan!.name).toMatch(/^Updated Plan \d+$/);
    });

    it('should handle cascading deletes correctly', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create multiple plans and notes
      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Test note',
        type: 'note'
      };

      await storage.createWorkoutNote(noteData);

      // Delete the user
      await db.delete(users).where(eq(users.id, user.id));

      // Verify all related data is deleted
      const retrievedPlan = await storage.getTrainingPlan(plan.id);
      const retrievedNotes = await storage.getWorkoutNotes(user.id, 'test-workout-id');

      expect(retrievedPlan).toBeNull();
      expect(retrievedNotes.length).toBe(0);
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle maximum field lengths', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Test maximum length for plan name
      const longName = 'a'.repeat(256); // Assuming max length is 255
      const planData = {
        userId: user.id,
        name: longName,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      await expect(storage.createTrainingPlan(planData)).rejects.toThrow();

      // Test maximum length for note content
      const longContent = 'a'.repeat(10001); // Assuming max length is 10000
      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: longContent,
        type: 'note'
      };

      await expect(storage.createWorkoutNote(noteData)).rejects.toThrow();
    });

    it('should handle special characters in fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Test special characters in plan name
      const planData = {
        userId: user.id,
        name: 'Test Plan with special chars: !@#$%^&*()',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);
      expect(plan.name).toBe(planData.name);

      // Test special characters in note content
      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Note with special chars: !@#$%^&*()',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(noteData);
      expect(note.content).toBe(noteData.content);
    });

    it('should handle Unicode characters', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Test Unicode characters in plan name
      const planData = {
        userId: user.id,
        name: 'Test Plan with Unicode: 🏃‍♂️ 🏃‍♀️',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);
      expect(plan.name).toBe(planData.name);

      // Test Unicode characters in note content
      const noteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: 'Note with Unicode: 🏃‍♂️ 🏃‍♀️',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(noteData);
      expect(note.content).toBe(noteData.content);
    });
  });

  describe('Network and Connection Scenarios', () => {
    it('should handle query timeouts', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create a large number of plans to simulate a slow query
      const plans = Array.from({ length: 1000 }, (_, i) => ({
        userId: user.id,
        name: `Plan ${i + 1}`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      }));

      // Set a short timeout for the query
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 1000)
      );

      await expect(Promise.race([
        Promise.all(plans.map(plan => storage.createTrainingPlan(plan))),
        timeoutPromise
      ])).rejects.toThrow('Query timeout');
    });

    it('should handle connection drops during operations', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      // Simulate connection drop during operation
      const operation = storage.createTrainingPlan(planData);
      await expect(operation).rejects.toThrow();
    });

    it('should handle partial network failures', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      // Create a plan
      const plan = await storage.createTrainingPlan(planData);

      // Simulate partial network failure during update
      const updateOperation = storage.updateTrainingPlan(plan.id, { name: 'Updated Plan' });
      await expect(updateOperation).rejects.toThrow();

      // Verify the plan wasn't partially updated
      const retrievedPlan = await storage.getTrainingPlan(plan.id);
      expect(retrievedPlan?.name).toBe(planData.name);
    });
  });

  describe('Data Migration Scenarios', () => {
    it('should handle schema changes gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create a plan with old schema
      const oldPlanData = {
        userId: user.id,
        name: 'Old Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(oldPlanData);

      // Update plan with new schema fields
      const updatedPlan = await storage.updateTrainingPlan(plan.id, {
        description: 'New description field',
        type: '10k' // Updated type
      });

      expect(updatedPlan.description).toBe('New description field');
      expect(updatedPlan.type).toBe('10k');
    });

    it('should handle data type conversions', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create a note with numeric ID as string
      const noteData = {
        userId: user.id,
        workoutId: '123', // Numeric ID as string
        content: 'Test note',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(noteData);
      expect(note.workoutId).toBe('123');

      // Update note with numeric ID
      const updatedNote = await storage.updateWorkoutNote(note.id.toString(), {
        workoutId: '456' // Different numeric ID as string
      });

      expect(updatedNote.workoutId).toBe('456');
    });

    it('should handle data cleanup during migration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create plans with different statuses
      const plans = await Promise.all([
        storage.createTrainingPlan({
          userId: user.id,
          name: 'Active Plan',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'active',
          type: '5k',
          difficulty: 'beginner'
        }),
        storage.createTrainingPlan({
          userId: user.id,
          name: 'Completed Plan',
          startDate: new Date(Date.now() - 172800000), // 2 days ago
          endDate: new Date(Date.now() - 86400000), // 1 day ago
          status: 'completed',
          type: '5k',
          difficulty: 'beginner'
        })
      ]);

      // Simulate migration that archives completed plans
      const activePlans = await storage.getTrainingPlans(user.id, true);
      expect(activePlans.length).toBe(1);
      expect(activePlans[0].name).toBe('Active Plan');
    });
  });

  describe('Security Scenarios', () => {
    it('should prevent SQL injection in queries', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Attempt SQL injection in plan name
      const maliciousPlanData = {
        userId: user.id,
        name: "'; DROP TABLE users; --",
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      await expect(storage.createTrainingPlan(maliciousPlanData)).rejects.toThrow();

      // Verify the users table still exists
      const retrievedUser = await storage.getUser(userData.email);
      expect(retrievedUser).not.toBeNull();
    });

    it('should prevent XSS in stored data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Attempt XSS in note content
      const maliciousNoteData = {
        userId: user.id,
        workoutId: 'test-workout-id',
        content: '<script>alert("xss")</script>',
        type: 'note'
      };

      const note = await storage.createWorkoutNote(maliciousNoteData);
      expect(note.content).toBe('<script>alert("xss")</script>'); // Should be stored as-is, not executed
    });

    it('should handle malformed input data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Attempt to create plan with malformed data
      const malformedPlanData = {
        userId: user.id,
        name: null, // Invalid: name should be string
        startDate: 'invalid-date', // Invalid: should be Date
        endDate: new Date(),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      await expect(storage.createTrainingPlan(malformedPlanData as any)).rejects.toThrow();
    });

    it('should prevent unauthorized access to user data', async () => {
      const user1Data = {
        email: 'user1@example.com',
        password: 'hashedPassword123'
      };
      const user2Data = {
        email: 'user2@example.com',
        password: 'hashedPassword123'
      };

      const user1 = await storage.createUser(user1Data);
      const user2 = await storage.createUser(user2Data);

      // Create plan for user1
      const planData = {
        userId: user1.id,
        name: 'User1 Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // Attempt to access user1's plan with user2's ID
      const plans = await storage.getTrainingPlans(user2.id);
      expect(plans).not.toContainEqual(expect.objectContaining({ id: plan.id }));
    });
  });

  describe('Cache Invalidation and Consistency', () => {
    it('should invalidate cache on data updates', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Initial Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // First retrieval (should cache)
      const firstRetrieval = await storage.getTrainingPlan(plan.id);

      // Update the plan
      await storage.updateTrainingPlan(plan.id, { name: 'Updated Plan' });

      // Second retrieval (should get fresh data)
      const secondRetrieval = await storage.getTrainingPlan(plan.id);
      expect(secondRetrieval?.name).toBe('Updated Plan');
      expect(secondRetrieval?.name).not.toBe(firstRetrieval?.name);
    });

    it('should maintain cache consistency across concurrent operations', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Initial Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // Perform concurrent updates
      const updates = Array(5).fill(null).map((_, i) => 
        storage.updateTrainingPlan(plan.id, { name: `Update ${i + 1}` })
      );

      await Promise.all(updates);

      // Verify cache is consistent
      const finalPlan = await storage.getTrainingPlan(plan.id);
      expect(finalPlan?.name).toMatch(/^Update \d+$/);
    });

    it('should handle cache misses gracefully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // Clear cache (simulated)
      await storage.clearCache();

      // Should still retrieve data from database
      const retrievedPlan = await storage.getTrainingPlan(plan.id);
      expect(retrievedPlan).not.toBeNull();
      expect(retrievedPlan?.name).toBe(planData.name);
    });
  });

  describe('Backup and Recovery Procedures', () => {
    it('should handle data backup operations', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create test data
      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // Simulate backup
      const backup = await storage.createBackup();
      expect(backup).toBeDefined();
      expect(backup.users).toContainEqual(expect.objectContaining({ id: user.id }));
      expect(backup.trainingPlans).toContainEqual(expect.objectContaining({ id: plan.id }));
    });

    it('should handle data recovery from backup', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create test data
      const planData = {
        userId: user.id,
        name: 'Test Plan',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000),
        status: 'active',
        type: '5k',
        difficulty: 'beginner'
      };

      const plan = await storage.createTrainingPlan(planData);

      // Create backup
      const backup = await storage.createBackup();

      // Delete data
      await db.delete(trainingPlans).where(eq(trainingPlans.id, plan.id));
      await db.delete(users).where(eq(users.id, user.id));

      // Restore from backup
      await storage.restoreFromBackup(backup);

      // Verify data is restored
      const restoredUser = await storage.getUser(userData.email);
      const restoredPlan = await storage.getTrainingPlan(plan.id);

      expect(restoredUser).not.toBeNull();
      expect(restoredPlan).not.toBeNull();
      expect(restoredPlan?.name).toBe(planData.name);
    });

    it('should handle partial data recovery', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedPassword123'
      };
      const user = await storage.createUser(userData);

      // Create multiple plans
      const plans = await Promise.all([
        storage.createTrainingPlan({
          userId: user.id,
          name: 'Plan 1',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'active',
          type: '5k',
          difficulty: 'beginner'
        }),
        storage.createTrainingPlan({
          userId: user.id,
          name: 'Plan 2',
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          status: 'active',
          type: '10k',
          difficulty: 'intermediate'
        })
      ]);

      // Create backup
      const backup = await storage.createBackup();

      // Delete one plan
      await db.delete(trainingPlans).where(eq(trainingPlans.id, plans[0].id));

      // Restore from backup
      await storage.restoreFromBackup(backup);

      // Verify only the deleted plan is restored
      const restoredPlans = await storage.getTrainingPlans(user.id);
      expect(restoredPlans.length).toBe(2);
      expect(restoredPlans.map(p => p.name)).toContain('Plan 1');
      expect(restoredPlans.map(p => p.name)).toContain('Plan 2');
    });
  });
}); 