import {
  users,
  trainingPlans,
  type User,
  type InsertUser,
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
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async getTrainingPlans(userId: number, active?: boolean): Promise<TrainingPlan[]> {
    let query = db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.userId, userId));

    if (active !== undefined) {
      query = query.where(eq(trainingPlans.isActive, active));
    }

    return await query.orderBy(desc(trainingPlans.id));
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.id, id));
    return plan;
  }

  async createTrainingPlan(plan: Omit<TrainingPlan, "id">): Promise<TrainingPlan> {
    const [newPlan] = await db
      .insert(trainingPlans)
      .values(plan)
      .returning();
    return newPlan;
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
    await db
      .update(trainingPlans)
      .set({ isActive: false })
      .where(
        and(
          eq(trainingPlans.userId, userId),
          eq(trainingPlans.isActive, true)
        )
      );
  }
}

export const storage = new DatabaseStorage();