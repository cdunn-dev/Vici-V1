import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import CalendarView from "@/components/training/calendar-view";
import WeeklyOverview from "@/components/training/weekly-overview";
import DailyWorkout from "@/components/training/daily-workout";
import PlanGenerator from "@/components/training/plan-generator";
import PlanRecommendations from "@/components/training/plan-recommendations";
import PlanReview from "@/components/training/plan-review";
import ProgramOverview from "@/components/training/program-overview";
import { isAfter, isBefore, startOfDay } from "date-fns";

export default function Training() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: trainingPlan, isLoading } = useQuery<TrainingPlanWithWeeklyPlans>({
    queryKey: ["/api/training-plans", { userId: 1 }],
    queryFn: async () => {
      const response = await fetch(`/api/training-plans?userId=1`);
      if (!response.ok) {
        throw new Error("Failed to fetch training plan");
      }
      const plans = await response.json();
      // Return the most recent plan
      return plans[plans.length - 1];
    },
  });

  // Find the current week's workouts based on selected date
  const currentWeek = trainingPlan?.weeklyPlans?.find(week => {
    const workoutDates = week.workouts.map(w => new Date(w.day));
    const firstDay = workoutDates[0];
    const lastDay = workoutDates[workoutDates.length - 1];
    return selectedDate >= firstDay && selectedDate <= lastDay;
  });

  // Find the selected day's workout
  const selectedDayWorkout = currentWeek?.workouts.find(
    workout => new Date(workout.day).toDateString() === selectedDate.toDateString()
  );

  // Handle date selection, ensuring it's within the plan's date range
  const handleDateSelect = (date: Date | null) => {
    if (!date || !trainingPlan) return;

    const planStart = startOfDay(new Date(trainingPlan.startDate));
    const planEnd = startOfDay(new Date(trainingPlan.endDate));
    const selectedDay = startOfDay(date);

    if (isBefore(selectedDay, planStart) || isAfter(selectedDay, planEnd)) {
      return;
    }

    setSelectedDate(date);
  };

  // Generate workout options for the selected day
  const workoutOptions = selectedDayWorkout ? {
    type: selectedDayWorkout.type,
    distance: selectedDayWorkout.distance,
    description: selectedDayWorkout.description,
    options: [
      {
        title: "Original Plan",
        description: selectedDayWorkout.description,
      },
      {
        title: "Alternative 1",
        description: `Modified ${selectedDayWorkout.type.toLowerCase()} with different intensity: ${selectedDayWorkout.description.replace(/\d+/g, num => Math.round(Number(num) * 0.9))}`,
      },
      {
        title: "Alternative 2",
        description: `Alternative ${selectedDayWorkout.type.toLowerCase()} workout: ${selectedDayWorkout.description.replace(/\d+/g, num => Math.round(Number(num) * 1.1))}`,
      },
    ],
  } : null;

  if (isLoading) {
    return <div>Loading training plan...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Training</h1>
        <div className="flex gap-4">
          <PlanGenerator />
          {trainingPlan && (
            <PlanReview
              planId={trainingPlan.id}
              currentPlan={trainingPlan}
              onPlanUpdate={() => queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] })}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CalendarView
            selectedDate={selectedDate}
            onSelect={handleDateSelect}
            events={trainingPlan?.weeklyPlans?.flatMap(week => 
              week.workouts.map(workout => ({
                date: new Date(workout.day),
                title: `${workout.type} - ${workout.distance} miles`,
              }))
            ) || []}
          />
          <div className="mt-8">
            <ProgramOverview
              weeklyPlans={trainingPlan?.weeklyPlans || []}
              onSelectWeek={(weekNumber) => {
                const week = trainingPlan?.weeklyPlans.find(w => w.week === weekNumber);
                if (week) {
                  setSelectedDate(new Date(week.workouts[0].day));
                }
              }}
              onSelectDay={handleDateSelect}
              selectedDate={selectedDate}
            />
          </div>
          <div className="mt-8">
            <PlanRecommendations
              planId={trainingPlan?.id || 1}
              recentWorkouts={[]} // This would be populated with actual workout data
            />
          </div>
        </div>

        <div className="space-y-8">
          {currentWeek && (
            <WeeklyOverview
              week={currentWeek}
              onSelectDay={handleDateSelect}
              selectedDate={selectedDate}
            />
          )}
          {workoutOptions && (
            <DailyWorkout
              date={selectedDate}
              workout={workoutOptions}
            />
          )}
        </div>
      </div>
    </div>
  );
}