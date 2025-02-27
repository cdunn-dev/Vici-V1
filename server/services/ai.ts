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

export async function generateTrainingPlan(preferences: TrainingPreferences) {
  const prompt = `Generate a detailed running training plan with the following requirements:
- Goal: ${preferences.goal}
- Current Level: ${preferences.currentLevel}
- Weekly Mileage: ${preferences.weeklyMileage} miles
- Training Days: ${preferences.daysPerWeek} days per week
${preferences.targetRace ? `- Target Race: ${preferences.targetRace.distance} on ${preferences.targetRace.date}` : ''}

Generate a structured training plan that includes:
1. Weekly mileage targets
2. Daily workouts with:
   - Type (easy run, tempo, intervals, etc.)
   - Distance
   - Description
3. Training phases
4. Recovery periods

Format the response as a JSON object with the following structure:
{
  "weeklyPlans": [
    {
      "week": 1,
      "phase": "Base Building",
      "totalMileage": 25,
      "workouts": [
        {
          "day": "Monday",
          "type": "Easy Run",
          "distance": 5,
          "description": "Easy-paced run to build aerobic base"
        }
      ]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "gpt-3.5-turbo",
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  return JSON.parse(response);
}
