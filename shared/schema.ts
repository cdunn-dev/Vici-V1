import { pgTable, text, serial, json, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema with optional email verification
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").default(true),
  verificationToken: text("verification_token"),
  connectedApps: json("connected_apps").$type<string[]>().default([]),
  stravaTokens: json("strava_tokens").$type<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null>(),
});

// Training plans table
export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  goalDescription: text("goal_description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  weeklyMileage: serial("weekly_mileage").notNull(),
  weeklyPlans: json("weekly_plans").$type<any[]>().default([]),
  targetRace: json("target_race").$type<any>(),
  runningExperience: json("running_experience").$type<{
    level: string;
    fitnessLevel: string;
  }>(),
  trainingPreferences: json("training_preferences").$type<{
    weeklyRunningDays: number;
    maxWeeklyMileage: number;
    weeklyWorkouts: number;
    preferredLongRunDay: string;
    coachingStyle: string;
  }>(),
  isActive: boolean("is_active").default(true),
});

// Strava activities table
export const stravaActivities = pgTable("strava_activities", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  stravaId: text("strava_id").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  startDate: timestamp("start_date").notNull(),
  distance: integer("distance").notNull(), // in meters
  movingTime: integer("moving_time").notNull(), // in seconds
  elapsedTime: integer("elapsed_time").notNull(), // in seconds
  totalElevationGain: integer("total_elevation_gain").notNull(), // in meters
  averageSpeed: integer("average_speed").notNull(), // in meters per second
  maxSpeed: integer("max_speed").notNull(), // in meters per second
  averageHeartrate: integer("average_heartrate"),
  maxHeartrate: integer("max_heartrate"),
  startLatitude: text("start_latitude"),
  startLongitude: text("start_longitude"),
  map: json("map").$type<{
    summaryPolyline: string;
    resourceState: number;
  }>(),
  workoutId: integer("workout_id").references(() => workouts.id),
});

// Workouts table to store individual workouts from training plans
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  trainingPlanId: serial("training_plan_id").references(() => trainingPlans.id),
  weekNumber: integer("week_number").notNull(),
  day: date("day").notNull(),
  type: text("type").notNull(),
  distance: integer("distance").notNull(), // in meters
  description: text("description").notNull(),
  completed: boolean("completed").default(false),
  stravaActivityId: integer("strava_activity_id").references(() => stravaActivities.id),
});

// Registration schema with password confirmation
export const registerUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

// Training Plan Types
export const weeklyPlanSchema = z.object({
  week: z.number(),
  phase: z.string(),
  totalMileage: z.number(),
  workouts: z.array(z.object({
    day: z.string(),
    type: z.string(),
    distance: z.number(),
    description: z.string(),
    completed: z.boolean().optional(),
  })),
});

export const targetRaceSchema = z.object({
  distance: z.string(),
  date: z.string(),
  customDistance: z.object({
    value: z.number(),
    unit: z.string(),
  }).optional(),
  previousBest: z.string().optional(),
  goalTime: z.string().optional(),
});

export const runningExperienceSchema = z.object({
  level: z.string(),
  fitnessLevel: z.string(),
});

export const trainingPreferencesSchema = z.object({
  weeklyRunningDays: z.number(),
  maxWeeklyMileage: z.number(),
  weeklyWorkouts: z.number(),
  preferredLongRunDay: z.string(),
  coachingStyle: z.string(),
});

export const trainingPlanSchema = z.object({
  id: z.number(),
  userId: z.number(),
  goal: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  targetRace: targetRaceSchema.optional(),
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
  weeklyPlans: z.array(weeklyPlanSchema),
});

// Basic insert schema without confirmation password
export const insertUserSchema = createInsertSchema(users).omit({ id: true });

// Schema for Strava activity
export const stravaActivitySchema = z.object({
  stravaId: z.string(),
  name: z.string(),
  type: z.string(),
  startDate: z.string(),
  distance: z.number(),
  movingTime: z.number(),
  elapsedTime: z.number(),
  totalElevationGain: z.number(),
  averageSpeed: z.number(),
  maxSpeed: z.number(),
  averageHeartrate: z.number().optional(),
  maxHeartrate: z.number().optional(),
  startLatitude: z.string().optional(),
  startLongitude: z.string().optional(),
  map: z.object({
    summaryPolyline: z.string(),
    resourceState: z.number(),
  }).optional(),
});

export const insertStravaActivitySchema = createInsertSchema(stravaActivities);
export const insertWorkoutSchema = createInsertSchema(workouts);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type WeeklyPlan = z.infer<typeof weeklyPlanSchema>;
export type TrainingPlan = z.infer<typeof trainingPlanSchema>;
export type TrainingPlanWithWeeklyPlans = TrainingPlan & {
  weeklyPlans: WeeklyPlan[];
};
export type StravaActivity = typeof stravaActivities.$inferSelect;
export type InsertStravaActivity = z.infer<typeof insertStravaActivitySchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;