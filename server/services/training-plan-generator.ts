import { generateTrainingPlan as generateAIPlan } from './ai/openai';

// Validate required fields and throw appropriate errors
function validateTrainingPlanPreferences(preferences: {
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
}) {
  // Check for required fields
  if (!preferences.goal || preferences.goal.trim() === '') {
    throw new Error('Training goal is required');
  }

  if (!preferences.startDate || preferences.startDate.trim() === '') {
    throw new Error('Start date is required');
  }

  if (!preferences.endDate || preferences.endDate.trim() === '') {
    throw new Error('End date is required');
  }

  // Validate running experience
  if (!preferences.runningExperience?.level) {
    throw new Error('Running experience level is required');
  }

  if (!preferences.runningExperience?.fitnessLevel) {
    throw new Error('Fitness level is required');
  }

  // Validate training preferences
  if (!preferences.trainingPreferences) {
    throw new Error('Training preferences are required');
  }

  const { trainingPreferences } = preferences;

  if (typeof trainingPreferences.weeklyRunningDays !== 'number' || trainingPreferences.weeklyRunningDays < 1) {
    throw new Error('Weekly running days must be at least 1');
  }

  if (typeof trainingPreferences.maxWeeklyMileage !== 'number' || trainingPreferences.maxWeeklyMileage < 1) {
    throw new Error('Maximum weekly mileage must be at least 1');
  }
}

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
}) {
  try {
    // Validate required fields
    validateTrainingPlanPreferences(preferences);

    console.log('Generating training plan with preferences:', JSON.stringify(preferences, null, 2));

    // Get AI-generated plan
    const aiResponse = await generateAIPlan(preferences);
    console.log('Received AI response:', JSON.stringify(aiResponse, null, 2));

    if (!aiResponse || !aiResponse.weeklyPlans) {
      console.error('Invalid AI response:', aiResponse);
      throw new Error('Invalid plan generated');
    }

    // Transform AI response into final plan
    const plan = {
      id: 0, // Will be assigned by database
      userId: 0, // Will be assigned by database
      active: true, // New plans are active by default
      name: preferences.name || `Training Plan - ${preferences.goal}`,
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

    console.log('Generated final plan:', JSON.stringify(plan, null, 2));
    return plan;

  } catch (error) {
    console.error('Error generating training plan:', error);
    throw error instanceof Error ? error : new Error('Failed to generate training plan');
  }
}