import { useState, useEffect } from "react";
import { format, isSameDay } from "date-fns";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { useTrainingPlan } from "@/hooks/use-training-plan";
import { useWorkoutCalculations } from "@/hooks/use-workout-calculations";
import CalendarView from "@/components/training/calendar-view";
import WeeklyOverview from "@/components/training/weekly-overview";
import DailyWorkout from "@/components/training/daily-workout";
import PlanGenerator from "@/components/training/plan-generator";
import PlanPreview from "@/components/training/plan-preview";
import ProgramOverview from "@/components/training/program-overview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MessageCircle, CalendarDays, BarChart2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ProgressTracker from "@/components/training/progress-tracker";
import { StoredPlans } from "@/components/training/stored-plans";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import DayView from "@/components/training/day-view";
import WeekView from "@/components/training/week-view";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAsyncAction } from "@/hooks/use-async-action";

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

export default function Training() {
  return (
    <ErrorBoundary>
      <TrainingContent />
    </ErrorBoundary>
  );
}

function TrainingContent() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<"current" | "overall" | "stored">("current");
  const [aiQuery, setAiQuery] = useState<string>("");
  const [weeklyAiQuery, setWeeklyAiQuery] = useState<string>("");
  const [showWorkoutDetail, setShowWorkoutDetail] = useState<boolean>(false);
  const [workoutDetail, setWorkoutDetail] = useState<WorkoutDetailType | null>(null);
  const [showDayView, setShowDayView] = useState<boolean>(false);
  const [showWeekView, setShowWeekView] = useState<boolean>(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutDetailType | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<any>(null);

  const {
    trainingPlan,
    isLoading,
    previewPlan,
    showPreview,
    setPreviewPlan,
    setShowPreview,
    createPlan,
    isCreating,
    adjustPlan,
    reorderWorkouts,
  } = useTrainingPlan({
    onPlanCreated: () => setActiveTab("current"),
  });

  const {
    currentWeek,
    selectedWeek: selectedWeek2,
    selectedDayWorkout,
    stats
  } = useWorkoutCalculations(trainingPlan, selectedDate);

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

  const handlePreviewPlan = (plan: TrainingPlanWithWeeklyPlans) => {
    if (!plan) {
      console.error("No plan data received");
      return;
    }

    setPreviewPlan(plan);
    setShowPreview(true);
    setActiveTab("overall");
  };

  const handleAIQuery = useAsyncAction(
    async (query: string, type: 'overall' | 'weekly') => {
      if (!trainingPlan) {
        throw new Error("No active training plan");
      }

      const response = await fetch(
        `/api/training-plans/${trainingPlan.id}/adjust`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            feedback: query,
            currentPlan: type === 'overall' ? trainingPlan : currentWeek,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || data.error || 'Failed to get AI response');
      }

      return response.json();
    },
    {
      onSuccess: (data) => {
        if (data.suggestedPlan) {
          setPreviewPlan(data.suggestedPlan);
        }
        toast({
          title: "AI Coach Response",
          description: data.reasoning,
        });
      },
      errorMessage: "Failed to get AI coach response",
    }
  );

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

  if (showPreview || !trainingPlan) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Training</h1>
        </div>

        {showPreview ? (
          <PlanPreview
            planDetails={previewPlan}
            onConfirm={createPlan}
            onAdjust={adjustPlan}
            onBack={() => setShowPreview(false)}
            isSubmitting={isCreating}
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

  const handleWorkoutSelect = (workout: WorkoutDetailType) => {
    setSelectedWorkout(workout);
    setShowDayView(true);
  };

  const handleWeekSelect = (week: number) => {
    const selectedWeek = trainingPlan?.weeklyPlans.find(w => w.week === week);
    if (selectedWeek) {
      setSelectedWeek(selectedWeek);
      setShowWeekView(true);
    }
  };


  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !trainingPlan) return;
    const planStart = new Date(trainingPlan.startDate);
    const planEnd = new Date(trainingPlan.endDate);
    const selectedDay = new Date(date);
    if (selectedDay < planStart || selectedDay > planEnd) {
      return;
    }
    setSelectedDate(date);
  };

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
              <>
                <ProgramOverview
                  weeklyPlans={trainingPlan.weeklyPlans}
                  totalWeeks={trainingPlan.weeklyPlans.length}
                  completedWeeks={stats.completedWeeks}
                  progressPercentage={stats.progressPercentage}
                  totalMileage={stats.totalMileage}
                  onSelectWeek={handleWeekSelect}
                  onSelectDay={handleDateSelect}
                  selectedDate={selectedDate}
                  goal={trainingPlan.goal || "No goal set"}
                  endDate={new Date(trainingPlan.endDate)}
                  targetRace={trainingPlan.targetRace ? {
                    distance: trainingPlan.targetRace.distance,
                    date: trainingPlan.targetRace.date
                  } : undefined}
                />
                <ProgressTracker
                  completed={stats.completedMileage}
                  total={trainingPlan.totalMileage}
                  label="miles"
                />
              </>
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
                    onSelectWorkout={handleWorkoutSelect}
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
                  disabled={!weeklyAiQuery}
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
                onSelectWeek={handleWeekSelect}
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
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{workoutDetail.workout.type} - {format(workoutDetail.date, 'EEEE, MMMM d')}</h2>
              <p className="text-base mb-4">{workoutDetail.workout.distance} miles</p>
              <div className="space-y-6">
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
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowWorkoutDetail(false)}>Close</Button>
                <Button>Complete Workout</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedWorkout && (
        <DayView
          isOpen={showDayView}
          onClose={() => setShowDayView(false)}
          date={selectedWorkout.date}
          workout={selectedWorkout.workout}
          onComplete={async () => {
            try {
              await fetch(`/api/training-plans/${trainingPlan?.id}/workouts/${selectedWorkout.id}/complete`, {
                method: 'POST',
              });
              //queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] }); // Removed as invalidateQueries is handled in the hook
              setShowDayView(false);
              toast({
                title: "Success",
                description: "Workout marked as complete",
              });
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to mark workout as complete",
                variant: "destructive",
              });
            }
          }}
          onAskQuestion={handleAIQuery}
          onRequestChange={handleAIQuery}
          onSyncToWatch={async () => {
            toast({
              title: "Not Implemented",
              description: "Watch sync functionality coming soon",
            });
          }}
        />
      )}

      {showWeekView && selectedWeek && (
        <Dialog open={showWeekView} onOpenChange={setShowWeekView}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <WeekView
              week={selectedWeek}
              onReorderWorkouts={reorderWorkouts}
              onAskQuestion={handleAIQuery}
              onRequestChange={handleAIQuery}
              onSelectWorkout={(date) => {
                const workout = selectedWeek.workouts.find(w =>
                  isSameDay(new Date(w.day), date)
                );
                if (workout) {
                  handleWorkoutSelect({
                    date,
                    workout: {
                      type: workout.type,
                      distance: workout.distance,
                      description: workout.description,
                      completed: workout.completed,
                    },
                  });
                }
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}