import { addWeeks, eachWeekOfInterval, format } from 'date-fns';

interface WorkoutDay {
  day: string;
  type: string;
  distance: number;
  description: string;
}

interface WeeklyPlan {
  week: number;
  totalMileage: number;
  workouts: WorkoutDay[];
}

export function generateTrainingPlan(preferences: {
  startDate: string;
  endDate: Date;
  runningExperience: {
    level: string;
    fitnessLevel: string;
  };
  trainingPreferences: {
    weeklyRunningDays: number;
    maxWeeklyMileage: number;
    weeklyWorkouts: number;
    preferredLongRunDay: string;
  };
  targetRace?: {
    distance: string;
    date: string;
  };
}): { weeklyPlans: WeeklyPlan[]; suggestions?: { mileage?: string; workouts?: string } } {
  const startDate = new Date(preferences.startDate);
  const endDate = preferences.endDate;

  // Calculate total weeks
  const weeks = eachWeekOfInterval({
    start: startDate,
    end: endDate
  });

  // Beginner-specific adjustments and suggestions
  let suggestions;
  if (preferences.runningExperience.level === "Beginner") {
    const suggestedMileage = Math.min(20, preferences.trainingPreferences.maxWeeklyMileage);
    const suggestedWorkouts = Math.min(1, preferences.trainingPreferences.weeklyWorkouts);

    suggestions = {
      mileage: preferences.trainingPreferences.maxWeeklyMileage > 20 
        ? "For beginners, we recommend starting with no more than 20 miles per week to build safely."
        : undefined,
      workouts: preferences.trainingPreferences.weeklyWorkouts > 1
        ? "As a beginner, we suggest starting with just one quality workout per week to avoid injury risk."
        : undefined
    };

    // Override user preferences if they exceed recommended limits
    preferences.trainingPreferences.maxWeeklyMileage = Math.min(20, preferences.trainingPreferences.maxWeeklyMileage);
    preferences.trainingPreferences.weeklyWorkouts = Math.min(1, preferences.trainingPreferences.weeklyWorkouts);
    preferences.trainingPreferences.weeklyRunningDays = Math.min(4, preferences.trainingPreferences.weeklyRunningDays);
  }

  // Calculate starting mileage based on experience
  let startingMileage = preferences.trainingPreferences.maxWeeklyMileage * 0.6;
  if (preferences.runningExperience.level === "Beginner") {
    startingMileage = Math.min(10, preferences.trainingPreferences.maxWeeklyMileage * 0.4);
  } else if (preferences.runningExperience.level === "Intermediate") {
    startingMileage = preferences.trainingPreferences.maxWeeklyMileage * 0.5;
  }

  // Generate weekly plans
  const weeklyPlans: WeeklyPlan[] = weeks.map((weekStart, index) => {
    // Progressive mileage build-up
    const weekNumber = index + 1;
    const totalWeeks = weeks.length;
    const buildupPhase = Math.floor(totalWeeks * 0.7);
    const taperPhase = Math.floor(totalWeeks * 0.2);

    let weeklyMileage = startingMileage;
    if (weekNumber <= buildupPhase) {
      // Build up phase - more gradual for beginners
      const buildupRate = preferences.runningExperience.level === "Beginner" ? 0.05 : 0.1;
      weeklyMileage = startingMileage + (
        (preferences.trainingPreferences.maxWeeklyMileage - startingMileage) * 
        (weekNumber / buildupPhase) * buildupRate * 10
      );
    } else if (weekNumber > (totalWeeks - taperPhase)) {
      // Taper phase
      const taperWeek = weekNumber - (totalWeeks - taperPhase);
      weeklyMileage = preferences.trainingPreferences.maxWeeklyMileage * 
        (1 - (0.2 * (taperWeek / taperPhase)));
    } else {
      // Peak phase
      weeklyMileage = preferences.trainingPreferences.maxWeeklyMileage;
    }

    weeklyMileage = Math.round(weeklyMileage);

    // Generate workouts for the week
    const workouts: WorkoutDay[] = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const preferredLongRunIndex = daysOfWeek.indexOf(preferences.trainingPreferences.preferredLongRunDay);

    // For beginners, ensure rest days between runs
    const availableRunDays = preferences.runningExperience.level === "Beginner"
      ? [0, 2, 4, 6].slice(0, preferences.trainingPreferences.weeklyRunningDays)
      : Array.from({ length: preferences.trainingPreferences.weeklyRunningDays }, (_, i) => i);

    // Distribute workouts across the week
    availableRunDays.forEach((dayOffset) => {
      const dayIndex = (preferredLongRunIndex + dayOffset) % 7;
      const date = addWeeks(weekStart, 0);
      date.setDate(date.getDate() + dayIndex);

      let workoutType = "Easy Run";
      let distance = Math.round(weeklyMileage / preferences.trainingPreferences.weeklyRunningDays);
      let description = preferences.runningExperience.level === "Beginner"
        ? "Easy-paced run at a conversational pace. You should be able to speak in complete sentences."
        : "Easy-paced run to build endurance";

      // Long run on preferred day
      if (dayIndex === preferredLongRunIndex) {
        workoutType = "Long Run";
        // Beginners have shorter long runs
        const longRunPercent = preferences.runningExperience.level === "Beginner" ? 0.25 : 0.3;
        distance = Math.round(weeklyMileage * longRunPercent);
        description = preferences.runningExperience.level === "Beginner"
          ? "Longest run of the week. Keep the pace very easy and focus on time on feet rather than speed."
          : "Long run at an easy, conversational pace";
      } 
      // Add quality workouts if requested and not for recovery
      else if (preferences.trainingPreferences.weeklyWorkouts > 0 && 
               dayOffset !== 1 && // Not the day after long run
               workouts.length < preferences.trainingPreferences.weeklyWorkouts) {

        // Beginner-friendly workout descriptions
        if (preferences.runningExperience.level === "Beginner") {
          workoutType = "Tempo Run";
          description = "10-15 minutes at a 'comfortably hard' pace, with easy running before and after";
          distance = Math.round(weeklyMileage * 0.15);
        } else {
          if (preferences.targetRace?.distance.includes("5k") || preferences.targetRace?.distance.includes("10k")) {
            workoutType = "Speed Work";
            description = "Interval training: 8-12 x 400m repeats with 200m recovery jogs";
          } else {
            workoutType = "Tempo Run";
            description = "20-30 minutes at half marathon pace";
          }
          distance = Math.round(weeklyMileage * 0.15);
        }
      }

      workouts.push({
        day: format(date, "yyyy-MM-dd"),
        type: workoutType,
        distance,
        description,
      });
    });

    return {
      week: weekNumber,
      totalMileage: weeklyMileage,
      workouts,
    };
  });

  return { weeklyPlans, suggestions };
}