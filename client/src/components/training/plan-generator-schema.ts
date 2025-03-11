import { z } from "zod";
import {
  TrainingGoals,
  RaceDistances,
  ExperienceLevels,
  FitnessLevels,
  DaysOfWeek,
  CoachingStyles,
  GenderOptions,
  DistanceUnits,
} from "./plan-generator-constants";

/**
 * Validates and transforms date strings to ISO format
 * Ensures dates are valid and converts them to a consistent format
 */
const dateStringSchema = z.string().refine((date) => {
  if (!date) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, "Invalid date format").transform(date => new Date(date).toISOString());

/**
 * Validates time strings in HH:MM:SS format
 * Used for race times and target times
 */
const timeStringSchema = z.string().regex(
  /^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
  "Invalid time format (use HH:MM:SS)"
);

/**
 * User profile information schema
 * Contains basic demographic and preference data
 */
const userProfileSchema = z.object({
  age: z.number()
    .min(13, "Must be at least 13 years old")
    .max(120, "Invalid age"),
  gender: z.enum(Object.values(GenderOptions) as [string, ...string[]]),
  preferredDistanceUnit: z.enum(Object.values(DistanceUnits) as [string, ...string[]]),
});

/**
 * Running experience schema
 * Captures user's running background and current fitness level
 */
const runningExperienceSchema = z.object({
  level: z.enum(Object.values(ExperienceLevels) as [string, ...string[]]),
  fitnessLevel: z.enum(Object.values(FitnessLevels) as [string, ...string[]]),
});

/**
 * Race target schema
 * Used when the training goal is race-specific
 */
const raceTargetSchema = z.object({
  name: z.string().min(1, "Race name is required"),
  distance: z.enum(Object.values(RaceDistances) as [string, ...string[]]),
  date: dateStringSchema,
  previousBest: timeStringSchema.optional(),
  goalTime: timeStringSchema.optional(),
});

/**
 * Training preferences schema
 * Defines user's preferred training schedule and style
 */
const trainingPreferencesSchema = z.object({
  weeklyRunningDays: z.number()
    .int("Must be a whole number")
    .min(1, "Must run at least 1 day per week")
    .max(7, "Maximum 7 days per week"),
  maxWeeklyMileage: z.number()
    .int("Must be a whole number")
    .min(5, "Minimum 5 miles per week")
    .max(120, "Maximum 120 miles per week"),
  weeklyWorkouts: z.number()
    .int("Must be a whole number")
    .min(0, "Cannot have negative workouts")
    .max(3, "Maximum 3 quality sessions per week"),
  preferredLongRunDay: z.enum(Object.values(DaysOfWeek) as [string, ...string[]]),
  coachingStyle: z.enum(Object.values(CoachingStyles) as [string, ...string[]]),
});

/**
 * Base schema shared by all training plans
 * Contains common fields regardless of goal type
 */
const baseSchema = z.object({
  startDate: dateStringSchema,
  ...userProfileSchema.shape,
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
});

/**
 * Final schema with conditional validation based on goal type
 * Uses discriminated union to handle different goal types
 */
export const planGeneratorSchema = z.discriminatedUnion("goal", [
  // Race training goal (includes race details)
  baseSchema.extend({
    goal: z.literal(TrainingGoals.RACE_TRAINING),
    targetRace: raceTargetSchema,
  }),
  // General fitness goal (no race details)
  baseSchema.extend({
    goal: z.literal(TrainingGoals.GENERAL_FITNESS),
    targetRace: z.undefined(),
  }),
]);

/**
 * Type definition for the form data structure
 * Generated from the Zod schema to ensure type safety
 */
export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;