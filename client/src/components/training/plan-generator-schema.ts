import { z } from "zod";
import {
  TrainingGoals,
  RaceDistances,
  ExperienceLevels,
  FitnessLevels,
  DaysOfWeek,
  CoachingStyles,
  isValidTimeFormat,
  isValidDistanceFormat,
} from "./plan-generator-constants";

// Sub-schemas for better modularity
const targetRaceSchema = z.object({
  distance: z.enum(Object.values(RaceDistances) as [string, ...string[]]).optional(),
  customDistance: z
    .string()
    .optional()
    .refine(
      (val) => !val || isValidDistanceFormat(val),
      "Please enter a valid distance (e.g., '50 km' or '31.1 miles')"
    ),
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
  maxWeeklyMileage: z.number().min(5).max(150),
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
  startDate: z.coerce
    .date()
    .min(new Date(), "Start date must be in the future")
    .transform((date) => date.toISOString()),
  targetRace: targetRaceSchema.optional(),
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
}).refine(
  (data) => {
    // If a race distance is selected, date should be provided
    if (data.targetRace?.distance && !data.targetRace.date) {
      return false;
    }
    // If custom distance is provided, it should be in valid format
    if (
      data.targetRace?.distance === RaceDistances.OTHER &&
      !data.targetRace.customDistance
    ) {
      return false;
    }
    return true;
  },
  {
    message:
      "Please provide a race date when selecting a race distance, or enter a custom distance when selecting 'Other'",
    path: ["targetRace"],
  }
);

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;