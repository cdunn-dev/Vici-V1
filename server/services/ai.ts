import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

import { GoogleGenerativeAI } from "@google/generative-ai";

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

export async function generateTrainingPlan(preferences: TrainingPreferences) {
  try {
    console.log("Generating training plan with preferences:", preferences);
    
    // Make sure the API key is set properly
    if (!process.env.GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY is not set");
      return generateBasicTrainingPlan(preferences);
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Generate a detailed running training plan with the following requirements:
- Goal: ${preferences.goal}
- Current Level: ${preferences.currentLevel}
- Weekly Mileage: ${preferences.weeklyMileage} miles
- Training Days: ${preferences.daysPerWeek} days per week
${preferences.targetRace ? `- Target Race: ${preferences.targetRace.distance} on ${preferences.targetRace.date}` : ''}

Generate a structured training plan that includes:
1. Weekly mileage targets that gradually increase
2. Daily workouts incorporating:
   - Easy runs for recovery
   - Speed work (intervals, tempo runs)
   - Long runs for endurance
   - Rest/cross-training days
3. Training phases (base building, peak training, taper)
4. Progression that follows the 10% rule for weekly mileage increases
5. Recovery weeks every 3-4 weeks
6. Detailed workout descriptions with pacing guidance

The response must be a valid JSON object with this exact structure:
{
  "weeklyPlans": [
    {
      "week": 1,
      "phase": "Base Building",
      "totalMileage": 25,
      "workouts": [
        {
          "day": "2024-03-01",
          "type": "Easy Run",
          "distance": 5,
          "description": "Easy-paced run to build aerobic base. Keep heart rate in Zone 2 (60-70% max HR)."
        }
      ]
    }
  ]
}

Ensure the plan follows these guidelines:
1. Progressive overload principle
2. Adequate recovery between hard workouts
3. Appropriate intensity distribution (80/20 rule)
4. Periodization based on experience level and goals

Return only the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", text);
      return generateBasicTrainingPlan(preferences);
    }
  } catch (error) {
    console.error("Error generating training plan:", error);
    return generateBasicTrainingPlan(preferences);
  }
}

type WorkoutAnalysis = {
  perceivedEffort: number;
  actualPace: number;    // minutes per km
  targetPace: number;    // minutes per km
  distance: number;      // in meters
  notes?: string;
};

export async function analyzeWorkoutAndSuggestAdjustments(
  recentWorkouts: WorkoutAnalysis[],
  currentPlan: {
    goal: string;
    weeklyMileage: number;
    currentPhase: string;
  }
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
    const response = result.response;
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

// Add this new function after the existing ones
export async function generateTrainingPlanAdjustments(
  feedback: string,
  currentPlan: any
) {
  try {
    // Make sure the API key is set properly
    if (!process.env.GOOGLE_API_KEY) {
      console.error("GOOGLE_API_KEY is not set");
      throw new Error("Google API key not configured");
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Review this training plan feedback and suggest appropriate adjustments:

Feedback: "${feedback}"

Current Training Plan:
${JSON.stringify(currentPlan, null, 2)}

Analyze the feedback and provide adjustments in this JSON format:
{
  "reasoning": "Detailed explanation of why these changes are recommended",
  "suggestedPlan": {
    "weeklyPlans": [
      // Modified weekly plans following the same structure as the current plan
    ]
  }
}

Consider these factors when suggesting adjustments:
1. Maintain overall training progression
2. Address the specific concerns in the feedback
3. Keep the adjustments realistic and achievable
4. Preserve the basic structure while modifying specific aspects
5. Include clear explanations for recommended changes

Return only the JSON object, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", text);
      throw new Error("Failed to generate plan adjustments");
    }
  } catch (error) {
    console.error("Error generating plan adjustments:", error);
    throw error;
  }
}