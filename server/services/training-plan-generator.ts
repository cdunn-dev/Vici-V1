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
}) {
  // Validate required fields
  if (!preferences.goal) {
    console.error('Training plan generation failed: missing goal');
    throw new Error('Training goal is required');
  }

  try {
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
    throw new Error('Failed to generate training plan');
  }
}