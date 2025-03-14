import { format, parseISO } from "date-fns";
import { isValidDate } from "./date-utils";

// Types
export interface Workout {
  day: string;
  type: string;
  distance: number;
  description: string;
  completed?: boolean;
}

export interface WeeklyPlan {
  week: number;
  phase: string;
  totalMileage: number;
  workouts: Workout[];
}

export interface TrainingPlan {
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
 * Formats a date for display
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
 * Calculates plan metrics
 */
export const calculatePlanMetrics = (weeklyPlans: WeeklyPlan[]) => {
  const totalWeeks = weeklyPlans.length;
  const totalMileage = weeklyPlans.reduce((sum, week) => sum + week.totalMileage, 0);
  const weeklyAverage = Math.round(totalMileage / totalWeeks);

  return { totalWeeks, totalMileage, weeklyAverage };
};

/**
 * Validates training plan data
 */
export const validatePlanData = (plan: TrainingPlan): void => {
  if (!plan || typeof plan !== 'object') {
    console.error('Invalid plan data:', plan);
    throw new Error("Invalid training plan data provided");
  }

  // Log validation attempt with safe data
  const safeLogData = {
    goal: plan?.goal,
    goalType: typeof plan?.goal,
    goalLength: plan?.goal?.length,
    hasWeeklyPlans: Array.isArray(plan?.weeklyPlans),
    weeklyPlansLength: plan?.weeklyPlans?.length,
    startDate: plan?.startDate,
    endDate: plan?.endDate,
  };
  console.log('Validating plan data:', safeLogData);

  if (!plan.goal || typeof plan.goal !== 'string' || plan.goal.trim() === "") {
    throw new Error("Training goal is required and cannot be empty");
  }

  if (!Array.isArray(plan.weeklyPlans) || plan.weeklyPlans.length === 0) {
    throw new Error("Weekly plans are required and must contain at least one week");
  }

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

  plan.weeklyPlans.forEach((week, weekIndex) => {
    if (!Array.isArray(week.workouts)) {
      throw new Error(`Week ${weekIndex + 1} has invalid workouts data`);
    }

    if (week.workouts.length === 0) {
      throw new Error(`Week ${weekIndex + 1} must have at least one workout`);
    }

    week.workouts.forEach((workout, workoutIndex) => {
      if (!workout.day) {
        throw new Error(`Workout ${workoutIndex + 1} in week ${weekIndex + 1} is missing a date`);
      }

      if (!workout.description || workout.description.trim() === "") {
        throw new Error(`Workout ${workoutIndex + 1} in week ${weekIndex + 1} is missing a description`);
      }

      if (!isValidDate(workout.day)) {
        throw new Error(`Invalid date format for workout ${workoutIndex + 1} in week ${weekIndex + 1}: ${workout.day}`);
      }

      const workoutDate = new Date(workout.day);
      if (workoutDate < startDate) {
        throw new Error("Workout date cannot be before plan start date");
      }

      if (workout.distance <= 0) {
        throw new Error("Workout distance must be positive");
      }
    });
  });
};

/**
 * Prepares training plan data for API submission
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