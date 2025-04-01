import {
  users,
  trainingPlans,
  workoutNotes,
} from "./db/schema";
import { db } from "./db";
import { eq, desc, and, or, lt, gt } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { InferModel } from "drizzle-orm";

// Create memory store with proper typing
const MemoryStore = createMemoryStore(session);
type MemoryStoreType = ReturnType<typeof createMemoryStore>;

// Define types based on schema
type User = InferModel<typeof users>;
type InsertUser = InferModel<typeof users, "insert">;
type TrainingPlan = InferModel<typeof trainingPlans>;
type InsertTrainingPlan = InferModel<typeof trainingPlans, "insert">;
type WorkoutNote = InferModel<typeof workoutNotes>;
type InsertWorkoutNote = InferModel<typeof workoutNotes, "insert">;

// Add validation types
interface BackupValidationError {
  field: string;
  message: string;
}

interface BackupValidationResult {
  isValid: boolean;
  errors: BackupValidationError[];
}

export interface IStorage {
  // User operations
  getUser(email: string): Promise<User | null>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(userId: number, updates: Partial<InsertUser>): Promise<User>;
  storeResetToken(email: string, token: string, expiresAt: Date): Promise<void>;
  getResetToken(email: string): Promise<{ token: string; expiresAt: Date } | null>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  removeResetToken(email: string): Promise<void>;

  // Training plan operations
  getTrainingPlans(userId: number, active?: boolean): Promise<TrainingPlan[]>;
  getTrainingPlan(id: string): Promise<TrainingPlan | null>;
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  updateTrainingPlan(id: string, updates: Partial<InsertTrainingPlan>): Promise<TrainingPlan>;
  deleteTrainingPlan(id: string): Promise<void>;

  // Workout notes operations
  getWorkoutNotes(userId: number, workoutId?: string): Promise<WorkoutNote[]>;
  getWorkoutNote(id: string): Promise<WorkoutNote | null>;
  createWorkoutNote(note: InsertWorkoutNote): Promise<WorkoutNote>;
  updateWorkoutNote(id: string, updates: Partial<InsertWorkoutNote>): Promise<WorkoutNote>;
  deleteWorkoutNote(id: string): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  private cache: Map<string, any> = new Map();

  constructor() {
    // Switch to memory store temporarily to isolate database issues
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // Clear expired entries every 24h
    });
  }

  async getUser(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(userId: number, updates: Partial<InsertUser>): Promise<User> {
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    return result[0];
  }

  async storeResetToken(email: string, token: string, expiresAt: Date): Promise<void> {
    await db.update(users)
      .set({ resetToken: token, resetTokenExpires: expiresAt })
      .where(eq(users.email, email));
  }

  async getResetToken(email: string): Promise<{ token: string; expiresAt: Date } | null> {
    const user = await db.select({
      resetToken: users.resetToken,
      resetTokenExpires: users.resetTokenExpires
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

    if (!user[0]?.resetToken || !user[0]?.resetTokenExpires) {
      return null;
    }

    return {
      token: user[0].resetToken,
      expiresAt: user[0].resetTokenExpires
    };
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
  }

  async removeResetToken(email: string): Promise<void> {
    await db.update(users)
      .set({ resetToken: null, resetTokenExpires: null })
      .where(eq(users.email, email));
  }

  async getTrainingPlans(userId: number, active?: boolean): Promise<TrainingPlan[]> {
    const query = db.select().from(trainingPlans).where(eq(trainingPlans.userId, userId));

    if (active !== undefined) {
      return await db.select()
        .from(trainingPlans)
        .where(and(
          eq(trainingPlans.userId, userId),
          eq(trainingPlans.status, active ? 'active' : 'completed')
        ))
        .orderBy(desc(trainingPlans.startDate));
    }

    return await query.orderBy(desc(trainingPlans.startDate));
  }

  async getTrainingPlan(id: string): Promise<TrainingPlan | null> {
    const result = await db.select().from(trainingPlans).where(eq(trainingPlans.id, id)).limit(1);
    return result[0] || null;
  }

  async createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan> {
    const result = await db.insert(trainingPlans).values(plan).returning();
    return result[0];
  }

  async updateTrainingPlan(id: string, updates: Partial<InsertTrainingPlan>): Promise<TrainingPlan> {
    const result = await db.update(trainingPlans)
      .set(updates)
      .where(eq(trainingPlans.id, id))
      .returning();
    return result[0];
  }

  async deleteTrainingPlan(id: string): Promise<void> {
    await db.delete(trainingPlans).where(eq(trainingPlans.id, id));
  }

  async getWorkoutNotes(userId: number, workoutId?: string): Promise<WorkoutNote[]> {
    const query = db.select().from(workoutNotes).where(eq(workoutNotes.userId, userId));

    if (workoutId) {
      return await db.select()
        .from(workoutNotes)
        .where(and(
          eq(workoutNotes.userId, userId),
          eq(workoutNotes.workoutId, workoutId)
        ))
        .orderBy(desc(workoutNotes.createdAt));
    }

    return await query.orderBy(desc(workoutNotes.createdAt));
  }

  async getWorkoutNote(id: string): Promise<WorkoutNote | null> {
    const result = await db.select().from(workoutNotes).where(eq(workoutNotes.id, parseInt(id))).limit(1);
    return result[0] || null;
  }

  async createWorkoutNote(note: InsertWorkoutNote): Promise<WorkoutNote> {
    const result = await db.insert(workoutNotes).values(note).returning();
    return result[0];
  }

  async updateWorkoutNote(id: string, updates: Partial<InsertWorkoutNote>): Promise<WorkoutNote> {
    const result = await db.update(workoutNotes)
      .set(updates)
      .where(eq(workoutNotes.id, parseInt(id)))
      .returning();
    return result[0];
  }

  async deleteWorkoutNote(id: string): Promise<void> {
    await db.delete(workoutNotes).where(eq(workoutNotes.id, parseInt(id)));
  }

  async clearCache(): Promise<void> {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw new Error('Failed to clear cache');
    }
  }

  async createBackup(): Promise<{
    users: Array<typeof users.$inferSelect>;
    trainingPlans: Array<typeof trainingPlans.$inferSelect>;
    workoutNotes: Array<typeof workoutNotes.$inferSelect>;
  }> {
    try {
      const [backupUsers, backupTrainingPlans, backupWorkoutNotes] = await Promise.all([
        db.select().from(users),
        db.select().from(trainingPlans),
        db.select().from(workoutNotes)
      ]);

      if (!backupUsers || !backupTrainingPlans || !backupWorkoutNotes) {
        throw new Error('Failed to retrieve data for backup');
      }

      return {
        users: backupUsers,
        trainingPlans: backupTrainingPlans,
        workoutNotes: backupWorkoutNotes
      };
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create backup: Database operation failed');
    }
  }

  private validateBackupData(backup: {
    users: Array<typeof users.$inferSelect>;
    trainingPlans: Array<typeof trainingPlans.$inferSelect>;
    workoutNotes: Array<typeof workoutNotes.$inferSelect>;
  }): BackupValidationResult {
    const errors: BackupValidationError[] = [];

    // Validate users
    if (!Array.isArray(backup.users)) {
      errors.push({ field: 'users', message: 'Users must be an array' });
    } else {
      backup.users.forEach((user, index) => {
        if (!user.id || typeof user.id !== 'number') {
          errors.push({ field: `users[${index}].id`, message: 'User ID must be a number' });
        }
        if (!user.email || typeof user.email !== 'string') {
          errors.push({ field: `users[${index}].email`, message: 'User email must be a string' });
        }
        if (!user.password || typeof user.password !== 'string') {
          errors.push({ field: `users[${index}].password`, message: 'User password must be a string' });
        }
      });
    }

    // Validate training plans
    if (!Array.isArray(backup.trainingPlans)) {
      errors.push({ field: 'trainingPlans', message: 'Training plans must be an array' });
    } else {
      backup.trainingPlans.forEach((plan, index) => {
        if (!plan.id || typeof plan.id !== 'string') {
          errors.push({ field: `trainingPlans[${index}].id`, message: 'Plan ID must be a string' });
        }
        if (!plan.userId || typeof plan.userId !== 'number') {
          errors.push({ field: `trainingPlans[${index}].userId`, message: 'Plan user ID must be a number' });
        }
        if (!plan.name || typeof plan.name !== 'string') {
          errors.push({ field: `trainingPlans[${index}].name`, message: 'Plan name must be a string' });
        }
        if (!plan.startDate || !(plan.startDate instanceof Date)) {
          errors.push({ field: `trainingPlans[${index}].startDate`, message: 'Plan start date must be a Date' });
        }
        if (!plan.endDate || !(plan.endDate instanceof Date)) {
          errors.push({ field: `trainingPlans[${index}].endDate`, message: 'Plan end date must be a Date' });
        }
        if (!plan.status || !['active', 'completed'].includes(plan.status)) {
          errors.push({ field: `trainingPlans[${index}].status`, message: 'Plan status must be either "active" or "completed"' });
        }
      });
    }

    // Validate workout notes
    if (!Array.isArray(backup.workoutNotes)) {
      errors.push({ field: 'workoutNotes', message: 'Workout notes must be an array' });
    } else {
      backup.workoutNotes.forEach((note, index) => {
        if (!note.id || typeof note.id !== 'number') {
          errors.push({ field: `workoutNotes[${index}].id`, message: 'Note ID must be a number' });
        }
        if (!note.userId || typeof note.userId !== 'number') {
          errors.push({ field: `workoutNotes[${index}].userId`, message: 'Note user ID must be a number' });
        }
        if (!note.workoutId || typeof note.workoutId !== 'string') {
          errors.push({ field: `workoutNotes[${index}].workoutId`, message: 'Note workout ID must be a string' });
        }
        if (!note.content || typeof note.content !== 'string') {
          errors.push({ field: `workoutNotes[${index}].content`, message: 'Note content must be a string' });
        }
        if (!note.type || !['note', 'feedback'].includes(note.type)) {
          errors.push({ field: `workoutNotes[${index}].type`, message: 'Note type must be either "note" or "feedback"' });
        }
      });
    }

    // Validate referential integrity
    if (backup.trainingPlans && backup.users) {
      const validUserIds = backup.users
        .filter(user => user.id !== null && typeof user.id === 'number')
        .map(user => user.id as number);
      const userIds = new Set(validUserIds);

      backup.trainingPlans.forEach((plan, index) => {
        if (!userIds.has(plan.userId)) {
          errors.push({ 
            field: `trainingPlans[${index}].userId`, 
            message: `Training plan references non-existent user ID: ${plan.userId}` 
          });
        }
      });
    }

    if (backup.workoutNotes && backup.users) {
      const validUserIds = backup.users
        .filter(user => user.id !== null && typeof user.id === 'number')
        .map(user => user.id as number);
      const userIds = new Set(validUserIds);

      backup.workoutNotes.forEach((note, index) => {
        if (!userIds.has(note.userId)) {
          errors.push({ 
            field: `workoutNotes[${index}].userId`, 
            message: `Workout note references non-existent user ID: ${note.userId}` 
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async restoreFromBackup(backup: {
    users: Array<typeof users.$inferSelect>;
    trainingPlans: Array<typeof trainingPlans.$inferSelect>;
    workoutNotes: Array<typeof workoutNotes.$inferSelect>;
  }): Promise<void> {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup data: Backup must be an object');
    }

    // Validate backup data structure
    const validation = this.validateBackupData(backup);
    if (!validation.isValid) {
      const errorMessage = validation.errors
        .map(error => `${error.field}: ${error.message}`)
        .join('\n');
      throw new Error(`Invalid backup data:\n${errorMessage}`);
    }

    try {
      // Start a transaction to ensure data consistency
      await db.transaction(async (tx) => {
        try {
          // Clear existing data
          await Promise.all([
            tx.delete(workoutNotes),
            tx.delete(trainingPlans),
            tx.delete(users)
          ]);

          // Restore data in correct order (users first, then related data)
          if (backup.users.length > 0) {
            await tx.insert(users).values(backup.users);
          }

          if (backup.trainingPlans.length > 0) {
            await tx.insert(trainingPlans).values(backup.trainingPlans);
          }

          if (backup.workoutNotes.length > 0) {
            await tx.insert(workoutNotes).values(backup.workoutNotes);
          }
        } catch (txError) {
          console.error('Transaction failed during restore:', txError);
          throw new Error('Failed to restore backup: Transaction failed');
        }
      });

      // Clear cache after restore
      await this.clearCache();
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw new Error('Failed to restore backup: Database operation failed');
    }
  }
}

export const storage = new DatabaseStorage();