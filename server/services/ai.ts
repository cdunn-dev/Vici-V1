import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

type TrainingPreferences = {
  goal: string;
  currentLevel: string;
  weeklyMileage: number;
  daysPerWeek: number;
  targetRace?: {
    distance: string;
    date: string;
  };
};

// Fallback training plan generator
function generateBasicTrainingPlan(preferences: TrainingPreferences) {
  const workoutTypes = {
    easy: "Easy Run",
    long: "Long Run",
    tempo: "Tempo Run",
    intervals: "Interval Training",
    rest: "Rest Day"
  };

  // Calculate base distances based on weekly mileage
  const easyDistance = Math.round(preferences.weeklyMileage * 0.15);
  const longDistance = Math.round(preferences.weeklyMileage * 0.3);
  const tempoDistance = Math.round(preferences.weeklyMileage * 0.2);
  const intervalDistance = Math.round(preferences.weeklyMileage * 0.15);

  // Generate 12 weeks of basic training
  const weeklyPlans = Array.from({ length: 12 }, (_, weekIndex) => {
    const weekNumber = weekIndex + 1;
    const phase = weekNumber <= 4 ? "Base Building" :
                 weekNumber <= 8 ? "Peak Training" : "Taper";

    // Adjust mileage based on phase
    const multiplier = phase === "Taper" ? 0.8 :
                      phase === "Peak Training" ? 1.1 : 1.0;

    const workouts = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() + (weekIndex * 7) + day);

      let workout;
      if (day === 0 || day === 2 || day === 4) { // Mon, Wed, Fri
        workout = {
          day: date.toISOString().split('T')[0],
          type: workoutTypes.easy,
          distance: Math.round(easyDistance * multiplier),
          description: "Easy-paced run to build aerobic base. Keep heart rate in Zone 2."
        };
      } else if (day === 1) { // Tuesday
        workout = {
          day: date.toISOString().split('T')[0],
          type: workoutTypes.intervals,
          distance: Math.round(intervalDistance * multiplier),
          description: "8-10 x 400m intervals at 5K race pace with 200m easy jog recovery."
        };
      } else if (day === 3) { // Thursday
        workout = {
          day: date.toISOString().split('T')[0],
          type: workoutTypes.tempo,
          distance: Math.round(tempoDistance * multiplier),
          description: "20-30 minutes at half marathon pace, with warm-up and cool-down."
        };
      } else if (day === 5) { // Saturday
        workout = {
          day: date.toISOString().split('T')[0],
          type: workoutTypes.long,
          distance: Math.round(longDistance * multiplier),
          description: "Long run at conversational pace. Focus on time on feet."
        };
      } else { // Sunday
        workout = {
          day: date.toISOString().split('T')[0],
          type: workoutTypes.rest,
          distance: 0,
          description: "Rest and recovery day. Light stretching or cross-training optional."
        };
      }
      workouts.push(workout);
    }

    return {
      week: weekNumber,
      phase,
      totalMileage: Math.round(preferences.weeklyMileage * multiplier),
      workouts
    };
  });

  return { weeklyPlans };
}

// Helper function to generate more natural prompt text
function generatePromptFromPreferences(preferences: TrainingPreferences): string {
  return `As an expert running coach, create a training plan for the following runner:

Goal: ${preferences.goal}
Current Level: ${preferences.currentLevel}
Weekly Mileage: ${preferences.weeklyMileage} miles
Training Days Per Week: ${preferences.daysPerWeek}
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

export async function generateTrainingPlan(preferences: TrainingPreferences) {
  try {
    console.log("Generating training plan with preferences:", preferences);

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set");
      return generateBasicTrainingPlan(preferences);
    }

    const prompt = generatePromptFromPreferences(preferences);
    console.log("Sending prompt to Gemini API");

    const result = await model.generateContent(prompt);
    console.log("Received response from Gemini API");
    const response = await result.response;
    const text = response.text();
    console.log("Raw Gemini response:", text);

    try {
      const parsedResponse = JSON.parse(text);
      console.log("Successfully parsed JSON response");
      return parsedResponse;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response that failed to parse:", text);
      return generateBasicTrainingPlan(preferences);
    }
  } catch (error) {
    console.error("Error generating training plan:", error);
    return generateBasicTrainingPlan(preferences);
  }
}


export async function analyzeWorkoutAndSuggestAdjustments(
  recentWorkouts: WorkoutAnalysis[],
  currentPlan: {
    goal: string;
    weeklyMileage: number;
    currentPhase: string;
  }
) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const prompt = `Analyze the following recent workouts and suggest adjustments to the training plan:

Recent Workouts:
${recentWorkouts.map(w => `
- Distance: ${w.distance}m
- Actual Pace: ${w.actualPace} min/km
- Target Pace: ${w.targetPace} min/km
- Perceived Effort: ${w.perceivedEffort}/10
${w.notes ? `- Notes: ${w.notes}` : ''}`).join('\n')}

Current Training Plan:
- Goal: ${currentPlan.goal}
- Weekly Mileage: ${currentPlan.weeklyMileage} miles
- Current Phase: ${currentPlan.currentPhase}

Analyze the data and provide recommendations in JSON format:
{
  "analysis": "Brief analysis of performance trends",
  "adjustments": [
    {
      "type": "pace|distance|intensity",
      "recommendation": "Specific adjustment recommendation",
      "reason": "Reasoning behind the recommendation"
    }
  ],
  "confidenceScore": 0.85
}

Consider these factors in your analysis:
1. Perceived effort vs actual pace relationship
2. Progress towards target paces
3. Recovery patterns
4. Training load management
5. Risk of overtraining

Return only the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", text);
      return {
        analysis: "Unable to analyze workouts at this time.",
        adjustments: [],
        confidenceScore: 0
      };
    }
  } catch (error) {
    console.error("Error analyzing workouts:", error);
    return {
      analysis: "Unable to analyze workouts at this time.",
      adjustments: [],
      confidenceScore: 0
    };
  }
}

export async function generateTrainingPlanAdjustments(
  feedback: string,
  currentPlan: any
) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    console.log("Generating training plan adjustments with feedback:", feedback);

    const cleanedPlan = JSON.stringify(currentPlan, null, 2)
      .replace(/\\n/g, ' ')
      .replace(/\\"/g, '"');

    const prompt = `You are an expert running coach. Review this training plan feedback and suggest adjustments.

Feedback from runner: "${feedback}"

Current Training Plan: ${cleanedPlan}

Provide your response in this exact JSON format:
{
  "reasoning": "Brief explanation of recommended changes",
  "suggestedPlan": {
    "weeklyPlans": [
      {
        "week": number,
        "phase": "string",
        "totalMileage": number,
        "workouts": [
          {
            "day": "YYYY-MM-DD",
            "type": "string",
            "distance": number,
            "description": "string"
          }
        ]
      }
    ]
  }
}`;

    console.log("Sending prompt to Gemini API");
    const result = await model.generateContent(prompt);
    console.log("Received response from Gemini API");
    const response = await result.response;
    const text = response.text();
    console.log("Raw Gemini response:", text);

    try {
      const parsedResponse = JSON.parse(text);
      console.log("Successfully parsed JSON response");
      return parsedResponse;
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response that failed to parse:", text);
      throw new Error("Failed to parse AI response - invalid JSON format");
    }
  } catch (error) {
    console.error("Error in generateTrainingPlanAdjustments:", error);
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