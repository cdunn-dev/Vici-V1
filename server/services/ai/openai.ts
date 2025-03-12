import OpenAI from "openai";
import { BaseAIService } from "./base";
import {
  AIServiceConfig,
  TrainingPreferences,
  WorkoutData,
  TrainingPlanResponse,
  WorkoutAnalysis,
  PlanAdjustments,
  AIServiceError,
} from "./types";

export async function generateTrainingPlan(preferences: TrainingPreferences): Promise<TrainingPlanResponse> {
  const openaiService = new OpenAIService({ 
    apiKey: process.env.OPENAI_API_KEY,
    modelName: 'gpt-4o'
  });
  return await openaiService.generateTrainingPlan(preferences);
}

export class OpenAIService extends BaseAIService {
  private client: OpenAI;

  constructor(config: AIServiceConfig) {
    super(config);
    if (!config.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    this.client = new OpenAI({ apiKey: config.apiKey });
  }

  protected async makeRequest<T>(
    prompt: string,
    operation: string,
    responseFormat: "json" | "text" = "json",
  ): Promise<T> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.config.modelName || "gpt-4o", 
        messages: [
          {
            role: "system",
            content:
              "You are an expert running coach who creates personalized training plans.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format:
          responseFormat === "json" ? { type: "json_object" } : undefined,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      return responseFormat === "json" ? JSON.parse(content) : (content as T);
    } catch (error) {
      throw new AIServiceError(
        `OpenAI request failed: ${(error as Error).message}`,
        this.name,
        operation,
        error as Error,
      );
    }
  }

  async generateTrainingPlan(
    preferences: TrainingPreferences,
  ): Promise<TrainingPlanResponse> {
    return this.withRetry(async () => {
      const prompt = this.getTrainingPlanPrompt(preferences);
      return await this.makeRequest<TrainingPlanResponse>(
        prompt,
        "generateTrainingPlan",
      );
    }, "generate training plan");
  }

  async analyzeWorkout(workout: WorkoutData): Promise<WorkoutAnalysis> {
    return this.withRetry(async () => {
      const prompt = this.getWorkoutAnalysisPrompt(workout);
      return await this.makeRequest<WorkoutAnalysis>(prompt, "analyzeWorkout");
    }, "analyze workout");
  }

  async generateAdjustments(
    feedback: string,
    currentPlan: any,
  ): Promise<PlanAdjustments> {
    return this.withRetry(async () => {
      const prompt = `
        As an AI running coach, consider this feedback and current training plan:

        User Feedback:
        ${feedback}

        Current Training Plan:
        ${JSON.stringify(currentPlan, null, 2)}

        Based on the feedback, suggest adjustments to the training plan.
        Return your response in this JSON format:
        {
          "reasoning": "string explaining your analysis and recommendations",
          "suggestedPlan": { detailed plan object with the same structure as the current plan }
        }
        `;

      return await this.makeRequest<PlanAdjustments>(
        prompt,
        "generateAdjustments",
      );
    }, "generate adjustments");
  }

  private getTrainingPlanPrompt(preferences: TrainingPreferences): string {
    return `
      Create a personalized running training plan based on these preferences:
      ${JSON.stringify(preferences, null, 2)}

      Return your response in this JSON format:
      {
        "weeklyPlans": [
          {
            "week": number,
            "phase": string,
            "totalMileage": number,
            "workouts": [
              {
                "day": "YYYY-MM-DD",
                "type": string,
                "distance": number,
                "description": string
              }
            ]
          }
        ]
      }
    `;
  }

  private getWorkoutAnalysisPrompt(workout: WorkoutData): string {
    return `
      Analyze this workout and provide feedback:
      ${JSON.stringify(workout, null, 2)}

      Return your response in this JSON format:
      {
        "feedback": "string with detailed analysis",
        "adjustments": "string with suggested improvements"
      }
    `;
  }
}