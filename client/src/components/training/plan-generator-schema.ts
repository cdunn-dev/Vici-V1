import { z } from "zod";
import {
  TrainingGoals,
  RaceDistances,
  DistanceUnits,
  ExperienceLevels,
  FitnessLevels,
  DaysOfWeek,
  CoachingStyles,
} from "./plan-generator-constants";

// Basic user profile schema
const userProfileSchema = z.object({
  age: z.number().min(13, "Must be at least 13 years old").max(120, "Invalid age"),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  preferredDistanceUnit: z.enum(["miles", "kilometers"]).default("miles"),
  runningExperience: z.object({
    level: z.enum(Object.values(ExperienceLevels) as [string, ...string[]]),
    fitnessLevel: z.enum(Object.values(FitnessLevels) as [string, ...string[]]),
  }),
});

const customDistanceSchema = z.object({
  value: z.number().min(0, "Distance must be positive"),
  unit: z.enum(Object.values(DistanceUnits) as [string, ...string[]]).default("miles"),
});

// Improved date validation
const dateStringSchema = z.string().refine((date) => {
  if (!date) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}, "Invalid date").transform(date => new Date(date).toISOString());

// Training preferences schema
const trainingPreferencesSchema = z.object({
  weeklyRunningDays: z.number()
    .int("Must be a whole number")
    .min(1, "Must run at least 1 day per week")
    .max(7, "Maximum 7 days per week"),
  maxWeeklyMileage: z.number()
    .int("Must be a whole number")
    .min(0, "Mileage cannot be negative")
    .max(150, "Maximum 150 miles per week"),
  weeklyWorkouts: z.number()
    .int("Must be a whole number")
    .min(0, "Cannot have negative workouts")
    .max(3, "Maximum 3 quality sessions per week"),
  preferredLongRunDay: z.enum(Object.values(DaysOfWeek) as [string, ...string[]]),
  coachingStyle: z.enum(Object.values(CoachingStyles) as [string, ...string[]]),
});

// Race target schema
const raceTargetSchema = z.object({
  name: z.string().min(1, "Race name is required"),
  distance: z.enum(Object.values(RaceDistances) as [string, ...string[]]),
  date: dateStringSchema,
  customDistance: customDistanceSchema.optional(),
  previousBest: z.string().optional(),
  goalTime: z.string().optional(),
});

// Base plan generator schema
const basePlanSchema = z.object({
  goal: z.enum(Object.values(TrainingGoals) as [string, ...string[]]),
  startDate: dateStringSchema,
  ...userProfileSchema.shape,
  trainingPreferences: trainingPreferencesSchema,
});

// Combined schema with conditional validation
export const planGeneratorSchema = z.discriminatedUnion("goal", [
  // Race-specific goals
  basePlanSchema.extend({
    goal: z.literal(TrainingGoals.FIRST_RACE).or(z.literal(TrainingGoals.PERSONAL_BEST)),
    targetRace: raceTargetSchema,
  }),
  // General fitness goals
  basePlanSchema.extend({
    goal: z.literal(TrainingGoals.GENERAL_FITNESS).or(z.literal(TrainingGoals.HEALTH_AND_FITNESS)),
    targetRace: z.undefined(),
  }),
]);

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;