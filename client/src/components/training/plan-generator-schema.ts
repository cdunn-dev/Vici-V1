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

const targetRaceSchema = z.object({
  distance: z.enum(Object.values(RaceDistances) as [string, ...string[]]),
  date: z.string().transform((date) => {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error("Invalid date format");
    }
    return parsed.toISOString();
  }),
  customDistance: customDistanceSchema.optional(),
  previousBest: z.string().optional(),
  goalTime: z.string().optional(),
});

const runningExperienceSchema = z.object({
  level: z.enum(Object.values(ExperienceLevels) as [string, ...string[]]),
  fitnessLevel: z.enum(Object.values(FitnessLevels) as [string, ...string[]]),
});

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
  coachingStyle: z.enum(Object.values(CoachingStyles) as [string, ...string[]]).default("Motivational"),
});

export const planGeneratorSchema = z.object({
  goal: z.enum(Object.values(TrainingGoals) as [string, ...string[]]),
  targetRace: targetRaceSchema.optional(),
  runningExperience: runningExperienceSchema,
  trainingPreferences: trainingPreferencesSchema,
  startDate: z.string().transform((date) => {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      throw new Error("Invalid date format");
    }
    return parsed.toISOString();
  }),
}).superRefine((data, ctx) => {
  if (data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST) {
    if (!data.targetRace) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Race information is required for race goals",
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

    if (!data.targetRace.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a race date",
        path: ["targetRace", "date"],
      });
    }

    if (data.goal === TrainingGoals.PERSONAL_BEST && !data.targetRace.previousBest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Previous best time is required for Personal Best goals",
        path: ["targetRace", "previousBest"],
      });
    }
  } else {
    // For non-race goals, remove targetRace completely
    delete data.targetRace;
  }
});

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;