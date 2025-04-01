import { z } from 'zod';

export const trainingPlanSchema = z.object({
  body: z.object({
    startDate: z.string(),
    endDate: z.string(),
    goal: z.string(),
    runningExperience: z.object({
      level: z.string(),
      fitnessLevel: z.string()
    }),
    trainingPreferences: z.object({
      weeklyRunningDays: z.number(),
      maxWeeklyMileage: z.number(),
      weeklyWorkouts: z.number(),
      preferredLongRunDay: z.string(),
      coachingStyle: z.string()
    }),
    targetRace: z.object({
      distance: z.string(),
      date: z.string(),
      customDistance: z.object({
        value: z.number(),
        unit: z.string()
      }).optional(),
      previousBest: z.string().optional(),
      goalTime: z.string().optional()
    }).optional()
  })
}); 