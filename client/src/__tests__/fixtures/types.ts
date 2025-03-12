import { TrainingPlan, WeeklyPlan, Workout } from '@/lib/training-plan-utils';

export type MockTrainingPlan = TrainingPlan & {
  id?: number;
};

export type TestFixtures = {
  validTrainingPlan: MockTrainingPlan;
  invalidTrainingPlan: Partial<MockTrainingPlan>;
  minimalTrainingPlan: MockTrainingPlan;
};

export interface TestWorkout extends Omit<Workout, 'id' | 'completed'> {
  id?: number;
  completed?: boolean;
  workoutStats?: {
    averagePace: number;
    maxPace: number;
    totalTime: number;
  };
}

export interface TestWeeklyPlan extends Omit<WeeklyPlan, 'workouts'> {
  id?: number;
  workouts: TestWorkout[];
  stats?: {
    completedWorkouts: number;
    totalDistance: number;
    avgPace: number;
  };
}