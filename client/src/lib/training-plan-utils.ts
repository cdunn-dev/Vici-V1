import { format, parseISO, addWeeks } from "date-fns";
import { ErrorMessages } from "./error-utils";

// Types
export interface Workout {
  day: string;
  type: string;
  distance: number;
  description: string;
  completed: boolean;
}

export interface WeeklyPlan {
  week: number;
  phase: string;
  totalMileage: number;
  workouts: Workout[];
}

export interface TrainingPlan {
  id?: number;
  userId?: number;
  name: string;
  goal: string;
  goalDescription?: string;
  startDate: string;
  endDate: string;
  weeklyMileage: number;
  weeklyPlans: WeeklyPlan[];
  targetRace?: {
    distance: string;
    date: string;
    customDistance?: string;
    previousBest?: string;
    goalTime?: string;
  } | null;
  runningExperience: {
    level: string;
    fitnessLevel: string;
  };
  trainingPreferences: {
    weeklyRunningDays: number;
    maxWeeklyMileage: number;
    weeklyWorkouts: number;
    preferredLongRunDay: string;
    coachingStyle: string;
  };
  is_active: boolean;
}

/**
 * Prepares training plan data for API submission
 */
export const preparePlanData = (planData: TrainingPlan, userId: number): TrainingPlan => {
  return {
    userId,
    name: planData.name || `Training Plan - ${planData.goal}`,
    goal: planData.goal,
    goalDescription: planData.goalDescription || "",
    startDate: formatDateForApi(planData.startDate),
    endDate: formatDateForApi(planData.endDate),
    weeklyMileage: planData.weeklyMileage,
    weeklyPlans: planData.weeklyPlans.map(week => ({
      week: week.week,
      phase: week.phase,
      totalMileage: week.totalMileage,
      workouts: week.workouts.map(workout => ({
        day: formatDateForApi(workout.day),
        type: workout.type,
        distance: workout.distance,
        description: workout.description,
        completed: false
      }))
    })),
    targetRace: planData.targetRace ? {
      distance: planData.targetRace.distance,
      date: formatDateForApi(planData.targetRace.date),
      customDistance: planData.targetRace.customDistance,
      previousBest: planData.targetRace.previousBest,
      goalTime: planData.targetRace.goalTime
    } : null,
    runningExperience: {
      level: planData.runningExperience.level,
      fitnessLevel: planData.runningExperience.fitnessLevel
    },
    trainingPreferences: {
      weeklyRunningDays: planData.trainingPreferences.weeklyRunningDays,
      maxWeeklyMileage: planData.trainingPreferences.maxWeeklyMileage,
      weeklyWorkouts: planData.trainingPreferences.weeklyWorkouts,
      preferredLongRunDay: planData.trainingPreferences.preferredLongRunDay,
      coachingStyle: planData.trainingPreferences.coachingStyle
    },
    is_active: true
  };
};

/**
 * Calculates training plan metrics
 */
export const calculatePlanMetrics = (weeklyPlans: WeeklyPlan[]) => {
  const totalWeeks = weeklyPlans.length;
  const totalMileage = weeklyPlans.reduce((sum, week) => sum + week.totalMileage, 0);
  const weeklyAverage = Math.round(totalMileage / totalWeeks);

  return { totalWeeks, totalMileage, weeklyAverage };
};

/**
 * Returns the appropriate style class for a workout type
 */
export const getWorkoutBadgeStyle = (workoutType: string): string => {
  const type = workoutType.toLowerCase();
  if (type.includes("easy")) {
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  } else if (type.includes("long")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
  }
  return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
};

/**
 * Formats a date string for API submission
 */
export const formatDateForApi = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      throw new Error(ErrorMessages.INVALID_DATE);
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error("Date API formatting error:", error);
    throw new Error(`Invalid date format: ${dateString}`);
  }
};

/**
 * Formats a date for display
 */
export const formatDateForDisplay = (dateString: string, formatStr: string = "MMM d"): string => {
  try {
    return format(parseISO(dateString), formatStr);
  } catch (error) {
    console.error("Date display formatting error:", error);
    return "Invalid date";
  }
};

/**
 * Validates a training plan's data structure
 */
export const validatePlanData = (plan: TrainingPlan): void => {
  if (!plan.goal) {
    throw new Error("Training goal is required");
  }

  if (!plan.weeklyPlans || !Array.isArray(plan.weeklyPlans)) {
    throw new Error("Weekly plans are required and must be an array");
  }

  // Validate start and end dates
  const startDate = new Date(plan.startDate);
  const endDate = new Date(plan.endDate);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error("Invalid start or end date");
  }

  if (endDate <= startDate) {
    throw new Error("End date must be after start date");
  }

  // Validate weekly plans
  plan.weeklyPlans.forEach((week, weekIndex) => {
    if (!week.workouts || !Array.isArray(week.workouts)) {
      throw new Error(`Week ${weekIndex + 1} must have an array of workouts`);
    }

    week.workouts.forEach((workout, workoutIndex) => {
      if (!workout.day) {
        throw new Error(`Workout ${workoutIndex + 1} in week ${weekIndex + 1} is missing a date`);
      }

      const workoutDate = new Date(workout.day);
      if (isNaN(workoutDate.getTime())) {
        throw new Error(`Invalid date format for workout ${workoutIndex + 1} in week ${weekIndex + 1}`);
      }
    });
  });
};
