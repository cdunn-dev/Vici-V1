import { pgTable, text, serial, json, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add new schema types for running experience and fitness assessment
export const RunningExperienceLevelEnum = z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "elite"
]);

export const FitnessLevelEnum = z.enum([
  "building-base",
  "maintaining",
  "peak-training",
  "recovery"
]);

export const CoachingStyleEnum = z.enum([
  "authoritative",
  "directive",
  "motivational",
  "collaborative",
  "hybrid"
]);

// User schema with profile fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),
  profilePicture: text("profile_picture"),
  gender: text("gender"),
  birthday: date("birthday"),
  preferredDistanceUnit: text("preferred_distance_unit").default("miles"),
  connectedApps: json("connected_apps").$type<string[]>().default([]),
  stravaTokens: json("strava_tokens").$type<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null>(),
  personalBests: json("personal_bests").$type<{
    distance: string;
    time: string;
    date: string;
  }[]>().default([]),
  runningExperience: text("running_experience"),
  fitnessLevel: text("fitness_level"),
  preferredCoachingStyle: text("preferred_coaching_style"),
  stravaStats: json("strava_stats").$type<{
    totalDistance: number;
    totalRuns: number;
    averagePace: number;
    recentRaces: {
      distance: string;
      time: string;
      date: string;
    }[];
    predictedRaces: {
      distance: string;
      predictedTime: string;
    }[];
  } | null>(),
});

// Personal best record schema
export const personalBestSchema = z.object({
  distance: z.string(),
  time: z.string(),
  date: z.string(),
});

// Gender options enum
export const GenderEnum = z.enum([
  "male",
  "female",
  "non-binary",
  "other",
  "prefer-not-to-say",
]);

// Distance unit options
export const DistanceUnitEnum = z.enum(["miles", "kilometers"]);

// Update user profile schema
export const userProfileUpdateSchema = z.object({
  gender: GenderEnum.optional(),
  birthday: z.string().optional(),
  preferredDistanceUnit: DistanceUnitEnum.optional(),
  personalBests: z.array(personalBestSchema).optional(),
  runningExperience: RunningExperienceLevelEnum.optional(),
  fitnessLevel: FitnessLevelEnum.optional(),
  preferredCoachingStyle: CoachingStyleEnum.optional(),
});

// Training plans table
/**
 * Training plans table schema
 * Stores user training plans with their associated metadata and workout schedules
 */
export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  goalDescription: text("goal_description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  weeklyMileage: serial("weekly_mileage").notNull(),
  weeklyPlans: json("weekly_plans").$type<WeeklyPlan[]>().default([]),
  targetRace: json("target_race").$type<{
    distance: string;
    date: string;
    customDistance?: { value: number; unit: string };
    previousBest?: string;
    goalTime?: string;
  }>(),
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
  active: boolean("is_active").default(true),
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

/**
 * Zod schema for training plans
 * Validates training plan data structure and enforces type safety
 */
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
  active: z.boolean().default(true),
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

/**
 * Type definition for a training plan
 * Generated from the Zod schema to ensure type safety
 */
export type TrainingPlan = z.infer<typeof trainingPlanSchema>;

/**
 * Extended type that includes weekly plans
 * Used when the full training plan data structure is needed
 */
export type TrainingPlanWithWeeklyPlans = TrainingPlan & {
  weeklyPlans: WeeklyPlan[];
};

export type StravaActivity = typeof stravaActivities.$inferSelect;
export type InsertStravaActivity = z.infer<typeof insertStravaActivitySchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;