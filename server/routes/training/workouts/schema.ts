import { z } from 'zod';

export const workoutSchema = z.object({
  body: z.object({
    date: z.string(),
    type: z.string(),
    distance: z.number(),
    duration: z.number(),
    pace: z.number(),
    notes: z.string().optional(),
    stravaActivityId: z.string().optional(),
    completed: z.boolean().default(false)
  })
});

export const workoutUpdateSchema = workoutSchema.partial();

export const workoutQuerySchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    type: z.string().optional(),
    completed: z.boolean().optional()
  })
}); 