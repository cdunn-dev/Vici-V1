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

const customDistanceSchema = z.object({
  value: z.number().min(0, "Distance must be positive"),
  unit: z.enum(Object.values(DistanceUnits) as [string, ...string[]]).default("miles"),
});

// Improved date validation
const dateStringSchema = z.string().refine((date) => {
  if (!date) return false;
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    return false;
  }
  return true;
}, "Invalid date").transform(date => {
  const parsed = new Date(date);
  return parsed.toISOString();
});

// Base schemas without race-specific fields
const baseFormSchema = z.object({
  goal: z.enum(Object.values(TrainingGoals) as [string, ...string[]]),
  runningExperience: z.object({
    level: z.enum(Object.values(ExperienceLevels) as [string, ...string[]]),
    fitnessLevel: z.enum(Object.values(FitnessLevels) as [string, ...string[]]),
  }),
  trainingPreferences: z.object({
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
    coachingStyle: z.enum(Object.values(CoachingStyles) as [string, ...string[]]).default("Motivational"),
  }),
  startDate: dateStringSchema,
});

// Race-specific schema
const raceFormSchema = baseFormSchema.extend({
  targetRace: z.object({
    distance: z.enum(Object.values(RaceDistances) as [string, ...string[]]),
    date: dateStringSchema,
    customDistance: customDistanceSchema.optional(),
    previousBest: z.string().optional(),
    goalTime: z.string().optional(),
  }),
});

// Combined schema with conditional validation
export const planGeneratorSchema = z.discriminatedUnion("goal", [
  // Race-specific goals
  raceFormSchema.extend({
    goal: z.literal("My First Race"),
  }),
  raceFormSchema.extend({
    goal: z.literal("A Personal Best"),
  }),
  // Non-race goals
  baseFormSchema.extend({
    goal: z.literal("To Run Farther"),
    targetRace: z.undefined(),
  }),
  baseFormSchema.extend({
    goal: z.literal("To Run Faster"),
    targetRace: z.undefined(),
  }),
  baseFormSchema.extend({
    goal: z.literal("To Be Healthy"),
    targetRace: z.undefined(),
  }),
  baseFormSchema.extend({
    goal: z.literal("To Get Fit"),
    targetRace: z.undefined(),
  }),
]);

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;