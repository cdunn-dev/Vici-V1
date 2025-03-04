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
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Training plan operations
  getTrainingPlans(userId: number): Promise<TrainingPlan[]>;
  createTrainingPlan(plan: Omit<TrainingPlan, "id">): Promise<TrainingPlan>;

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

  async getTrainingPlans(userId: number): Promise<TrainingPlan[]> {
    return Array.from(this.trainingPlans.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => b.id - a.id); // Most recent first
  }

  async createTrainingPlan(plan: Omit<TrainingPlan, "id">): Promise<TrainingPlan> {
    const id = this.currentIds.trainingPlans++;
    const newPlan = { ...plan, id };
    this.trainingPlans.set(id, newPlan);
    return newPlan;
  }
}

export const storage = new MemStorage();