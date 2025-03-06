import { addWeeks, eachWeekOfInterval, format, addDays } from 'date-fns';
import type { WeeklyPlan, TrainingPlanWithWeeklyPlans } from "@shared/schema";

export function generateTrainingPlan(preferences: {
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
}): TrainingPlanWithWeeklyPlans {
  const startDate = new Date(preferences.startDate);
  const endDate = new Date(preferences.endDate);

  // Calculate total weeks
  const weeks = eachWeekOfInterval({
    start: startDate,
    end: endDate
  });

  // Calculate starting mileage based on experience
  let startingMileage = preferences.trainingPreferences.maxWeeklyMileage * 0.6;
  if (preferences.runningExperience.level === "Beginner") {
    startingMileage = Math.min(15, preferences.trainingPreferences.maxWeeklyMileage * 0.4);
  } else if (preferences.runningExperience.level === "Intermediate") {
    startingMileage = preferences.trainingPreferences.maxWeeklyMileage * 0.5;
  }

  // Calculate phase transition points
  const totalWeeks = weeks.length;
  const basePhaseEnd = Math.floor(totalWeeks * 0.6);  // 60% base building
  const peakPhaseEnd = Math.floor(totalWeeks * 0.8);  // 20% peak training
  // Remaining 20% is tapering

  // Generate weekly plans
  const weeklyPlans: WeeklyPlan[] = weeks.map((weekStart, index) => {
    // Progressive mileage build-up
    const weekNumber = index + 1;
    const buildupPhase = Math.floor(totalWeeks * 0.7);
    const taperPhase = Math.floor(totalWeeks * 0.2);

    let weeklyMileage = startingMileage;
    if (weekNumber <= buildupPhase) {
      // Build up phase
      weeklyMileage = startingMileage + (
        (preferences.trainingPreferences.maxWeeklyMileage - startingMileage) * 
        (weekNumber / buildupPhase)
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

    // Determine training phase
    let phase = "Base Building";
    if (weekNumber > basePhaseEnd) {
      phase = weekNumber > peakPhaseEnd ? "Tapering" : "Peak Training";
    }

    const workouts: WeeklyPlan['workouts'] = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const preferredLongRunIndex = daysOfWeek.indexOf(preferences.trainingPreferences.preferredLongRunDay);

    // Distribute workouts across the week
    for (let i = 0; i < preferences.trainingPreferences.weeklyRunningDays; i++) {
      const dayIndex = (preferredLongRunIndex + i) % 7;
      const date = addDays(weekStart, dayIndex);

      let workoutType = "Easy Run";
      let distance = Math.round(weeklyMileage / preferences.trainingPreferences.weeklyRunningDays);
      let description = "Easy-paced run to build endurance";

      // Long run on preferred day
      if (dayIndex === preferredLongRunIndex) {
        workoutType = "Long Run";
        distance = Math.round(weeklyMileage * 0.3); // 30% of weekly mileage
        description = "Long run at an easy, conversational pace";
      } 
      // Add quality workouts if requested
      else if (preferences.trainingPreferences.weeklyWorkouts > 0 && 
               i < preferences.trainingPreferences.weeklyWorkouts &&
               dayIndex !== (preferredLongRunIndex + 1) % 7) { // Avoid day after long run

        if (preferences.targetRace?.distance.includes("5k") || preferences.targetRace?.distance.includes("10k")) {
          workoutType = "Speed Work";
          description = "Interval training: 8-12 x 400m repeats with 200m recovery jogs";
        } else {
          workoutType = "Tempo Run";
          description = "20-30 minutes at half marathon pace";
        }
        distance = Math.round(weeklyMileage * 0.15); // 15% of weekly mileage
      }

      workouts.push({
        day: format(date, "yyyy-MM-dd"),
        type: workoutType,
        distance,
        description,
        completed: false,
      });
    }

    return {
      week: weekNumber,
      phase,
      totalMileage: weeklyMileage,
      workouts,
    };
  });

  return {
    id: 0, // Will be assigned by database
    userId: 0, // Will be assigned by database
    goal: preferences.goal,
    startDate: preferences.startDate,
    endDate: preferences.endDate,
    targetRace: preferences.targetRace,
    runningExperience: preferences.runningExperience,
    trainingPreferences: preferences.trainingPreferences,
    weeklyPlans,
  };
}