import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { TrainingPreferences } from "../../shared/schema";

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

function generatePromptFromPreferences(preferences: TrainingPreferences): string {
  return `As an expert running coach, create a training plan for the following runner:

Goal: ${preferences.goal}
Goal Description: ${preferences.goalDescription}
Current Level: ${preferences.runningExperience?.level || "Beginner"}
Weekly Mileage: ${preferences.trainingPreferences?.maxWeeklyMileage || 20} miles
Training Days Per Week: ${preferences.trainingPreferences?.weeklyRunningDays || 4}
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

// Legacy function kept for compatibility
export async function oldGenerateTrainingPlan(preferences: TrainingPreferences) {
  // Fallback implementation
  // This can be removed once the new implementation is confirmed working
  console.log("Using legacy training plan generation");
  // ... legacy implementation
}

export async function generateTrainingPlan(preferences: TrainingPreferences) {
  try {
    console.log("Generating training plan with preferences:", preferences);

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }

    const prompt = generatePromptFromPreferences(preferences);
    console.log("Sending prompt to OpenAI API");

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert running coach who creates personalized training plans.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Received response from OpenAI");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating training plan:", error);
    throw error;
  }
}

export async function analyzeWorkoutAndSuggestAdjustments(recentWorkouts: any[], planInfo: any) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    const prompt = `
    As an AI running coach, analyze these recent workouts and provide feedback:

    Recent Workouts:
    ${JSON.stringify(recentWorkouts, null, 2)}

    Current Training Plan Information:
    ${JSON.stringify(planInfo, null, 2)}

    Provide suggestions for adjustments to the training plan based on the recent performance.
    Return your response in this JSON format:
    {
      "analysis": "string with detailed workout analysis",
      "recommendations": "string with specific recommendations",
      "adjustedNextWorkouts": [
        {
          "day": "YYYY-MM-DD",
          "type": "workout type",
          "distance": number,
          "description": "string"
        }
      ]
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert running coach who analyzes workout data and provides personalized training recommendations.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error analyzing workouts:", error);
    throw error;
  }
}

export async function generateTrainingPlanAdjustments(feedback: string, currentPlan: any) {
  try {
    console.log("Generating training plan adjustments with feedback:", feedback);

    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not set");
      throw new Error("OpenAI API key is not configured");
    }

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

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert running coach who creates personalized training plans and adjustments based on user feedback.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Received adjustment response from OpenAI");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating training plan adjustments:", error);
    throw error;
  }
}

type WorkoutAnalysis = {
  perceivedEffort: number;
  actualPace: number;    // minutes per km
  targetPace: number;    // minutes per km
  distance: number;      // in meters
  notes?: string;
};