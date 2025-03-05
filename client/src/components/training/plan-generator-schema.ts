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
} from "./plan-generator-constants";

// Sub-schemas for better modularity
const customDistanceSchema = z.object({
  value: z.number().min(0, "Distance must be positive"),
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
}).refine(
  (data) => !!data.level,
  {
    message: "Please select your experience level",
    path: ["level"],
  }
).refine(
  (data) => !!data.fitnessLevel,
  {
    message: "Please select your fitness level",
    path: ["fitnessLevel"],
  }
);

const trainingPreferencesSchema = z.object({
  weeklyRunningDays: z.number().min(1, "Must run at least 1 day per week").max(7, "Maximum 7 days per week"),
  maxWeeklyMileage: z.number().min(0, "Mileage cannot be negative").max(150, "Maximum 150 miles per week"),
  weeklyWorkouts: z.number().min(0, "Cannot have negative workouts").max(3, "Maximum 3 quality sessions per week"),
  preferredLongRunDay: z.enum(Object.values(DaysOfWeek) as [string, ...string[]]),
  coachingStyle: z.enum(Object.values(CoachingStyles) as [string, ...string[]]),
}).refine(
  (data) => !!data.preferredLongRunDay,
  {
    message: "Please select a day for your long run",
    path: ["preferredLongRunDay"],
  }
).refine(
  (data) => !!data.coachingStyle,
  {
    message: "Please select a coaching style",
    path: ["coachingStyle"],
  }
);

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
  (data) => !!data.goal,
  {
    message: "Please select a training goal",
    path: ["goal"],
  }
).refine(
  (data) => {
    if (data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST) {
      if (!data.targetRace?.distance) {
        return false;
      }
      if (!data.targetRace.date) {
        return false;
      }
      if (
        data.targetRace.distance === RaceDistances.OTHER &&
        !data.targetRace.customDistance
      ) {
        return false;
      }
    }
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