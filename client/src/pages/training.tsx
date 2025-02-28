import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import CalendarView from "@/components/training/calendar-view";
import WeeklyOverview from "@/components/training/weekly-overview";
import DailyWorkout from "@/components/training/daily-workout";
import PlanGenerator from "@/components/training/plan-generator";
import PlanPreview from "@/components/training/plan-preview";
import ProgramOverview from "@/components/training/program-overview";
import { isAfter, isBefore, startOfDay, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ProgressTracker from "@/components/training/progress-tracker";
import { Card, CardContent } from "@/components/ui/card";

function calculateCompletedWeeks(trainingPlan: TrainingPlanWithWeeklyPlans): number {
  const today = new Date();
  let completedWeeks = 0;
  const sortedPlans = [...trainingPlan.weeklyPlans].sort((a, b) => a.week - b.week);
  for (const plan of sortedPlans) {
    const lastWorkoutOfWeek = [...plan.workouts].sort((a, b) =>
      new Date(b.day).getTime() - new Date(a.day).getTime()
    )[0];
    if (lastWorkoutOfWeek && new Date(lastWorkoutOfWeek.day) < today) {
      completedWeeks++;
    } else {
      break;
    }
  }
  return completedWeeks;
}

function getCurrentWeek(trainingPlan: TrainingPlanWithWeeklyPlans | null) {
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
  });
}

const getSelectedWeek = (trainingPlan: TrainingPlanWithWeeklyPlans | null, selectedDate: Date) => {
  if (!trainingPlan?.weeklyPlans) return null;
  return trainingPlan.weeklyPlans.find(week => {
    const workoutDates = week.workouts.map(w => new Date(w.day));
    const firstDay = workoutDates[0];
    const lastDay = workoutDates[workoutDates.length - 1];
    return selectedDate >= firstDay && selectedDate <= lastDay;
  });
};

export default function Training() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aiQuery, setAiQuery] = useState("");
  const [weeklyAiQuery, setWeeklyAiQuery] = useState("");
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("current");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch training plan data first
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

  // Derived state
  const currentWeek = getCurrentWeek(trainingPlan);
  const selectedWeek = getSelectedWeek(trainingPlan, selectedDate);
  const selectedDayWorkout = selectedWeek?.workouts.find(
    workout => isSameDay(new Date(workout.day), selectedDate)
  );

  // Effects that depend on trainingPlan
  useEffect(() => {
    if (trainingPlan) {
      const today = new Date();
      const todayWorkout = currentWeek?.workouts.find(w =>
        isSameDay(new Date(w.day), today)
      );

      if (todayWorkout) {
        setSelectedDate(new Date(todayWorkout.day));
      } else if (currentWeek?.workouts.length > 0) {
        setSelectedDate(new Date(currentWeek.workouts[0].day));
      }
    }
  }, [trainingPlan, currentWeek]);

  const workoutOptions = selectedDayWorkout ? {
    type: selectedDayWorkout.type,
    distance: selectedDayWorkout.distance,
    description: selectedDayWorkout.description,
    options: [
      { title: "Recommended Workout", description: selectedDayWorkout.description },
      ...(selectedDayWorkout.type.toLowerCase().includes('easy') ||
        selectedDayWorkout.type.toLowerCase().includes('recovery') ? [] : [
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
            selectedDayWorkout.type.includes('Interval') ?
              selectedDayWorkout.description
                .replace(/(\d+)\s*x\s*(\d+)m/g, (_, sets, dist) => `${Math.round(Number(sets) * 1.5)}x${Math.round(Number(dist) * 0.67)}m`) :
              selectedDayWorkout.description
                .replace(/(\d+)-(\d+)/g, (_, min, max) => `${Math.round(Number(min) * 1.1)}-${Math.round(Number(max) * 1.1)}`)
          }`,
        },
      ]),
    ],
  } : null;

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    if (!date || !trainingPlan) return;
    const planStart = startOfDay(new Date(trainingPlan.startDate));
    const planEnd = startOfDay(new Date(trainingPlan.endDate));
    const selectedDay = startOfDay(date);

    if (isBefore(selectedDay, planStart) || isAfter(selectedDay, planEnd)) {
      return;
    }
    setSelectedDate(date);
  };

  // Preview plan functionality
  const handlePreviewPlan = (plan: any) => {
    if (!plan) {
      console.error("No plan data received");
      return;
    }
    setPreviewPlan(plan);
    setShowPreview(true);
  };

  // Handle plan confirmation
  const handleConfirmPlan = async () => {
    try {
      const response = await fetch(`/api/training-plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...previewPlan,
          userId: 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate plan");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
      toast({
        title: "Success",
        description: "Training plan has been created",
        duration: 3000,
      });
      setShowPreview(false);
      setActiveTab("current"); // Switch to This Week view after approval
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create training plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAdjustPlan = async (feedback: string) => {
    try {
      setIsSubmittingQuery(true);
      const response = await fetch(`/api/training-plans/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback,
          currentPlan: previewPlan,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to get AI response');
      }

      setPreviewPlan(data);
      toast({
        title: "Plan Adjusted",
        description: "Your training plan has been updated based on your feedback.",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to adjust the training plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingQuery(false);
    }
  };

  const calculateCompletedMiles = () => {
    if (!currentWeek) return 0;
    // TODO: In the future, this will come from completed workouts
    return 0;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Training</h1>
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  // If in preview mode or no plan exists, show the preview/creation flow
  if (showPreview || !trainingPlan) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Training</h1>
        </div>

        {showPreview ? (
          <PlanPreview
            planDetails={previewPlan}
            onConfirm={handleConfirmPlan}
            onAdjust={handleAdjustPlan}
            onBack={() => setShowPreview(false)}
          />
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No training plan found. Create one to get started!</p>
            <PlanGenerator existingPlan={false} onPreview={handlePreviewPlan} />
          </div>
        )}
      </div>
    );
  }

  // Show the main training interface with tabs
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Training</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-center">
          <TabsList className="w-full max-w-[240px] h-9">
            <TabsTrigger value="current">This Week</TabsTrigger>
            <TabsTrigger value="overall">Training Program</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-6">
          <TabsContent value="current" className="space-y-6">
            {currentWeek && (
              <ProgressTracker
                completedMiles={calculateCompletedMiles()}
                totalMiles={currentWeek.totalMileage}
              />
            )}
            <div className="space-y-6">
              {currentWeek && selectedDayWorkout && (
                <Card className="shadow-sm">
                  <CardContent className="pt-6">
                    <DailyWorkout
                      date={selectedDate}
                      workout={workoutOptions}
                    />
                  </CardContent>
                </Card>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  {currentWeek && (
                    <WeeklyOverview
                      week={currentWeek}
                      onSelectDay={handleDateSelect}
                      selectedDate={selectedDate}
                    />
                  )}
                </div>

                <div className="space-y-4">
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
            </div>
          </TabsContent>

          <TabsContent value="overall" className="space-y-6">
            <div className="flex justify-end">
              <PlanGenerator
                existingPlan={!!trainingPlan}
                onPreview={handlePreviewPlan}
              />
            </div>
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
              goal={trainingPlan.goal || "No goal set"}
              endDate={new Date(trainingPlan.endDate)}
              targetRace={trainingPlan.targetRace}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}