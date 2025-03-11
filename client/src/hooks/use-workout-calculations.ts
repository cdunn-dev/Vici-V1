import { useMemo } from "react";
import { isSameDay, startOfWeek, endOfWeek } from "date-fns";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";

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
