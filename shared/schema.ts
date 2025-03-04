import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  connectedApps: json("connected_apps").$type<string[]>().default([]),
  stravaTokens: json("strava_tokens").$type<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null>(),
});

export const registerUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;

export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  goalDescription: text("goal_description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  weeklyMileage: integer("weekly_mileage").notNull(),
  weeklyPlans: json("weekly_plans").$type<{
    week: number;
    phase: string;
    totalMileage: number;
    workouts: {
      day: string;
      type: string;
      distance: number;
      description: string;
    }[];
  }[]>(),
  targetRace: json("target_race").$type<{
    distance: string;
    customDistance?: string;
    date: string;
    previousBest?: string;
    goalTime?: string;
  } | null>(),
  runningExperience: json("running_experience").$type<{
    level: "Beginner" | "Intermediate" | "Advanced";
    fitnessLevel: "Very fit" | "Solid base" | "Out of shape" | "Never run before";
    personalBests: Record<string, string>;
  }>(),
  trainingPreferences: json("training_preferences").$type<{
    weeklyRunningDays: number;
    maxWeeklyMileage: number;
    weeklyWorkouts: number;
    preferredLongRunDay: string;
    coachingStyle: "Authoritative" | "Directive" | "Motivational" | "Collaborative" | "Hybrid";
  }>(),
});

export const insertTrainingPlanSchema = createInsertSchema(trainingPlans).omit({ id: true });

export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  distance: integer("distance").notNull(),
  duration: integer("duration").notNull(),
  perceivedEffort: integer("perceived_effort"),
  notes: text("notes"),
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertTrainingPlan = z.infer<typeof insertTrainingPlanSchema>;


export type WeeklyPlan = {
  week: number;
  phase: string;
  totalMileage: number;
  workouts: {
    day: string;
    type: string;
    distance: number;
    description: string;
  }[];
};

export type TrainingPlanWithWeeklyPlans = TrainingPlan & {
  weeklyPlans: WeeklyPlan[];
};