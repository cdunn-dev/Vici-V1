import {
  type User,
  type InsertUser,
  type Workout,
  type InsertWorkout,
  type TrainingPlan,
  type InsertTrainingPlan,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser & { password?: string }): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser> & { password?: string }): Promise<User>;

  // Workout operations
  getWorkouts(userId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;

  // Training plan operations
  getTrainingPlans(userId: number): Promise<TrainingPlan[]>;
  getTrainingPlan(id: number): Promise<TrainingPlan | undefined>;
  createTrainingPlan(plan: InsertTrainingPlan): Promise<TrainingPlan>;
  updateTrainingPlan(id: number, plan: Partial<InsertTrainingPlan>): Promise<TrainingPlan>;
}

import * as fs from 'fs';
import * as path from 'path';

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private workouts: Map<number, Workout>;
  private trainingPlans: Map<number, TrainingPlan>;
  private currentIds: { [key: string]: number };
  private dbFilePath: string;

  constructor() {
    this.dbFilePath = path.join(process.cwd(), 'db.json');
    
    // Initialize with default values
    this.users = new Map();
    this.workouts = new Map();
    this.trainingPlans = new Map();
    this.currentIds = { users: 1, workouts: 1, trainingPlans: 1 };
    
    // Load data from file if it exists
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const data = JSON.parse(fs.readFileSync(this.dbFilePath, 'utf8'));
        
        // Restore users
        if (data.users) {
          this.users = new Map(Object.entries(data.users).map(([id, user]) => [Number(id), user as User]));
        }
        
        // Restore workouts
        if (data.workouts) {
          this.workouts = new Map(Object.entries(data.workouts).map(([id, workout]) => [Number(id), workout as Workout]));
        }
        
        // Restore training plans
        if (data.trainingPlans) {
          this.trainingPlans = new Map(Object.entries(data.trainingPlans).map(([id, plan]) => {
            // Convert date strings back to Date objects
            const planObj = plan as TrainingPlan;
            planObj.startDate = new Date(planObj.startDate);
            planObj.endDate = new Date(planObj.endDate);
            return [Number(id), planObj];
          }));
        }
        
        // Restore current IDs
        if (data.currentIds) {
          this.currentIds = data.currentIds;
        }
        
        console.log('Loaded data from persistent storage');
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
    }
  }

  private saveToFile() {
    try {
      // Convert Maps to objects for JSON serialization
      const data = {
        users: Object.fromEntries(this.users),
        workouts: Object.fromEntries(this.workouts),
        trainingPlans: Object.fromEntries(this.trainingPlans),
        currentIds: this.currentIds
      };
      
      fs.writeFileSync(this.dbFilePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentIds.users++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    this.saveToFile();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    this.saveToFile();
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
    this.saveToFile();
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
    this.saveToFile();
    return plan;
  }

  async updateTrainingPlan(id: number, planData: Partial<InsertTrainingPlan>): Promise<TrainingPlan> {
    const plan = await this.getTrainingPlan(id);
    if (!plan) throw new Error("Training plan not found");
    const updatedPlan = { ...plan, ...planData };
    this.trainingPlans.set(id, updatedPlan);
    this.saveToFile();
    return updatedPlan;
  }
}

export const storage = new MemStorage();
