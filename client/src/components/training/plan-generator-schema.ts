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
  }),
  customDistance: customDistanceSchema.optional(),
  date: z.coerce.date({
    required_error: "Race date is required",
    invalid_type_error: "Invalid date format",
  }),
  previousBest: z.string().optional(),
  goalTime: z.string().optional(),
}).partial().optional();

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
    .max(7, "Maximum 7 days per week")
    .default(1),

  maxWeeklyMileage: z.number({
    required_error: "Please specify weekly mileage",
    invalid_type_error: "Weekly mileage must be a number",
  }).int("Must be a whole number")
    .min(0, "Mileage cannot be negative")
    .max(150, "Maximum 150 miles per week")
    .default(0),

  weeklyWorkouts: z.number({
    required_error: "Please specify number of workouts",
    invalid_type_error: "Number of workouts must be a number",
  }).int("Must be a whole number")
    .min(0, "Cannot have negative workouts")
    .max(3, "Maximum 3 quality sessions per week")
    .default(0),

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
  targetRace: targetRaceSchema,
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
  startDate: z.coerce.date({
    required_error: "Start date is required",
    invalid_type_error: "Invalid date format",
  }).transform((date) => date.toISOString()),
}).superRefine((data, ctx) => {
  // Only validate race fields when a race-related goal is selected
  if (data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST) {
    if (!data.targetRace) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Race information is required",
        path: ["targetRace"],
      });
      return;
    }

    if (!data.targetRace.distance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a race distance",
        path: ["targetRace", "distance"],
      });
    }

    if (data.targetRace.distance === RaceDistances.OTHER && !data.targetRace.customDistance) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please specify custom distance details",
        path: ["targetRace", "customDistance"],
      });
    }

    if (!data.targetRace.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a race date",
        path: ["targetRace", "date"],
      });
    }
  }

  // Validate personal best time only for PB goals
  if (data.goal === TrainingGoals.PERSONAL_BEST && (!data.targetRace?.previousBest || !isValidTimeFormat(data.targetRace.previousBest))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter your previous best time",
      path: ["targetRace", "previousBest"],
    });
  }
});

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;