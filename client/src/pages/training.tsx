import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import CalendarView from "@/components/training/calendar-view";
import WeeklyOverview from "@/components/training/weekly-overview";
import DailyWorkout from "@/components/training/daily-workout";
import PlanGenerator from "@/components/training/plan-generator";
import PlanReview from "@/components/training/plan-review";
import ProgramOverview from "@/components/training/program-overview";
import { isAfter, isBefore, startOfDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import HeatMapCalendar from "@/components/training/heat-map-calendar";

export default function Training() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aiQuery, setAiQuery] = useState("");
  const [weeklyAiQuery, setWeeklyAiQuery] = useState("");
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: trainingPlan, isLoading } = useQuery<TrainingPlanWithWeeklyPlans>({
    queryKey: ["/api/training-plans", { userId: 1 }],
    queryFn: async () => {
      const response = await fetch(`/api/training-plans?userId=1`);
      if (!response.ok) {
        throw new Error("Failed to fetch training plan");
      }
      const plans = await response.json();
      return plans.length > 0 ? plans[plans.length - 1] : null;
    },
  });

  // Find the current week's workouts based on selected date
  const currentWeek = trainingPlan?.weeklyPlans?.find(week => {
    const workoutDates = week.workouts.map(w => new Date(w.day));
    const firstDay = workoutDates[0];
    const lastDay = workoutDates[workoutDates.length - 1];
    return selectedDate >= firstDay && selectedDate <= lastDay;
  });

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

  // Find the selected day's workout
  const selectedDayWorkout = currentWeek?.workouts.find(
    workout => new Date(workout.day).toDateString() === selectedDate.toDateString()
  );

  // Generate workout options for the selected day
  const workoutOptions = selectedDayWorkout ? {
    type: selectedDayWorkout.type,
    distance: selectedDayWorkout.distance,
    description: selectedDayWorkout.description,
    options: [
      { title: "Recommended Workout", description: selectedDayWorkout.description },
      ...(selectedDayWorkout.type.toLowerCase().includes("easy") ||
        selectedDayWorkout.type.toLowerCase().includes("recovery") ? [] : [
        {
          title: "Alternative 1",
          description: `Modified ${selectedDayWorkout.type.toLowerCase()} with lower intensity: ${
            selectedDayWorkout.description
              .replace(/(\d+)-(\d+)/g, (_, min, max) => `${Math.round(Number(min) * 0.9)}-${Math.round(Number(max) * 0.9)}`)
              .replace(/(\d+)(?=\s*(?:miles|km|meters))/g, num => Math.round(Number(num) * 0.9).toString())
          }`,
        },
        {
          title: "Alternative 2",
          description: `Alternative ${selectedDayWorkout.type.toLowerCase()} with different structure: ${
            selectedDayWorkout.type.includes("Interval") ?
              selectedDayWorkout.description
                .replace(/(\d+)\s*x\s*(\d+)m/g, (_, sets, dist) => `${Math.round(Number(sets) * 1.5)}x${Math.round(Number(dist) * 0.67)}m`) :
              selectedDayWorkout.description
                .replace(/(\d+)-(\d+)/g, (_, min, max) => `${Math.round(Number(min) * 1.1)}-${Math.round(Number(max) * 1.1)}`)
          }`,
        },
      ]),
    ],
  } : null;

  const handleAIQuery = async (query: string, type: 'overall' | 'weekly') => {
    try {
      setIsSubmittingQuery(true);
      const response = await fetch(`/api/training-plans/${trainingPlan?.id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: query,
          currentPlan: type === 'overall' ? trainingPlan : currentWeek,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to get AI response');
      }

      toast({
        title: "AI Coach Response",
        description: data.reasoning,
        action: data.suggestedPlan ? (
          <Button onClick={async () => {
            try {
              const updateResponse = await fetch(`/api/training-plans/${trainingPlan?.id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data.suggestedPlan),
              });

              if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.details || errorData.error || 'Failed to update plan');
              }

              queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
              toast({
                title: "Success",
                description: "Training plan updated successfully",
              });
            } catch (error) {
              console.error('Plan update error:', error);
              toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to update training plan",
                variant: "destructive",
              });
            }
          }}>
            Apply Changes
          </Button>
        ) : undefined,
      });
    } catch (error) {
      console.error('AI query error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI coach response",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingQuery(false);
      setAiQuery("");
      setWeeklyAiQuery("");
    }
  };

  const calculateWorkoutIntensity = (workout: {
    type: string;
    distance: number;
    description: string;
  }): number => {
    // Base intensity on workout type and distance
    const typeIntensity = workout.type.toLowerCase().includes('interval') ? 1 :
                         workout.type.toLowerCase().includes('tempo') ? 0.8 :
                         workout.type.toLowerCase().includes('long') ? 0.6 :
                         workout.type.toLowerCase().includes('easy') ? 0.3 : 0;

    // Combine with distance factor (normalized to max ~20 miles)
    const distanceIntensity = Math.min(1, workout.distance / 20);

    // Weight type more heavily than distance
    return (typeIntensity * 0.7) + (distanceIntensity * 0.3);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Training</h1>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!trainingPlan) {
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Training</h1>
          <p className="text-muted-foreground mb-4">No training plan found. Create one to get started!</p>
          <PlanGenerator existingPlan={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Training</h1>
        <div className="flex justify-center gap-4 flex-wrap">
          <PlanGenerator existingPlan={true} />
        </div>
      </div>

      <Tabs defaultValue="current" className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="w-full max-w-[280px]">
            <TabsTrigger value="current" className="flex-1">This Week</TabsTrigger>
            <TabsTrigger value="overall" className="flex-1">Training Program</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="current" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {workoutOptions && (
                <DailyWorkout
                  date={selectedDate}
                  workout={workoutOptions}
                />
              )}

              {currentWeek && (
                <WeeklyOverview
                  week={currentWeek}
                  onSelectDay={handleDateSelect}
                  selectedDate={selectedDate}
                />
              )}
            </div>

            <div className="space-y-4 lg:sticky lg:top-8">
              <h3 className="font-medium">Ask About Today's Training</h3>
              <Textarea
                placeholder="Ask about today's workout, this week's focus, or request modifications..."
                value={weeklyAiQuery}
                onChange={(e) => setWeeklyAiQuery(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <Button 
                className="w-full gap-2"
                onClick={() => handleAIQuery(weeklyAiQuery, 'weekly')}
                disabled={!weeklyAiQuery || isSubmittingQuery}
              >
                <MessageCircle className="h-4 w-4" />
                Get Workout Advice
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="overall" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <HeatMapCalendar
                selectedDate={selectedDate}
                onSelect={handleDateSelect}
                workouts={trainingPlan.weeklyPlans.flatMap(week =>
                  week.workouts.map(workout => ({
                    date: new Date(workout.day),
                    intensity: calculateWorkoutIntensity(workout),
                    type: workout.type,
                    distance: workout.distance
                  }))
                )}
                startDate={new Date(trainingPlan.startDate)}
                endDate={new Date(trainingPlan.endDate)}
              />
              <ProgramOverview
                weeklyPlans={trainingPlan.weeklyPlans}
                onSelectWeek={(weekNumber) => {
                  const week = trainingPlan.weeklyPlans.find(w => w.week === weekNumber);
                  if (week) {
                    setSelectedDate(new Date(week.workouts[0].day));
                  }
                }}
                onSelectDay={handleDateSelect}
                selectedDate={selectedDate}
                targetRace={trainingPlan.targetRace}
              />
            </div>

            <div className="space-y-4 lg:sticky lg:top-8">
              <h3 className="font-medium">Ask Your AI Coach</h3>
              <Textarea
                placeholder="Ask about adjusting your overall training plan, long-term goals, or training philosophy..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <Button 
                className="w-full gap-2"
                onClick={() => handleAIQuery(aiQuery, 'overall')}
                disabled={!aiQuery || isSubmittingQuery}
              >
                <MessageCircle className="h-4 w-4" />
                Get AI Coaching Advice
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}