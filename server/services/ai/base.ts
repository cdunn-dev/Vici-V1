import { AIProvider, AIServiceConfig, AIServiceError, TrainingPreferences, WorkoutData, TrainingPlanResponse, WorkoutAnalysis, PlanAdjustments, AIErrorCode } from './types';

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
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        console.error(`[${this.name}] Attempt ${attempt} failed for ${operationName}:`, error);
        lastError = error as Error;

        if (error instanceof AIServiceError && !error.isRetryable) {
          console.log(`[${this.name}] Non-retryable error encountered, stopping retry attempts`);
          throw error;
        }

        if (attempt === maxRetries) {
          console.log(`[${this.name}] Max retries (${maxRetries}) reached for ${operationName}`);
          break;
        }

        const backoffTime = Math.pow(2, attempt) * 1000;
        console.log(`[${this.name}] Waiting ${backoffTime}ms before retry ${attempt + 1}`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        attempt++;
      }
    }

    throw new AIServiceError(
      `Failed to ${operationName} after ${maxRetries} attempts`,
      this.name,
      operationName,
      'NETWORK',
      lastError
    );
  }

  protected abstract getTrainingPlanPrompt(preferences: TrainingPreferences): string;

  protected abstract getWorkoutAnalysisPrompt(workout: WorkoutData): string;

  abstract generateTrainingPlan(preferences: TrainingPreferences): Promise<TrainingPlanResponse>;
  abstract analyzeWorkout(workout: WorkoutData): Promise<WorkoutAnalysis>;
  abstract generateAdjustments(feedback: string, currentPlan: any): Promise<PlanAdjustments>;
}