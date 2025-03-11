import { useMemo } from "react";
import { isSameDay, startOfWeek, endOfWeek } from "date-fns";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";

/**
 * Hook for calculating workout-related statistics and retrieving relevant workout data
 * based on the provided training plan and selected date.
 * 
 * @param trainingPlan - The user's current training plan with weekly workout details
 * @param selectedDate - The currently selected date in the calendar view
 * @returns An object containing:
 *  - currentWeek: The week that contains the current date
 *  - selectedWeek: The week that contains the selected date
 *  - selectedDayWorkout: The workout scheduled for the selected date
 *  - stats: Object containing training statistics (completed miles, weeks, progress)
 */
export function useWorkoutCalculations(
  trainingPlan: TrainingPlanWithWeeklyPlans | null | undefined,
  selectedDate: Date
) {
  const currentWeek = useMemo(() => {
    if (!trainingPlan?.weeklyPlans) return null;

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    return trainingPlan.weeklyPlans.find(week => {
      const workoutDates = week.workouts.map(w => new Date(w.day));
      const firstDay = workoutDates[0];
      const lastDay = workoutDates[workoutDates.length - 1];
      return (
        (firstDay >= weekStart && firstDay <= weekEnd) ||
        (lastDay >= weekStart && lastDay <= weekEnd)
      );
    }) || null;
  }, [trainingPlan]);

  const selectedWeek = useMemo(() => {
    if (!trainingPlan?.weeklyPlans) return null;
    return trainingPlan.weeklyPlans.find(week => {
      const workoutDates = week.workouts.map(w => new Date(w.day));
      const firstDay = workoutDates[0];
      const lastDay = workoutDates[workoutDates.length - 1];
      return selectedDate >= firstDay && selectedDate <= lastDay;
    }) || null;
  }, [trainingPlan, selectedDate]);

  const selectedDayWorkout = useMemo(() => {
    return selectedWeek?.workouts.find(
      workout => isSameDay(new Date(workout.day), selectedDate)
    );
  }, [selectedWeek, selectedDate]);

  const stats = useMemo(() => {
    if (!trainingPlan?.weeklyPlans) return {
      completedMiles: 0,
      completedWeeks: 0,
      progressPercentage: 0
    };

    let completedMiles = 0;
    let completedWeeks = 0;

    trainingPlan.weeklyPlans.forEach(week => {
      const lastWorkoutOfWeek = [...week.workouts]
        .sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime())[0];

      if (lastWorkoutOfWeek && new Date(lastWorkoutOfWeek.day) < new Date()) {
        completedWeeks++;
      }

      week.workouts.forEach(workout => {
        if (workout.completed) {
          completedMiles += workout.distance;
        }
      });
    });

    const progressPercentage = (completedWeeks / trainingPlan.weeklyPlans.length) * 100;

    return {
      completedMiles,
      completedWeeks,
      progressPercentage
    };
  }, [trainingPlan]);

  return {
    currentWeek,
    selectedWeek,
    selectedDayWorkout,
    stats
  };
}