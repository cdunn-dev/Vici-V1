import { AIProvider, AIServiceConfig, AIServiceError, TrainingPreferences, WorkoutData, TrainingPlanResponse, WorkoutAnalysis, PlanAdjustments } from './types';

export abstract class BaseAIService implements AIProvider {
  protected config: AIServiceConfig;
  readonly name: string;

  constructor(config: AIServiceConfig) {
    this.config = config;
    this.name = config.provider;
  }

  protected abstract makeRequest<T>(
    prompt: string,
    operation: string,
    responseFormat?: 'json' | 'text'
  ): Promise<T>;

  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = this.config.maxRetries || 3
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt === maxRetries) break;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw new AIServiceError(
      `Failed to ${operationName} after ${maxRetries} attempts`,
      this.name,
      operationName,
      lastError
    );
  }

  protected getTrainingPlanPrompt(preferences: TrainingPreferences): string {
    return `As an expert running coach, create a training plan for the following runner:

Goal: ${preferences.goal}
Goal Description: ${preferences.goalDescription}
Current Level: ${preferences.runningExperience.level}
Weekly Mileage: ${preferences.trainingPreferences.maxWeeklyMileage} miles
Training Days Per Week: ${preferences.trainingPreferences.weeklyRunningDays}
${preferences.targetRace ? `Target Race: ${preferences.targetRace.distance} on ${preferences.targetRace.date}` : 'No specific target race'}

Create a plan using this exact JSON format:
{
  "weeklyPlans": [
    {
      "week": number,
      "phase": "Base Building|Peak Training|Taper",
      "totalMileage": number,
      "workouts": [
        {
          "day": "YYYY-MM-DD",
          "type": "Easy Run|Long Run|Tempo Run|Interval Training|Rest Day",
          "distance": number,
          "description": "string"
        }
      ]
    }
  ]
}`;
  }

  protected getWorkoutAnalysisPrompt(workout: WorkoutData): string {
    return `Analyze this running workout and provide feedback:

Date: ${workout.date}
Type: ${workout.type}
Distance: ${workout.distance} miles
Duration: ${workout.duration} minutes
Average Pace: ${workout.averagePace} min/mile
Perceived Effort: ${workout.perceivedEffort}/10
${workout.heartRate ? `Average HR: ${workout.heartRate.average}bpm\nMax HR: ${workout.heartRate.max}bpm` : ''}
${workout.notes ? `Notes: ${workout.notes}` : ''}

Provide analysis in this JSON format:
{
  "rating": number (1-5),
  "feedback": "string",
  "recommendations": ["string"],
  "suggestedAdjustments": [
    {
      "type": "pace|distance|intensity",
      "change": "string",
      "reason": "string"
    }
  ]
}`;
  }

  abstract generateTrainingPlan(preferences: TrainingPreferences): Promise<TrainingPlanResponse>;
  abstract analyzeWorkout(workout: WorkoutData): Promise<WorkoutAnalysis>;
  abstract generateAdjustments(feedback: string, currentPlan: any): Promise<PlanAdjustments>;
}
