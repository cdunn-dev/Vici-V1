import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import { db as dbClient } from '../db';
import { IStorage } from '../storage';
import { logger } from '../utils/logger';

import { 
  type User, 
  type InsertUser,
  type Workout, 
  type InsertWorkout,
  type TrainingPlan, 
  type InsertTrainingPlan,
  users,
  workouts,
  trainingPlans
} from '@shared/schema';


export class DbStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;

  constructor(db: ReturnType<typeof drizzle>) {
    if (!db) {
      logger.error('Database client is not initialized. Cannot use DbStorage.');
      throw new Error('Database client is not initialized. Cannot use DbStorage.');
    }
    this.db = db;
    logger.info('DbStorage initialized successfully');
  }

  static async connect(connectionString: string): Promise<ReturnType<typeof drizzle>> {
    try {
      logger.info('Connecting to database...');
      const sql = neon(connectionString);
      const db = drizzle(sql, { schema });

      // Test connection
      await sql`SELECT 1`;
      logger.info('Database connection established successfully');

      return db;
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const results = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
      return results.length > 0 ? results[0] : undefined;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  async createUser(userData: InsertUser & { password?: string }): Promise<User> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const result = await this.db.insert(users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<InsertUser> & { password?: string }): Promise<User> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    const result = await this.db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  // Workout operations
  async getWorkouts(userId: number): Promise<Workout[]> {
    return this.db.select().from(workouts).where(eq(workouts.userId, userId));
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const result = await this.db.select().from(workouts).where(eq(workouts.id, id));
    return result[0];
  }

  async createWorkout(workoutData: InsertWorkout): Promise<Workout> {
    const result = await this.db.insert(workouts).values(workoutData).returning();
    return result[0];
  }

  // Training plan operations
  async getTrainingPlans(userId: number): Promise<TrainingPlan[]> {
    return this.db.select().from(trainingPlans).where(eq(trainingPlans.userId, userId));
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    const result = await this.db.select().from(trainingPlans).where(eq(trainingPlans.id, id));
    return result[0];
  }

  async createTrainingPlan(planData: InsertTrainingPlan): Promise<TrainingPlan> {
    const result = await this.db.insert(trainingPlans).values(planData).returning();
    return result[0];
  }

  async updateTrainingPlan(id: number, planData: Partial<InsertTrainingPlan>): Promise<TrainingPlan> {
    const result = await this.db.update(trainingPlans)
      .set(planData)
      .where(eq(trainingPlans.id, id))
      .returning();

    if (!result[0]) throw new Error("Training plan not found");
    return result[0];
  }
}