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

export class AIServiceError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}
