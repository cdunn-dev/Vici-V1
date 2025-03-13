// AI Service Types and Interfaces

export interface AIProvider {
  name: string;
  generateTrainingPlan: (preferences: TrainingPreferences) => Promise<TrainingPlanResponse>;
  analyzeWorkout: (workout: WorkoutData) => Promise<WorkoutAnalysis>;
  generateAdjustments: (feedback: string, currentPlan: TrainingPlan) => Promise<PlanAdjustments>;
}

export interface TrainingPreferences {
  goal: string;
  goalDescription: string;
  startDate: string;
  endDate: Date;
  runningExperience: {
    level: string;
    fitnessLevel: string;
  };
  trainingPreferences: {
    weeklyRunningDays: number;
    maxWeeklyMileage: number;
    weeklyWorkouts: number;
    preferredLongRunDay: string;
    coachingStyle: string;
  };
  targetRace?: {
    distance: string;
    customDistance?: string;
    date: string;
    previousBest?: string;
    goalTime?: string;
  };
}

export interface TrainingPlanResponse {
  weeklyPlans: WeeklyPlan[];
  reasoning?: string;
}

export interface WeeklyPlan {
  week: number;
  phase: 'Base Building' | 'Peak Training' | 'Taper';
  totalMileage: number;
  workouts: Workout[];
}

export interface Workout {
  day: string;
  type: WorkoutType;
  distance: number;
  description: string;
}

export type WorkoutType = 
  | 'Easy Run'
  | 'Long Run'
  | 'Tempo Run'
  | 'Interval Training'
  | 'Recovery Run'
  | 'Rest Day';

export interface WorkoutData {
  date: Date;
  type: WorkoutType;
  distance: number;
  duration: number;
  averagePace: number;
  perceivedEffort: number;
  heartRate?: {
    average: number;
    max: number;
  };
  notes?: string;
}

export interface WorkoutAnalysis {
  rating: number;
  feedback: string;
  recommendations: string[];
  suggestedAdjustments?: {
    type: 'pace' | 'distance' | 'intensity';
    change: string;
    reason: string;
  }[];
}

export interface PlanAdjustments {
  reasoning: string;
  suggestedPlan: TrainingPlanResponse;
}

export interface AIServiceConfig {
  provider: string;
  apiKey: string;
  modelName?: string;
  maxRetries?: number;
  timeout?: number;
}

// AI Service Error Types
export type AIErrorCode = 
  | 'CONFIGURATION'
  | 'AUTHENTICATION'
  | 'RATE_LIMIT'
  | 'API_ERROR'
  | 'INVALID_RESPONSE'
  | 'INVALID_REQUEST'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'UNKNOWN';

export interface AIErrorMetadata {
  retryable: boolean;
  suggestedAction?: string;
}

// Error metadata for different error types
export const AI_ERROR_METADATA: Record<AIErrorCode, AIErrorMetadata> = {
  CONFIGURATION: {
    retryable: false,
    suggestedAction: 'Check API configuration settings'
  },
  AUTHENTICATION: {
    retryable: false,
    suggestedAction: 'Verify API credentials'
  },
  RATE_LIMIT: {
    retryable: true,
    suggestedAction: 'Wait before retrying'
  },
  API_ERROR: {
    retryable: true,
    suggestedAction: 'Retry with exponential backoff'
  },
  INVALID_RESPONSE: {
    retryable: true,
    suggestedAction: 'Validate response format'
  },
  INVALID_REQUEST: {
    retryable: false,
    suggestedAction: 'Check request parameters'
  },
  TIMEOUT: {
    retryable: true,
    suggestedAction: 'Retry with increased timeout'
  },
  NETWORK: {
    retryable: true,
    suggestedAction: 'Check network connectivity'
  },
  UNKNOWN: {
    retryable: false,
    suggestedAction: 'Check error logs for details'
  }
};

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly operation: string,
    public readonly code: AIErrorCode = 'UNKNOWN',
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
  }

  get metadata(): AIErrorMetadata {
    return AI_ERROR_METADATA[this.code];
  }

  get isRetryable(): boolean {
    return this.metadata.retryable;
  }

  get suggestedAction(): string | undefined {
    return this.metadata.suggestedAction;
  }
}