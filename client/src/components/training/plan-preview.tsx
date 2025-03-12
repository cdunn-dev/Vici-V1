import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import ProgramOverview from "./program-overview";
import { ChevronLeft, CheckCircle2, MessageSquare, Target, Medal, CalendarClock, Users, Calendar, Activity, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { validatePlanData } from "@/lib/training-plan-utils";

interface PlanPreviewProps {
  planDetails: {
    goal: string;
    goalDescription?: string;
    startDate: string;
    endDate: string;
    targetRace?: {
      distance: string;
      customDistance?: string;
      date: string;
      previousBest?: string;
      goalTime?: string;
    };
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
    weeklyPlans: Array<{
      week: number;
      phase: string;
      totalMileage: number;
      workouts: Array<{
        day: string;
        type: string;
        distance: number;
        description: string;
        completed?: boolean;
      }>;
    }>;
  };
  onConfirm: () => void;
  onAdjust: (feedback: string) => void;
  onBack: () => void;
  isSubmitting?: boolean;
  isDialog?: boolean;
}

export default function PlanPreview({
  planDetails,
  onConfirm,
  onAdjust,
  onBack,
  isSubmitting = false,
  isDialog = false,
}: PlanPreviewProps) {
  const [feedback, setFeedback] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const { toast } = useToast();

  // Handler for confirming the plan
  const handleConfirm = () => {
    try {
      validatePlanData(serializablePlan);
      onConfirm();
    } catch (error) {
      console.error("Plan validation error:", error);
      toast({
        title: "Validation Error",
        description: error instanceof Error ? error.message : "Failed to validate training plan",
        variant: "destructive",
        duration: 3000,
        data: {
          "data-testid": "validation-error-toast",
          "data-test-title": "Validation Error",
          "data-test-description": error instanceof Error ? error.message : "Failed to validate training plan"
        }
      });
    }
  };

  // Create a serializable version of the plan data
  const serializablePlan = {
    name: `Training Plan - ${planDetails.goal}`,
    goal: planDetails.goal,
    goalDescription: planDetails.goalDescription || "",
    startDate: new Date(planDetails.startDate).toISOString().split('T')[0],
    endDate: new Date(planDetails.endDate).toISOString().split('T')[0],
    weeklyMileage: planDetails.trainingPreferences.maxWeeklyMileage,
    weeklyPlans: planDetails.weeklyPlans.map(week => ({
      week: week.week,
      phase: week.phase,
      totalMileage: week.totalMileage,
      workouts: week.workouts.map(workout => ({
        day: new Date(workout.day).toISOString().split('T')[0],
        type: workout.type,
        distance: workout.distance,
        description: workout.description,
        completed: false
      }))
    })),
    targetRace: planDetails.targetRace ? {
      distance: planDetails.targetRace.distance,
      date: new Date(planDetails.targetRace.date).toISOString().split('T')[0],
      customDistance: planDetails.targetRace.customDistance,
      previousBest: planDetails.targetRace.previousBest,
      goalTime: planDetails.targetRace.goalTime
    } : null,
    runningExperience: {
      level: planDetails.runningExperience.level,
      fitnessLevel: planDetails.runningExperience.fitnessLevel
    },
    trainingPreferences: {
      weeklyRunningDays: planDetails.trainingPreferences.weeklyRunningDays,
      maxWeeklyMileage: planDetails.trainingPreferences.maxWeeklyMileage,
      weeklyWorkouts: planDetails.trainingPreferences.weeklyWorkouts,
      preferredLongRunDay: planDetails.trainingPreferences.preferredLongRunDay,
      coachingStyle: planDetails.trainingPreferences.coachingStyle
    },
    is_active: true
  };

  // Helper function to safely format dates for display
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="h-full flex flex-col">
      {isAdjusting ? (
        <div className="flex flex-col p-4">
          <Card className="shadow-md border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">Request Training Plan Adjustments</CardTitle>
              <CardDescription>
                Describe any changes you'd like to make to your training plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="I'd like to adjust the training intensity, change the long run days, etc..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[150px]"
              />
            </CardContent>
          </Card>

          <div className="flex justify-between mt-4">
            <Button
              variant="outline"
              onClick={() => setIsAdjusting(false)}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => {
                onAdjust(feedback);
                setFeedback("");
                setIsAdjusting(false);
              }}
              disabled={!feedback}
              className="gap-2"
            >
              Submit Adjustments
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          {!isDialog && (
            <div className="sticky top-0 z-10 p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex gap-4 justify-center">
                <Button variant="outline" onClick={onBack} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAdjusting(true)}
                  className="gap-2"
                  data-testid="request-adjustments-button"
                >
                  <MessageSquare className="h-4 w-4" />
                  Request Adjustments
                </Button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-20">
            <div className="container mx-auto py-4 px-4 space-y-6">
              {/* Overview Card */}
              <Card className="shadow-md border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Goal and Timeline Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary" data-testid="training-goal">
                        <Target className="h-5 w-5" />
                        <div className="font-medium">
                          Training Goal
                          <div className="text-sm text-muted-foreground">
                            {serializablePlan.goal}
                            <div className="text-xs mt-1">{serializablePlan.goalDescription}</div>
                          </div>
                        </div>
                      </div>

                      {serializablePlan.targetRace && (
                        <div className="flex items-center gap-2 text-primary" data-testid="target-race">
                          <Medal className="h-5 w-5" />
                          <div className="font-medium">
                            Target Race
                            <div className="text-sm text-muted-foreground">
                              {serializablePlan.targetRace.customDistance || serializablePlan.targetRace.distance}
                              <div className="text-xs mt-1">
                                Date: {formatDate(serializablePlan.targetRace.date)}
                                {serializablePlan.targetRace.goalTime && (
                                  <div>Goal Time: {serializablePlan.targetRace.goalTime}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-primary" data-testid="program-timeline">
                        <CalendarClock className="h-5 w-5" />
                        <div className="font-medium">
                          Program Timeline
                          <div className="text-sm text-muted-foreground">
                            {formatDate(serializablePlan.startDate)} - {formatDate(serializablePlan.endDate)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Training Preferences and Experience */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Users className="h-5 w-5" />
                        <div className="font-medium">
                          Experience Level
                          <div className="text-sm text-muted-foreground">
                            {serializablePlan.runningExperience.level} Runner
                            <div className="text-xs mt-1">
                              Fitness Level: {serializablePlan.runningExperience.fitnessLevel}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-primary">
                        <Calendar className="h-5 w-5" />
                        <div className="font-medium">
                          Weekly Schedule
                          <div className="text-sm text-muted-foreground">
                            {serializablePlan.trainingPreferences.weeklyRunningDays} running days per week
                            <div className="text-xs mt-1">
                              Long runs on {serializablePlan.trainingPreferences.preferredLongRunDay}s
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-primary">
                        <Activity className="h-5 w-5" />
                        <div className="font-medium">
                          Training Volume
                          <div className="text-sm text-muted-foreground">
                            Up to {serializablePlan.trainingPreferences.maxWeeklyMileage} miles per week
                            <div className="text-xs mt-1">
                              {serializablePlan.trainingPreferences.weeklyWorkouts} quality workouts per week
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Program Overview */}
              <ProgramOverview
                plan={serializablePlan}
                onApprove={onConfirm}
                isSubmitting={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          {!isDialog && (
            <div className="fixed bottom-0 left-0 right-0 z-10 p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto flex justify-center">
                <Button
                  onClick={handleConfirm}
                  size="lg"
                  disabled={isSubmitting}
                  className="gap-2 bg-primary hover:bg-primary/90 text-lg px-8 py-6"
                  data-testid="approve-plan-button"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creating Plan...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Approve Training Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}