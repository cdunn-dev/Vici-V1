
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
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
import { IStorage } from '../storage';

export class DbStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(userData: InsertUser & { password?: string }): Promise<User> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const result = await db.insert(users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<InsertUser> & { password?: string }): Promise<User> {
    // Hash password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const result = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
      
    if (!result[0]) throw new Error("User not found");
    return result[0];
  }

  // Workout operations
  async getWorkouts(userId: number): Promise<Workout[]> {
    return db.select().from(workouts).where(eq(workouts.userId, userId));
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const result = await db.select().from(workouts).where(eq(workouts.id, id));
    return result[0];
  }

  async createWorkout(workoutData: InsertWorkout): Promise<Workout> {
    const result = await db.insert(workouts).values(workoutData).returning();
    return result[0];
  }

  // Training plan operations
  async getTrainingPlans(userId: number): Promise<TrainingPlan[]> {
    return db.select().from(trainingPlans).where(eq(trainingPlans.userId, userId));
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    const result = await db.select().from(trainingPlans).where(eq(trainingPlans.id, id));
    return result[0];
  }

  async createTrainingPlan(planData: InsertTrainingPlan): Promise<TrainingPlan> {
    const result = await db.insert(trainingPlans).values(planData).returning();
    return result[0];
  }

  async updateTrainingPlan(id: number, planData: Partial<InsertTrainingPlan>): Promise<TrainingPlan> {
    const result = await db.update(trainingPlans)
      .set(planData)
      .where(eq(trainingPlans.id, id))
      .returning();
      
    if (!result[0]) throw new Error("Training plan not found");
    return result[0];
  }
}
