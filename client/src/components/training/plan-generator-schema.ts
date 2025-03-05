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
  value: z.number({
    required_error: "Distance value is required",
    invalid_type_error: "Distance must be a number",
  }).min(0, "Distance must be positive"),
  unit: z.enum(Object.values(DistanceUnits) as [string, ...string[]], {
    required_error: "Please select a distance unit",
  }),
});

const targetRaceSchema = z.object({
  distance: z.enum(Object.values(RaceDistances) as [string, ...string[]], {
    required_error: "Please select a race distance",
  }).optional(),
  customDistance: customDistanceSchema.optional(),
  date: z.coerce.date({
    required_error: "Race date is required",
    invalid_type_error: "Invalid date format",
  }).optional(),
  previousBest: z.string().optional()
    .refine(val => !val || isValidTimeFormat(val), "Please enter a valid time in HH:MM:SS format"),
  goalTime: z.string().optional()
    .refine(val => !val || isValidTimeFormat(val), "Please enter a valid time in HH:MM:SS format"),
});

const runningExperienceSchema = z.object({
  level: z.enum(Object.values(ExperienceLevels) as [string, ...string[]], {
    required_error: "Please select your experience level",
  }),
  fitnessLevel: z.enum(Object.values(FitnessLevels) as [string, ...string[]], {
    required_error: "Please select your fitness level",
  }),
});

const trainingPreferencesSchema = z.object({
  weeklyRunningDays: z.number({
    required_error: "Please specify weekly running days",
    invalid_type_error: "Weekly running days must be a number",
  }).int("Must be a whole number")
    .min(1, "Must run at least 1 day per week")
    .max(7, "Maximum 7 days per week"),

  maxWeeklyMileage: z.number({
    required_error: "Please specify weekly mileage",
    invalid_type_error: "Weekly mileage must be a number",
  }).int("Must be a whole number")
    .min(0, "Mileage cannot be negative")
    .max(150, "Maximum 150 miles per week")
    .refine(val => val % 5 === 0, "Mileage must be in increments of 5"),

  weeklyWorkouts: z.number({
    required_error: "Please specify number of workouts",
    invalid_type_error: "Number of workouts must be a number",
  }).int("Must be a whole number")
    .min(0, "Cannot have negative workouts")
    .max(3, "Maximum 3 quality sessions per week"),

  preferredLongRunDay: z.enum(Object.values(DaysOfWeek) as [string, ...string[]], {
    required_error: "Please select your long run day",
  }),

  coachingStyle: z.enum(Object.values(CoachingStyles) as [string, ...string[]], {
    required_error: "Please select your preferred coaching style",
  }),
});

// Main schema
export const planGeneratorSchema = z.object({
  goal: z.enum(Object.values(TrainingGoals) as [string, ...string[]], {
    required_error: "Please select a training goal",
  }),
  goalDescription: z.string()
    .min(1, "Please describe your goal")
    .max(500, "Description too long"),
  targetRace: targetRaceSchema.optional(),
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
  startDate: z.coerce.date({
    required_error: "Start date is required",
    invalid_type_error: "Invalid date format",
  })
  .min(new Date(), "Start date must be in the future")
  .transform((date) => date.toISOString()),
}).refine(
  (data) => {
    if (data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST) {
      if (!data.targetRace?.distance) {
        return false;
      }
      if (data.targetRace.distance === RaceDistances.OTHER && !data.targetRace.customDistance) {
        return false;
      }
      if (!data.targetRace.date) {
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