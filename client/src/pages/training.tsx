import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import CalendarView from "@/components/training/calendar-view";
import WeeklyOverview from "@/components/training/weekly-overview";
import DailyWorkout from "@/components/training/daily-workout";
import PlanGenerator from "@/components/training/plan-generator";
import PlanPreview from "@/components/training/plan-preview";
import ProgramOverview from "@/components/training/program-overview";
import { isAfter, isBefore, startOfDay, startOfWeek, endOfWeek, isSameDay, format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageCircle, CalendarDays, BarChart2, History, XCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ProgressTracker from "@/components/training/progress-tracker";
import { StoredPlans } from "@/components/training/stored-plans";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface WorkoutDetailType {
  date: Date;
  workout: {
    type: string;
    distance: number;
    description: string;
    options: Array<{
      title: string;
      description: string;
    }>;
  };
}

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

function getCurrentWeek(trainingPlan: TrainingPlanWithWeeklyPlans | undefined | null): typeof trainingPlan extends null | undefined ? null : (typeof trainingPlan.weeklyPlans)[number] | null {
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
}

const getSelectedWeek = (trainingPlan: TrainingPlanWithWeeklyPlans | undefined | null, selectedDate: Date) => {
  if (!trainingPlan?.weeklyPlans) return null;
  return trainingPlan.weeklyPlans.find(week => {
    const workoutDates = week.workouts.map(w => new Date(w.day));
    const firstDay = workoutDates[0];
    const lastDay = workoutDates[workoutDates.length - 1];
    return selectedDate >= firstDay && selectedDate <= lastDay;
  }) || null;
};

export default function Training() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for training plan
  const { data: trainingPlan, isLoading } = useQuery<TrainingPlanWithWeeklyPlans | null>({
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

  // State management
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [aiQuery, setAiQuery] = useState("");
  const [weeklyAiQuery, setWeeklyAiQuery] = useState("");
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlan, setPreviewPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("current");
  const [showWorkoutDetail, setShowWorkoutDetail] = useState(false);
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetailType | null>(null);
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false); // Added loading state for plan creation

  // Derived state
  const currentWeek = getCurrentWeek(trainingPlan);
  const selectedWeek = getSelectedWeek(trainingPlan, selectedDate);
  const selectedDayWorkout = selectedWeek?.workouts.find(
    workout => isSameDay(new Date(workout.day), selectedDate)
  );

  // Effects
  useEffect(() => {
    setSelectedDate(new Date());
  }, []);

  useEffect(() => {
    if (!currentWeek) return;

    const today = new Date();
    const todayWorkout = currentWeek.workouts.find(w =>
      isSameDay(new Date(w.day), today)
    );

    if (todayWorkout) {
      setSelectedDate(new Date(todayWorkout.day));
    } else {
      setSelectedDate(new Date(currentWeek.workouts[0].day));
    }
  }, [currentWeek]);

  const handlePreviewPlan = (plan: any) => {
    console.log("Previewing plan:", plan);
    if (!plan) {
      console.error("No plan data received");
      return;
    }

    // Force set showPreview to true and update previewPlan state
    setPreviewPlan(plan);
    setShowPreview(true);
    setActiveTab("overall"); // Switch to overall view when previewing
  };

  const handleConfirmPlan = async () => {
    try {
      setIsSubmittingPlan(true); 
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

      await queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
      await queryClient.refetchQueries({ queryKey: ["/api/training-plans"] });

      toast({
        title: "Success",
        description: "Training plan has been created",
        duration: 3000,
      });

      setShowPreview(false);
      setPreviewPlan(null);
      setActiveTab("current");

      setTimeout(() => {
        const currentWeekElement = document.querySelector('[data-current-week]');
        if (currentWeekElement) {
          currentWeekElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

    } catch (error) {
      console.error('Plan creation error:', error);
      toast({
        title: "Error",
        description: "Failed to create training plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPlan(false);
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
        throw new Error(data.details || data.error || 'Failed to adjust plan');
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

  const calculateCompletedMiles = () => {
    if (!currentWeek) return 0;
    return 0;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !trainingPlan) return;
    const planStart = startOfDay(new Date(trainingPlan.startDate));
    const planEnd = startOfDay(new Date(trainingPlan.endDate));
    const selectedDay = startOfDay(date);
    if (isBefore(selectedDay, planStart) || isAfter(selectedDay, planEnd)) {
      return;
    }
    setSelectedDate(date);
  };

  const handleAIQuery = async (query: string, type: 'overall' | 'weekly') => {
    if (!trainingPlan) return;
    try {
      setIsSubmittingQuery(true);
      const response = await fetch(`/api/training-plans/${trainingPlan.id}/adjust`, {
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
              const updateResponse = await fetch(`/api/training-plans/${trainingPlan.id}`, {
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

  const workoutOptions = selectedDayWorkout ? {
    type: selectedDayWorkout.type,
    distance: selectedDayWorkout.distance,
    description: selectedDayWorkout.description,
    options: [
      {
        title: "Recommended Workout",
        description: selectedDayWorkout.description
      },
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
            isSubmitting={isSubmittingPlan}
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Training</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:max-w-[400px] h-10 bg-gradient-to-r from-indigo-400/60 via-purple-400/60 to-pink-400/60 p-0.5">
          <TabsTrigger value="current" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            This Week
          </TabsTrigger>
          <TabsTrigger value="overall" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Training Plan
          </TabsTrigger>
          <TabsTrigger value="stored" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Saved Plans
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="current" className="space-y-6">
            {currentWeek && (
              <ProgressTracker
                completed={calculateCompletedMiles()}
                total={currentWeek.totalMileage}
                label="miles"
              />
            )}
            {workoutOptions && (
              <Card
                onClick={() => {
                  setWorkoutDetail({
                    date: selectedDate,
                    workout: workoutOptions
                  });
                  setShowWorkoutDetail(true);
                }}
                className="hover:bg-accent/5 cursor-pointer transition-colors"
              >
                <CardContent className="pt-6">
                  <DailyWorkout
                    date={selectedDate}
                    workout={workoutOptions}
                  />
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h3 className="font-medium mb-2">Workout Details</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {workoutOptions.type.toLowerCase().includes('easy')
                        ? "Build aerobic base and recover between harder sessions."
                        : workoutOptions.type.toLowerCase().includes('interval')
                        ? "Improve VO2 max and running economy with high-intensity efforts."
                        : workoutOptions.type.toLowerCase().includes('tempo')
                        ? "Improve lactate threshold and maintain pace for longer periods."
                        : workoutOptions.type.toLowerCase().includes('long')
                        ? "Build endurance and train your body to use fat as fuel efficiently."
                        : "Complete the workout as prescribed to build fitness and progress in your training plan."}
                    </p>
                    <div className="text-sm">
                      <strong>Instructions:</strong>
                      <p className="text-muted-foreground mt-1">{workoutOptions.description}</p>
                    </div>
                  </div>
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
          </TabsContent>

          <TabsContent value="overall" className="space-y-6">
            <div className="flex justify-end">
              <PlanGenerator
                existingPlan={!!trainingPlan}
                onPreview={handlePreviewPlan}
              />
            </div>
            {trainingPlan && (
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
                targetRace={trainingPlan.targetRace ? {
                  distance: trainingPlan.targetRace.distance,
                  date: trainingPlan.targetRace.date
                } : undefined}
              />
            )}
          </TabsContent>

          <TabsContent value="stored">
            <StoredPlans onLoadPlan={() => {}} />
          </TabsContent>
        </div>
      </Tabs>

      {workoutDetail && (
        <Dialog open={showWorkoutDetail} onOpenChange={setShowWorkoutDetail}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {workoutDetail.workout.type} - {format(workoutDetail.date, 'EEEE, MMMM d')}
              </DialogTitle>
              <DialogDescription>
                {workoutDetail.workout.distance} miles
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="font-medium mb-2">Workout Goal</h3>
                <p className="text-sm text-muted-foreground">
                  {workoutDetail.workout.type.toLowerCase().includes('easy')
                    ? "Build aerobic base and recover between harder sessions."
                    : workoutDetail.workout.type.toLowerCase().includes('interval')
                    ? "Improve VO2 max and running economy with high-intensity efforts."
                    : workoutDetail.workout.type.toLowerCase().includes('tempo')
                    ? "Improve lactate threshold and maintain pace for longer periods."
                    : workoutDetail.workout.type.toLowerCase().includes('long')
                    ? "Build endurance and train your body to use fat as fuel efficiently."
                    : "Complete the workout as prescribed to build fitness and progress in your training plan."}
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Workout Options</h3>
                <Tabs defaultValue="option-0" className="w-full">
                  <TabsList className="grid grid-cols-3">
                    {workoutDetail.workout.options.map((_, index) => (
                      <TabsTrigger key={`option-${index}`} value={`option-${index}`}>
                        Option {index + 1}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {workoutDetail.workout.options.map((option, index) => (
                    <TabsContent key={`option-${index}`} value={`option-${index}`} className="space-y-4 pt-4">
                      <h4 className="font-medium">{option.title}</h4>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">About {workoutDetail.workout.type.split(' ')[0]} Workouts</h4>
                <p className="text-sm text-muted-foreground">
                  {workoutDetail.workout.type.toLowerCase().includes('easy')
                    ? "Easy runs build your aerobic base and allow your body to recover. They should feel comfortable, and you should be able to hold a conversation."
                    : workoutDetail.workout.type.toLowerCase().includes('interval')
                    ? "Interval workouts include short bursts of high-intensity effort followed by recovery periods. They improve speed, power, and running economy."
                    : workoutDetail.workout.type.toLowerCase().includes('tempo')
                    ? "Tempo runs are sustained efforts at a challenging but controlled pace. They improve your lactate threshold and teach your body to clear lactic acid efficiently."
                    : workoutDetail.workout.type.toLowerCase().includes('long')
                    ? "Long runs build endurance and train your body to use fat as fuel. They prepare you mentally and physically for longer race distances."
                    : "This workout is designed to improve specific aspects of your running fitness as part of your overall training plan."}
                </p>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <div className="flex justify-between w-full">
                <Button variant="outline" className="gap-2" onClick={() => setShowWorkoutDetail(false)}>
                  <XCircle className="h-4 w-4" />
                  Close
                </Button>
                <Button className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Workout
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}