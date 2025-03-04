import {
  type User,
  type InsertUser,
  type Workout,
  type InsertWorkout,
  type TrainingPlan,
  type InsertTrainingPlan,
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Workout operations
  getWorkouts(userId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;

  // Training plan operations
  getTrainingPlans(userId: number): Promise<TrainingPlan[]>;
  getTrainingPlan(id: number): Promise<TrainingPlan | undefined>;
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  updateTrainingPlan(id: number, plan: Partial<InsertTrainingPlan>): Promise<TrainingPlan>;

  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workouts: Map<number, Workout>;
  private trainingPlans: Map<number, TrainingPlan>;
  private currentIds: { [key: string]: number };
  private dbFilePath: string;
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });

    this.users = new Map();
    this.workouts = new Map();
    this.trainingPlans = new Map();
    this.currentIds = { users: 1, workouts: 1, trainingPlans: 1 };
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
      personalBests: insertUser.personalBests || null,
      connectedApps: insertUser.connectedApps || [],
      stravaTokens: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");

    const updatedUser: User = {
      ...user,
      ...userData,
      personalBests: userData.personalBests || user.personalBests,
      connectedApps: userData.connectedApps || user.connectedApps,
      stravaTokens: user.stravaTokens
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getWorkouts(userId: number): Promise<Workout[]> {
    return Array.from(this.workouts.values()).filter(w => w.userId === userId);
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async createWorkout(insertWorkout: InsertWorkout): Promise<Workout> {
    const id = this.currentIds.workouts++;
    const workout = { ...insertWorkout, id };
    this.workouts.set(id, workout);
    return workout;
  }

  async getTrainingPlans(userId: number): Promise<TrainingPlan[]> {
    return Array.from(this.trainingPlans.values()).filter(p => p.userId === userId);
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    return this.trainingPlans.get(id);
  }

  async createTrainingPlan(insertPlan: InsertTrainingPlan): Promise<TrainingPlan> {
    const id = this.currentIds.trainingPlans++;
    const plan = { ...insertPlan, id };
    this.trainingPlans.set(id, plan);
    return plan;
  }

  async updateTrainingPlan(id: number, planData: Partial<InsertTrainingPlan>): Promise<TrainingPlan> {
    const plan = await this.getTrainingPlan(id);
    if (!plan) throw new Error("Training plan not found");
    const updatedPlan = { ...plan, ...planData };
    this.trainingPlans.set(id, updatedPlan);
    return updatedPlan;
  }
}

export const storage = new MemStorage();