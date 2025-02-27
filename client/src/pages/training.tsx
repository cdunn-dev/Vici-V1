import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CalendarView from "@/components/training/calendar-view";
import WeeklyOverview from "@/components/training/weekly-overview";
import DailyWorkout from "@/components/training/daily-workout";
import PlanGenerator from "@/components/training/plan-generator";
import PlanRecommendations from "@/components/training/plan-recommendations";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PlanReview from "@/components/training/plan-review";

export default function Training() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();

  const { data: trainingPlan } = useQuery({
    queryKey: ["/api/training-plans", 1], // Assuming user ID 1 for now
  });

  // Mock data for demonstration
  const mockWorkouts = [
    {
      distance: 5000,
      actualPace: 5.5,
      targetPace: 5.3,
      perceivedEffort: 7,
      notes: "Felt strong but pace was slightly slower than target",
    },
    {
      distance: 8000,
      actualPace: 5.2,
      targetPace: 5.3,
      perceivedEffort: 8,
      notes: "Good session, maintained target pace throughout",
    },
  ];

  const mockWeek = {
    phase: "Base Building",
    workouts: [
      {
        day: "2024-01-08",
        type: "Easy Run",
        distance: 6,
        description: "Easy run with 8x100m strides",
      },
      {
        day: "2024-01-09",
        type: "Workout",
        distance: 10,
        description: "6-8 miles tempo @ ~8:30-9:35/mile pace",
      },
      {
        day: "2024-01-10",
        type: "Recovery",
        distance: 6,
        description: "Easy run focused on recovery",
      },
    ],
  };

  const mockWorkout = {
    type: "Tempo Run",
    distance: 10,
    description: "6-8 miles tempo with warm-up and cool-down",
    options: [
      {
        title: "Option 1",
        description: "10 x 1k @ ~8:30 w/60s jog recovery",
      },
      {
        title: "Option 2",
        description: "5 x 2k @ ~8:35 w/90s jog recovery",
      },
      {
        title: "Option 3",
        description: "3 x 3k @ ~8:40 w/2m jog recovery",
      },
    ],
  };

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
            onSelect={(date) => date && setSelectedDate(date)}
            events={[]}
          />
          <div className="mt-8">
            <PlanRecommendations
              planId={1} // Replace with actual plan ID
              recentWorkouts={mockWorkouts}
            />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <h3 className="font-medium mb-4">Adjust Training Plan</h3>
            <div className="space-y-4">
              <Input placeholder="Add notes or adjustments..." />
              <Button className="w-full">Save Changes</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <WeeklyOverview week={mockWeek} />
      <DailyWorkout date={selectedDate} workout={mockWorkout} />
    </div>
  );
}