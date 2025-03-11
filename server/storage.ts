import {
  users,
  type User,
  type InsertUser,
  trainingPlans,
  type TrainingPlan,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;

  // Training plan operations
  getTrainingPlans(userId: number, active?: boolean): Promise<TrainingPlan[]>;
  getTrainingPlan(id: number): Promise<TrainingPlan | undefined>;
  createTrainingPlan(plan: Omit<TrainingPlan, "id">): Promise<TrainingPlan>;
  updateTrainingPlan(id: number, updates: Partial<TrainingPlan>): Promise<TrainingPlan>;
  archiveActiveTrainingPlans(userId: number): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user by id:', error);
      throw error;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async getTrainingPlans(userId: number, active?: boolean): Promise<TrainingPlan[]> {
    try {
      let query = db
        .select()
        .from(trainingPlans)
        .where(eq(trainingPlans.userId, userId));

      if (active !== undefined) {
        query = query.where(eq(trainingPlans.isActive, active));
      }

      return await query.orderBy(desc(trainingPlans.startDate));
    } catch (error) {
      console.error('Error getting training plans:', error);
      throw error;
    }
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, id));
    return plan;
  }

  async createTrainingPlan(plan: Omit<TrainingPlan, "id">): Promise<TrainingPlan> {
    try {
      console.log("Creating plan in database:", plan);
      const [newPlan] = await db
        .insert(trainingPlans)
        .values({
          ...plan,
          startDate: new Date(plan.startDate).toISOString(),
          endDate: new Date(plan.endDate).toISOString(),
        })
        .returning();

      console.log("Created plan:", newPlan);
      return newPlan;
    } catch (error) {
      console.error('Error creating training plan:', error);
      throw error;
    }
  }

  async updateTrainingPlan(id: number, updates: Partial<TrainingPlan>): Promise<TrainingPlan> {
    const [plan] = await db
      .update(trainingPlans)
      .set(updates)
      .where(eq(trainingPlans.id, id))
      .returning();

    if (!plan) {
      throw new Error("Training plan not found");
    }

    return plan;
  }

  async archiveActiveTrainingPlans(userId: number): Promise<void> {
    try {
      await db
        .update(trainingPlans)
        .set({ isActive: false })
        .where(
          and(
            eq(trainingPlans.userId, userId),
            eq(trainingPlans.isActive, true)
          )
        );
    } catch (error) {
      console.error('Error archiving training plans:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();