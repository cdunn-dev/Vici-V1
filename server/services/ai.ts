import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type TrainingPreferences = {
  goal: string;          // e.g. "Complete first marathon", "Improve 5K time"
  currentLevel: string;  // e.g. "Beginner", "Intermediate", "Advanced"
  weeklyMileage: number;
  daysPerWeek: number;
  targetRace?: {
    distance: string;
    date: string;
  };
};

type WorkoutAnalysis = {
  perceivedEffort: number;
  actualPace: number;    // minutes per km
  targetPace: number;    // minutes per km
  distance: number;      // in meters
  notes?: string;
};

export async function generateTrainingPlan(preferences: TrainingPreferences) {
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

Format the response as a JSON object with the following structure:
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
4. Periodization based on experience level and goals`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  return JSON.parse(response || "{}");
}

export async function analyzeWorkoutAndSuggestAdjustments(
  recentWorkouts: WorkoutAnalysis[],
  currentPlan: {
    goal: string;
    weeklyMileage: number;
    currentPhase: string;
  }
) {
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
5. Risk of overtraining`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  return JSON.parse(response || "{}");
}