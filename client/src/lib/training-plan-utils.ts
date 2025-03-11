import { format, parseISO, addWeeks } from "date-fns";
import { ErrorMessages } from "./error-utils";
import { isValidDate } from "./date-utils";

// Types
/**
 * Represents a single workout in a training plan
 */
export interface Workout {
  day: string;
  type: string;
  distance: number;
  description: string;
  completed: boolean;
}

/**
 * Represents a week of workouts in a training plan
 */
export interface WeeklyPlan {
  week: number;
  phase: string;
  totalMileage: number;
  workouts: Workout[];
}

/**
 * Represents a complete training plan with all its components
 */
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
 * @param planData - The raw training plan data
 * @param userId - The ID of the user creating the plan
 * @returns A cleaned version of the plan data ready for API submission
 */
export const preparePlanData = (planData: TrainingPlan, userId: number): TrainingPlan => {
  return {
    userId,
    name: planData.name || `Training Plan - ${planData.goal}`,
    goal: planData.goal,
    goalDescription: planData.goalDescription || "",
    startDate: planData.startDate,
    endDate: planData.endDate,
    weeklyMileage: planData.weeklyMileage,
    weeklyPlans: planData.weeklyPlans.map(week => ({
      week: week.week,
      phase: week.phase,
      totalMileage: week.totalMileage,
      workouts: week.workouts.map(workout => ({
        day: workout.day,
        type: workout.type,
        distance: workout.distance,
        description: workout.description,
        completed: false
      }))
    })),
    targetRace: planData.targetRace ? {
      distance: planData.targetRace.distance,
      date: planData.targetRace.date,
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
 * Calculates various metrics for a training plan
 * @param weeklyPlans - Array of weekly plans to analyze
 * @returns Object containing total weeks, total mileage, and weekly average
 */
export const calculatePlanMetrics = (weeklyPlans: WeeklyPlan[]) => {
  const totalWeeks = weeklyPlans.length;
  const totalMileage = weeklyPlans.reduce((sum, week) => sum + week.totalMileage, 0);
  const weeklyAverage = Math.round(totalMileage / totalWeeks);

  return { totalWeeks, totalMileage, weeklyAverage };
};

/**
 * Returns the appropriate style class for a workout type
 * @param workoutType - The type of workout
 * @returns CSS class string for styling the workout badge
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
 * Formats a date for display
 * @param dateString - The date string to format
 * @param formatStr - Optional format string for date-fns
 * @returns Formatted date string for display
 */
export const formatDateForDisplay = (dateString: string, formatStr: string = "MMM d"): string => {
  if (!dateString || typeof dateString !== 'string') {
    return "Invalid date";
  }

  try {
    const parsedDate = parseISO(dateString);
    if (isNaN(parsedDate.getTime())) {
      return "Invalid date";
    }
    return format(parsedDate, formatStr);
  } catch (error) {
    console.error("Date display formatting error:", error);
    return "Invalid date";
  }
};

/**
 * Validates a training plan's data structure
 * @param plan - The training plan to validate
 * @throws Error if validation fails
 */
export const validatePlanData = (plan: TrainingPlan): void => {
  // Required fields validation
  if (!plan.goal || plan.goal.trim() === "") {
    throw new Error("Training goal is required and cannot be empty");
  }

  if (!Array.isArray(plan.weeklyPlans) || plan.weeklyPlans.length === 0) {
    throw new Error("Weekly plans are required and must contain at least one week");
  }

  // Date validation with improved error handling using our date utilities
  try {
    if (!plan.startDate || !plan.endDate) {
      throw new Error("Start date and end date are required");
    }

    if (!isValidDate(plan.startDate)) {
      throw new Error(`Invalid start date format: ${plan.startDate}`);
    }

    if (!isValidDate(plan.endDate)) {
      throw new Error(`Invalid end date format: ${plan.endDate}`);
    }

    const startDate = new Date(plan.startDate);
    const endDate = new Date(plan.endDate);

    if (endDate <= startDate) {
      throw new Error("End date must be after start date");
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Invalid date format";
    throw new Error(`Date validation error: ${errorMessage}`);
  }

  // Weekly plans validation with improved error handling
  plan.weeklyPlans.forEach((week, weekIndex) => {
    if (!Array.isArray(week.workouts) || week.workouts.length === 0) {
      throw new Error(`Week ${weekIndex + 1} must have at least one workout`);
    }

    week.workouts.forEach((workout, workoutIndex) => {
      if (!workout.day) {
        throw new Error(`Workout ${workoutIndex + 1} in week ${weekIndex + 1} is missing a date`);
      }

      if (!isValidDate(workout.day)) {
        throw new Error(`Invalid date format for workout ${workoutIndex + 1} in week ${weekIndex + 1}: ${workout.day}`);
      }
    });
  });
};