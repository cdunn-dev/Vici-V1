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

// Improved date validation
const dateStringSchema = z.string().refine((date) => {
  if (!date) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, "Invalid date format").transform(date => new Date(date).toISOString());

// Time format validation (HH:MM:SS)
const timeStringSchema = z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/, "Invalid time format (use HH:MM:SS)");

// User profile schema
const userProfileSchema = z.object({
  age: z.number().min(13, "Must be at least 13 years old").max(120, "Invalid age"),
  gender: z.enum(Object.values(GenderOptions) as [string, ...string[]]),
  preferredDistanceUnit: z.enum(Object.values(DistanceUnits) as [string, ...string[]]),
});

// Running experience schema
const runningExperienceSchema = z.object({
  level: z.enum(Object.values(ExperienceLevels) as [string, ...string[]]),
  fitnessLevel: z.enum(Object.values(FitnessLevels) as [string, ...string[]]),
});

// Race target schema
const raceTargetSchema = z.object({
  name: z.string().min(1, "Race name is required"),
  distance: z.enum(Object.values(RaceDistances) as [string, ...string[]]),
  date: dateStringSchema,
  previousBest: timeStringSchema.optional(),
  goalTime: timeStringSchema.optional(),
});

// Training preferences schema
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

// Base schema for all plans
const baseSchema = z.object({
  startDate: dateStringSchema,
  ...userProfileSchema.shape,
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
});

// Final schema with conditional validation based on goal
export const planGeneratorSchema = z.discriminatedUnion("goal", [
  // Race preparation goals
  baseSchema.extend({
    goal: z.enum([TrainingGoals.FIRST_RACE, TrainingGoals.PERSONAL_BEST] as const),
    targetRace: raceTargetSchema,
  }),
  // General fitness goals
  baseSchema.extend({
    goal: z.enum([TrainingGoals.GENERAL_FITNESS, TrainingGoals.HEALTH_AND_FITNESS] as const),
    targetRace: z.undefined(),
  }),
]);

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;