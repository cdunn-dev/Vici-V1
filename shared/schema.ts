import { pgTable, text, serial, jsonb, boolean, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for type safety
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

export const TrainingPhaseEnum = z.enum([
  "base",
  "build",
  "peak",
  "taper",
  "race",
  "recovery"
]);

// Enhanced schema for Strava athlete data
export const stravaAthleteSchema = z.object({
  id: z.number(),
  username: z.string().optional(),
  firstname: z.string(),
  lastname: z.string(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  sex: z.string().optional(),
  premium: z.boolean().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  profile_medium: z.string().optional(),
  profile: z.string().optional(),
  follower_count: z.number().optional(),
  friend_count: z.number().optional(),
  measurement_preference: z.string().optional(),
  ftp: z.number().optional(),
  weight: z.number().optional(),
  clubs: z.array(z.object({
    id: z.number(),
    name: z.string(),
    member_count: z.number().optional()
  })).optional()
});

// Enhanced user schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").default(false),
  verificationToken: text("verification_token"),

  // Profile data
  profilePicture: text("profile_picture"),
  gender: text("gender"),
  birthday: date("birthday"),
  preferredDistanceUnit: text("preferred_distance_unit").default("miles"),
  weight: integer("weight"),

  // App connections
  connectedApps: jsonb("connected_apps").$type<string[]>().default([]),

  // Strava integration
  stravaTokens: jsonb("strava_tokens").$type<{
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  } | null>(),
  stravaAthlete: jsonb("strava_athlete").$type<z.infer<typeof stravaAthleteSchema> | null>(),

  // Running profile
  personalBests: jsonb("personal_bests").$type<Array<{
    distance: string;
    time: string;
    date: string;
    race: boolean;
    course?: string;
    conditions?: {
      temperature?: number;
      humidity?: number;
      terrain?: string;
    };
  }>>().default([]),

  runningExperience: jsonb("running_experience").$type<{
    level: z.infer<typeof RunningExperienceLevelEnum>;
    weeklyMileage: number;
    preferredRunDays: string[];
    commonWorkoutTypes: string[];
    fitnessLevel?: z.infer<typeof FitnessLevelEnum>;
    trainingPhase?: z.infer<typeof TrainingPhaseEnum>;
    recentInjuries?: string[];
    preferredSurfaces?: string[];
    typicalPaces?: {
      easy?: number;
      tempo?: number;
      interval?: number;
      race?: number;
    };
  }>(),

  stravaStats: jsonb("strava_stats").$type<{
    totalDistance: number;
    totalRuns: number;
    averagePace?: number;
    recentRaces?: Array<{
      distance: string;
      time: string;
      date: string;
    }>;
    predictedRaces?: Array<{
      distance: string;
      predictedTime: string;
      confidence?: number;
    }>;
    yearToDateStats?: {
      totalDistance: number;
      totalTime: number;
      elevationGain: number;
      averageHeartrate?: number;
    };
    trainingLoad?: {
      acute: number;
      chronic: number;
      rampRate: number;
    };
  } | null>(),

  // Training preferences
  trainingPreferences: jsonb("training_preferences").$type<{
    weeklyRunningDays: number;
    maxWeeklyMileage: number;
    weeklyWorkouts: number;
    preferredLongRunDay: string;
    coachingStyle: string;
    notificationPreferences: {
      email: boolean;
      push: boolean;
      reminderTime: string;
    };
  }>()
});

// Create insert schema
export const insertUserSchema = createInsertSchema(users);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
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
export type PersonalBest = z.infer<typeof personalBestSchema>;
export type RunningExperience = z.infer<typeof runningExperienceSchema>;
export type StravaStats = z.infer<typeof stravaStatsSchema>;

export const personalBestSchema = z.object({
  distance: z.string(),
  time: z.string(),
  date: z.string().datetime(),
  race: z.boolean().optional(),
  course: z.string().optional(),
  conditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    terrain: z.string().optional()
  }).optional()
});

export const runningExperienceSchema = z.object({
  level: RunningExperienceLevelEnum,
  weeklyMileage: z.number(),
  preferredRunDays: z.array(z.string()),
  commonWorkoutTypes: z.array(z.string()),
  fitnessLevel: FitnessLevelEnum.optional(),
  trainingPhase: TrainingPhaseEnum.optional(),
  recentInjuries: z.array(z.string()).optional(),
  preferredSurfaces: z.array(z.string()).optional(),
  typicalPaces: z.object({
    easy: z.number().optional(),
    tempo: z.number().optional(),
    interval: z.number().optional(),
    race: z.number().optional()
  }).optional()
});

export const stravaStatsSchema = z.object({
  totalDistance: z.number(),
  totalRuns: z.number(),
  averagePace: z.number().optional(),
  recentRaces: z.array(personalBestSchema).optional(),
  predictedRaces: z.array(z.object({
    distance: z.string(),
    predictedTime: z.string(),
    confidence: z.number().optional()
  })).optional(),
  yearToDateStats: z.object({
    totalDistance: z.number(),
    totalTime: z.number(),
    elevationGain: z.number(),
    averageHeartrate: z.number().optional()
  }).optional(),
  trainingLoad: z.object({
    acute: z.number(),
    chronic: z.number(),
    rampRate: z.number()
  }).optional()
});


export const DistanceUnitEnum = z.enum(["miles", "kilometers"]);

export const trainingPlans = pgTable("training_plans", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  goalDescription: text("goal_description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  weeklyMileage: serial("weekly_mileage").notNull(),
  weeklyPlans: jsonb("weekly_plans").$type<WeeklyPlan[]>().default([]),
  targetRace: jsonb("target_race").$type<{
    distance: string;
    date: string;
    customDistance?: { value: number; unit: string };
    previousBest?: string;
    goalTime?: string;
  }>(),
  runningExperience: jsonb("running_experience").$type<{
    level: string;
    fitnessLevel: string;
  }>(),
  trainingPreferences: jsonb("training_preferences").$type<{
    weeklyRunningDays: number;
    maxWeeklyMileage: number;
    weeklyWorkouts: number;
    preferredLongRunDay: string;
    coachingStyle: string;
  }>(),
  active: boolean("is_active").default(true),
});

export const LapSchema = z.object({
  lapIndex: z.number(),
  splitIndex: z.number(),
  distance: z.number(),
  elapsedTime: z.number(),
  movingTime: z.number(),
  startDate: z.string(),
  averageSpeed: z.number(),
  maxSpeed: z.number().optional(),
  averageHeartrate: z.number().optional(),
  maxHeartrate: z.number().optional(),
  paceZone: z.number().optional(),
});

export const DetailedMapSchema = z.object({
  summaryPolyline: z.string(),
  resourceState: z.number(),
  streamData: z.object({
    distance: z.array(z.number()).optional(),
    altitude: z.array(z.number()).optional(),
    velocity: z.array(z.number()).optional(),
    heartrate: z.array(z.number()).optional(),
    cadence: z.array(z.number()).optional(),
    watts: z.array(z.number()).optional(),
    temp: z.array(z.number()).optional(),
    time: z.array(z.number()).optional(),
  }).optional(),
});

export const stravaActivities = pgTable("strava_activities", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id),
  stravaId: text("strava_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
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

  // New fields for enhanced activity data
  map: jsonb("map").$type<z.infer<typeof DetailedMapSchema>>(),
  laps: jsonb("laps").$type<z.infer<typeof LapSchema>[]>(),
  gearId: text("gear_id"),
  deviceName: text("device_name"),
  averageCadence: integer("average_cadence"),
  averageTemp: integer("average_temp"),
  sufferScore: integer("suffer_score"),
  trainingEffect: integer("training_effect"),
  perceivedExertion: integer("perceived_exertion"),
  elevationHigh: integer("elevation_high"),
  elevationLow: integer("elevation_low"),
  startAddress: text("start_address"),
  achievementCount: integer("achievement_count"),
  kudosCount: integer("kudos_count"),
  commentCount: integer("comment_count"),
  athleteCount: integer("athlete_count"),
  photoCount: integer("photo_count"),
  deviceWatts: boolean("device_watts"),
  hasHeartrate: boolean("has_heartrate"),
  heartrateZones: jsonb("heartrate_zones").$type<number[]>(),
  paceZones: jsonb("pace_zones").$type<number[]>(),
  splitMetrics: jsonb("split_metrics").$type<{
    distance: number;
    elapsedTime: number;
    elevationDifference: number;
    movingTime: number;
    split: number;
    averageSpeed: number;
    averageHeartrate?: number;
    paceZone?: number;
  }[]>(),

  workoutId: integer("workout_id").references(() => workouts.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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

export const GenderEnum = z.enum([
  "male",
  "female",
  "non-binary",
  "other",
  "prefer-not-to-say"
]);

export const registerUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

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
  active: z.boolean().default(true),
});

export const insertStravaActivitySchema = createInsertSchema(stravaActivities);
export const insertWorkoutSchema = createInsertSchema(workouts);

export type RegisterUser = z.infer<typeof registerUserSchema>;


export type TrainingPlanWithWeeklyPlans = TrainingPlan & {
  weeklyPlans: WeeklyPlan[];
};

export type InsertStravaActivity = z.infer<typeof insertStravaActivitySchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
export type PersonalBest = z.infer<typeof personalBestSchema>;
export type RunningExperience = z.infer<typeof runningExperienceSchema>;
export type StravaStats = z.infer<typeof stravaStatsSchema>;
export type StravaAthlete = z.infer<typeof stravaAthleteSchema>;

export const userProfileUpdateSchema = z.object({
  gender: GenderEnum.optional(),
  birthday: z.string().datetime().optional(),
  preferredDistanceUnit: DistanceUnitEnum.optional(),
  personalBests: z.array(personalBestSchema).optional(),
  runningExperience: runningExperienceSchema.optional(),
  fitnessLevel: FitnessLevelEnum.optional()
});

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