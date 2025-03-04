import { z } from "zod";
import {
  TrainingGoals,
  RaceDistances,
  DistanceUnits,
  ExperienceLevels,
  FitnessLevels,
  DaysOfWeek,
  CoachingStyles,
  isValidTimeFormat,
  isValidDistanceFormat,
} from "./plan-generator-constants";

// Sub-schemas for better modularity
const customDistanceSchema = z.object({
  value: z.number().positive("Distance must be positive"),
  unit: z.enum(Object.values(DistanceUnits) as [string, ...string[]]),
});

const targetRaceSchema = z.object({
  distance: z.enum(Object.values(RaceDistances) as [string, ...string[]]).optional(),
  customDistance: customDistanceSchema.optional(),
  date: z.coerce.date().optional(),
  previousBest: z
    .string()
    .optional()
    .refine(
      (val) => !val || isValidTimeFormat(val),
      "Please enter a valid time in HH:MM:SS format"
    ),
  goalTime: z
    .string()
    .optional()
    .refine(
      (val) => !val || isValidTimeFormat(val),
      "Please enter a valid time in HH:MM:SS format"
    ),
});

const runningExperienceSchema = z.object({
  level: z.enum(Object.values(ExperienceLevels) as [string, ...string[]]),
  fitnessLevel: z.enum(Object.values(FitnessLevels) as [string, ...string[]]),
});

const trainingPreferencesSchema = z.object({
  weeklyRunningDays: z.number().min(1).max(7),
  maxWeeklyMileage: z.number().min(0).max(150),
  weeklyWorkouts: z.number().min(0).max(3),
  preferredLongRunDay: z.enum(Object.values(DaysOfWeek) as [string, ...string[]]),
  coachingStyle: z.enum(Object.values(CoachingStyles) as [string, ...string[]]),
});

// Main schema
export const planGeneratorSchema = z.object({
  goal: z.enum(Object.values(TrainingGoals) as [string, ...string[]]),
  goalDescription: z
    .string()
    .min(1, "Please describe your goal")
    .max(500, "Description too long"),
  targetRace: targetRaceSchema.optional(),
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
  startDate: z.coerce
    .date()
    .min(new Date(), "Start date must be in the future")
    .transform((date) => date.toISOString()),
}).refine(
  (data) => {
    // Validation rules for race-related fields
    if (data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST) {
      // Race distance is required for race goals
      if (!data.targetRace?.distance) {
        return false;
      }
      // Date is required for race goals
      if (!data.targetRace.date) {
        return false;
      }
      // Custom distance validation
      if (
        data.targetRace.distance === RaceDistances.OTHER &&
        !data.targetRace.customDistance
      ) {
        return false;
      }
    }
    // Previous best is required for personal best goals
    if (data.goal === TrainingGoals.PERSONAL_BEST && !data.targetRace?.previousBest) {
      return false;
    }
    return true;
  },
  {
    message: "Please fill in all required race information",
    path: ["targetRace"],
  }
);

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;