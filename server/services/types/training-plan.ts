import { z } from "zod";

export type TrainingPlanErrorCode = 
  | 'INVALID_PARAMETERS'
  | 'AI_SERVICE_ERROR'
  | 'GENERATION_FAILED'
  | 'VALIDATION_ERROR'
  | 'STORAGE_ERROR'
  | 'PLAN_NOT_FOUND'
  | 'NOT_AUTHORIZED';

export interface TrainingPlanErrorMetadata {
  httpStatus: number;
  userMessage: string;
}

export const TRAINING_PLAN_ERROR_METADATA: Record<TrainingPlanErrorCode, TrainingPlanErrorMetadata> = {
  INVALID_PARAMETERS: {
    httpStatus: 400,
    userMessage: 'Invalid training plan parameters provided'
  },
  AI_SERVICE_ERROR: {
    httpStatus: 503,
    userMessage: 'Unable to generate training plan at this time'
  },
  GENERATION_FAILED: {
    httpStatus: 500,
    userMessage: 'Failed to generate training plan'
  },
  VALIDATION_ERROR: {
    httpStatus: 400,
    userMessage: 'Training plan validation failed'
  },
  STORAGE_ERROR: {
    httpStatus: 500,
    userMessage: 'Failed to save training plan'
  },
  PLAN_NOT_FOUND: {
    httpStatus: 404,
    userMessage: 'Training plan not found'
  },
  NOT_AUTHORIZED: {
    httpStatus: 403,
    userMessage: 'Not authorized to access this training plan'
  }
};

export class TrainingPlanError extends Error {
  public readonly httpStatus: number;
  public readonly userMessage: string;

  constructor(
    public readonly code: TrainingPlanErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'TrainingPlanError';

    const metadata = TRAINING_PLAN_ERROR_METADATA[code];
    if (!metadata) {
      throw new Error(`Invalid training plan error code: ${code}`);
    }

    this.httpStatus = metadata.httpStatus;
    this.userMessage = metadata.userMessage;
  }
}

// Common error messages
export const ERROR_MESSAGES = {
  INVALID_DATE_RANGE: 'Invalid date range for training plan',
  INVALID_GOAL: 'Training goal is required',
  INVALID_EXPERIENCE_LEVEL: 'Invalid running experience level',
  INVALID_PREFERENCES: 'Invalid training preferences',
  PLAN_GENERATION_FAILED: 'Failed to generate training plan',
  AI_SERVICE_UNAVAILABLE: 'AI service is temporarily unavailable',
  PLAN_NOT_FOUND: 'Training plan not found',
  NOT_AUTHORIZED: 'You are not authorized to access this training plan',
  STORAGE_ERROR: 'Failed to save training plan to database'
} as const;

// Validation schemas
export const trainingGoalSchema = z.object({
  type: z.enum(['race', 'fitness', 'distance']),
  description: z.string().min(1),
  targetDate: z.string().datetime().optional(),
});

export const runningExperienceSchema = z.object({
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  fitnessLevel: z.enum(['poor', 'fair', 'good', 'excellent']),
  weeklyMileage: z.number().min(0),
});

export const trainingPreferencesSchema = z.object({
  weeklyRunningDays: z.number().min(1).max(7),
  maxWeeklyMileage: z.number().min(0),
  preferredLongRunDay: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  coachingStyle: z.enum(['conservative', 'moderate', 'aggressive']),
});
