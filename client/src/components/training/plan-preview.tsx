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
import { format } from "date-fns";
import ProgramOverview from "./program-overview";
import { ChevronLeft, CheckCircle2, MessageSquare, Target, Medal, CalendarClock, Users, Calendar, Activity, Loader2 } from "lucide-react";

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

  // Create a clean version of the plan data without any circular references
  const cleanPlanData = {
    ...planDetails,
    weeklyPlans: planDetails.weeklyPlans.map(week => ({
      ...week,
      workouts: week.workouts.map(workout => ({
        ...workout,
        day: new Date(workout.day).toISOString(),
        completed: workout.completed || false
      }))
    }))
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
                      <div className="flex items-center gap-2 text-primary">
                        <Target className="h-5 w-5" />
                        <div className="font-medium">
                          Training Goal
                          <div className="text-sm text-muted-foreground">
                            {cleanPlanData.goal}
                            <div className="text-xs mt-1">{cleanPlanData.goalDescription}</div>
                          </div>
                        </div>
                      </div>

                      {cleanPlanData.targetRace && (
                        <div className="flex items-center gap-2 text-primary">
                          <Medal className="h-5 w-5" />
                          <div className="font-medium">
                            Target Race
                            <div className="text-sm text-muted-foreground">
                              {cleanPlanData.targetRace.customDistance || cleanPlanData.targetRace.distance}
                              <div className="text-xs mt-1">
                                Date: {format(new Date(cleanPlanData.targetRace.date), "MMMM d, yyyy")}
                                {cleanPlanData.targetRace.goalTime && (
                                  <div>Goal Time: {cleanPlanData.targetRace.goalTime}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-primary">
                        <CalendarClock className="h-5 w-5" />
                        <div className="font-medium">
                          Program Timeline
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(cleanPlanData.startDate), "MMMM d, yyyy")} - {format(new Date(cleanPlanData.endDate), "MMMM d, yyyy")}
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
                            {cleanPlanData.runningExperience.level} Runner
                            <div className="text-xs mt-1">
                              Fitness Level: {cleanPlanData.runningExperience.fitnessLevel}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-primary">
                        <Calendar className="h-5 w-5" />
                        <div className="font-medium">
                          Weekly Schedule
                          <div className="text-sm text-muted-foreground">
                            {cleanPlanData.trainingPreferences.weeklyRunningDays} running days per week
                            <div className="text-xs mt-1">
                              Long runs on {cleanPlanData.trainingPreferences.preferredLongRunDay}s
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-primary">
                        <Activity className="h-5 w-5" />
                        <div className="font-medium">
                          Training Volume
                          <div className="text-sm text-muted-foreground">
                            Up to {cleanPlanData.trainingPreferences.maxWeeklyMileage} miles per week
                            <div className="text-xs mt-1">
                              {cleanPlanData.trainingPreferences.weeklyWorkouts} quality workouts per week
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
                plan={cleanPlanData}
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
                  onClick={onConfirm}
                  size="lg"
                  disabled={isSubmitting}
                  className="gap-2 bg-primary hover:bg-primary/90 text-lg px-8 py-6"
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