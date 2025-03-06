import {
  type User,
  type InsertUser,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

interface TrainingPlan {
  id: number;
  userId: number;
  name: string;
  goal: string;
  goalDescription: string;
  startDate: Date;
  endDate: Date;
  weeklyMileage: number;
  weeklyPlans: any[];
  targetRace: any;
  runningExperience: any;
  trainingPreferences: any;
  isActive: boolean;
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Training plan operations
  getTrainingPlans(userId: number, active?: boolean): Promise<TrainingPlan[]>;
  getTrainingPlan(id: number): Promise<TrainingPlan | undefined>;
  createTrainingPlan(plan: Omit<TrainingPlan, "id">): Promise<TrainingPlan>;
  updateTrainingPlan(id: number, updates: Partial<TrainingPlan>): Promise<TrainingPlan>;
  archiveActiveTrainingPlans(userId: number): Promise<void>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trainingPlans: Map<number, TrainingPlan>;
  private currentIds: { [key: string]: number };
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    this.users = new Map();
    this.trainingPlans = new Map();
    this.currentIds = { users: 1, trainingPlans: 1 };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user: User = { 
      id,
      ...insertUser,
      emailVerified: true,
      verificationToken: null,
      connectedApps: [],
      stravaTokens: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser = {
      ...user,
      ...userData,
      connectedApps: user.connectedApps,
      stravaTokens: user.stravaTokens
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getTrainingPlans(userId: number, active?: boolean): Promise<TrainingPlan[]> {
    const plans = Array.from(this.trainingPlans.values())
      .filter(plan => plan.userId === userId);

    if (active !== undefined) {
      return plans.filter(plan => plan.isActive === active);
    }

    return plans.sort((a, b) => b.id - a.id); // Most recent first
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    return this.trainingPlans.get(id);
  }

  async createTrainingPlan(plan: Omit<TrainingPlan, "id">): Promise<TrainingPlan> {
    const id = this.currentIds.trainingPlans++;
    const newPlan = { ...plan, id, isActive: true };
    this.trainingPlans.set(id, newPlan);
    return newPlan;
  }

  async updateTrainingPlan(id: number, updates: Partial<TrainingPlan>): Promise<TrainingPlan> {
    const existingPlan = await this.getTrainingPlan(id);
    if (!existingPlan) {
      throw new Error("Training plan not found");
    }

    const updatedPlan = { ...existingPlan, ...updates };
    this.trainingPlans.set(id, updatedPlan);
    return updatedPlan;
  }

  async archiveActiveTrainingPlans(userId: number): Promise<void> {
    const activePlans = await this.getTrainingPlans(userId, true);
    for (const plan of activePlans) {
      await this.updateTrainingPlan(plan.id, { isActive: false });
    }
  }
}

export const storage = new MemStorage();