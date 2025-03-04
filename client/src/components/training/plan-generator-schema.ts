import { z } from "zod";

export const planGeneratorSchema = z.object({
  goal: z.enum(["First Race", "Personal Best", "Run Fast", "Run Far", "Get Fit", "Be Healthy"]),
  goalDescription: z.string().min(1, "Please describe your goal"),
  startDate: z.string().min(1, "Please select a start date"),
  targetRace: z.object({
    distance: z.enum(["5k", "10k", "Half-Marathon", "Marathon", "50k", "100k", "Other"]).optional(),
    customDistance: z.string().optional(),
    date: z.string().optional(),
    previousBest: z.string().optional(),
    goalTime: z.string().optional(),
  }).optional(),
  runningExperience: z.object({
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    fitnessLevel: z.enum(["Very fit", "Solid base", "Out of shape", "Never run before"]),
  }),
  trainingPreferences: z.object({
    weeklyRunningDays: z.number().min(1).max(7),
    maxWeeklyMileage: z.number().min(5).max(150),
    weeklyWorkouts: z.number().min(0).max(3),
    preferredLongRunDay: z.enum([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    ]),
    coachingStyle: z.enum([
      "Authoritative", "Directive", "Motivational", "Collaborative", "Hybrid"
    ]),
  }),
});

export type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;
