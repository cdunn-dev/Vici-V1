import type { WeeklyPlan, TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { generateTrainingPlan as generateAIPlan } from './ai/openai';

export async function generateTrainingPlan(preferences: {
  startDate: string;
  endDate: string;
  goal: string;
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
    date: string;
    customDistance?: {
      value: number;
      unit: string;
    };
    previousBest?: string;
    goalTime?: string;
  };
}): Promise<TrainingPlanWithWeeklyPlans> {
  // Validate required fields
  if (!preferences.goal) {
    throw new Error('Training goal is required');
  }

  try {
    // Get AI-generated plan
    const aiResponse = await generateAIPlan(preferences);
    if (!aiResponse || !aiResponse.weeklyPlans) {
      throw new Error('Invalid plan generated');
    }

    return {
      id: 0, // Will be assigned by database
      userId: 0, // Will be assigned by database
      active: true, // New plans are active by default
      goal: preferences.goal,
      startDate: preferences.startDate,
      endDate: preferences.endDate,
      targetRace: preferences.targetRace,
      runningExperience: preferences.runningExperience,
      trainingPreferences: preferences.trainingPreferences,
      weeklyPlans: aiResponse.weeklyPlans.map(week => ({
        ...week,
        workouts: week.workouts.map(workout => ({
          ...workout,
          completed: false
        }))
      }))
    };
  } catch (error) {
    console.error('Error generating training plan:', error);
    throw new Error('Failed to generate training plan');
  }
}