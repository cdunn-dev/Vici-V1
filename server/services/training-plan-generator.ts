import { generateTrainingPlan as generateAIPlan } from './ai/openai';
import { TrainingPlanError, ERROR_MESSAGES } from './types/training-plan';
import { differenceInWeeks } from 'date-fns';

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
}) {
  try {
    // Check for required fields
    if (!preferences.goal || preferences.goal.trim() === '') {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_GOAL
      );
    }

    if (!preferences.startDate || !preferences.endDate) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_DATE_RANGE
      );
    }

    // Validate dates
    const startDate = new Date(preferences.startDate);
    const endDate = new Date(preferences.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_DATE_RANGE
      );
    }

    if (endDate <= startDate) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_DATE_RANGE
      );
    }

    const weeksBetween = differenceInWeeks(endDate, startDate);
    if (weeksBetween < 4) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_DATE_RANGE
      );
    }

    // Validate running experience
    const validLevels = ['beginner', 'intermediate', 'advanced'];
    const validFitnessLevels = ['poor', 'fair', 'good', 'excellent'];

    if (!preferences.runningExperience?.level || 
        !validLevels.includes(preferences.runningExperience.level.toLowerCase())) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_EXPERIENCE_LEVEL
      );
    }

    if (!preferences.runningExperience?.fitnessLevel || 
        !validFitnessLevels.includes(preferences.runningExperience.fitnessLevel.toLowerCase())) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_EXPERIENCE_LEVEL
      );
    }

    // Validate training preferences
    if (!preferences.trainingPreferences) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_PREFERENCES
      );
    }

    const { trainingPreferences } = preferences;

    if (typeof trainingPreferences.weeklyRunningDays !== 'number' || 
        trainingPreferences.weeklyRunningDays < 1 || 
        trainingPreferences.weeklyRunningDays > 7) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_PREFERENCES
      );
    }

    if (typeof trainingPreferences.maxWeeklyMileage !== 'number' || 
        trainingPreferences.maxWeeklyMileage < 1) {
      throw new TrainingPlanError(
        'INVALID_PARAMETERS',
        ERROR_MESSAGES.INVALID_PREFERENCES
      );
    }
  } catch (error) {
    if (error instanceof TrainingPlanError) {
      throw error;
    }
    throw new TrainingPlanError(
      'VALIDATION_ERROR',
      ERROR_MESSAGES.VALIDATION_ERROR,
      error
    );
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
    let aiResponse;
    try {
      aiResponse = await generateAIPlan(preferences);
    } catch (error) {
      console.error('AI service error:', error);
      throw new TrainingPlanError(
        'AI_SERVICE_ERROR',
        ERROR_MESSAGES.AI_SERVICE_UNAVAILABLE,
        error
      );
    }

    console.log('Received AI response:', JSON.stringify(aiResponse, null, 2));

    // Validate AI response
    if (!aiResponse || !aiResponse.weeklyPlans || !Array.isArray(aiResponse.weeklyPlans)) {
      console.error('Invalid AI response format:', aiResponse);
      throw new TrainingPlanError(
        'GENERATION_FAILED',
        ERROR_MESSAGES.PLAN_GENERATION_FAILED
      );
    }

    // Transform AI response into final plan
    const plan = {
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

    // Validate weekly mileage doesn't exceed max
    for (const week of plan.weeklyPlans) {
      if (week.totalMileage > preferences.trainingPreferences.maxWeeklyMileage) {
        console.warn(`Week ${week.week} exceeds max mileage (${week.totalMileage} > ${preferences.trainingPreferences.maxWeeklyMileage})`);
        throw new TrainingPlanError(
          'VALIDATION_ERROR',
          'Generated plan exceeds maximum weekly mileage limit'
        );
      }
    }

    console.log('Generated final plan:', JSON.stringify(plan, null, 2));
    return plan;

  } catch (error) {
    console.error('Error generating training plan:', error);
    if (error instanceof TrainingPlanError) {
      throw error;
    }
    throw new TrainingPlanError(
      'GENERATION_FAILED',
      ERROR_MESSAGES.PLAN_GENERATION_FAILED,
      error
    );
  }
}