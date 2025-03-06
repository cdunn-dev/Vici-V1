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
    goalDescription: string;
    startDate: string;
    endDate: Date;
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
    weeklyPlans?: any[];
  };
  onConfirm: () => void;
  onAdjust: (feedback: string) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function PlanPreview({
  planDetails,
  onConfirm,
  onAdjust,
  onBack,
  isSubmitting = false,
}: PlanPreviewProps) {
  const [feedback, setFeedback] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(planDetails.startDate));

  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden">
      {isAdjusting ? (
        <div className="flex flex-col h-full p-4">
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
        <div className="flex flex-col h-full overflow-hidden">
          {/* Fixed Header */}
          <div className="flex justify-center p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex gap-4">
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="container mx-auto p-4 space-y-6">
              {/* Overview Card */}
              <Card className="shadow-md border-primary/20 bg-primary/5">
                <CardContent className="pt-6 pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Goal and Timeline Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Target className="h-5 w-5" />
                        <div className="font-medium">
                          Training Goal
                          <div className="text-sm text-muted-foreground">
                            {planDetails.goal}
                            <div className="text-xs mt-1">{planDetails.goalDescription}</div>
                          </div>
                        </div>
                      </div>

                      {planDetails.targetRace && (
                        <div className="flex items-center gap-2 text-primary">
                          <Medal className="h-5 w-5" />
                          <div className="font-medium">
                            Target Race
                            <div className="text-sm text-muted-foreground">
                              {planDetails.targetRace.customDistance || planDetails.targetRace.distance}
                              <div className="text-xs mt-1">
                                Date: {format(new Date(planDetails.targetRace.date), "MMMM d, yyyy")}
                                {planDetails.targetRace.goalTime && (
                                  <div>Goal Time: {planDetails.targetRace.goalTime}</div>
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
                            {format(new Date(planDetails.startDate), "MMMM d, yyyy")} - {format(new Date(planDetails.endDate), "MMMM d, yyyy")}
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
                            {planDetails.runningExperience.level} Runner
                            <div className="text-xs mt-1">
                              Fitness Level: {planDetails.runningExperience.fitnessLevel}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-primary">
                        <Calendar className="h-5 w-5" />
                        <div className="font-medium">
                          Weekly Schedule
                          <div className="text-sm text-muted-foreground">
                            {planDetails.trainingPreferences.weeklyRunningDays} running days per week
                            <div className="text-xs mt-1">
                              Long runs on {planDetails.trainingPreferences.preferredLongRunDay}s
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-primary">
                        <Activity className="h-5 w-5" />
                        <div className="font-medium">
                          Training Volume
                          <div className="text-sm text-muted-foreground">
                            Up to {planDetails.trainingPreferences.maxWeeklyMileage} miles per week
                            <div className="text-xs mt-1">
                              {planDetails.trainingPreferences.weeklyWorkouts} quality workouts per week
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Plans Overview */}
              {planDetails.weeklyPlans && (
                <ProgramOverview
                  plan={planDetails}
                  onSelectWeek={(weekNumber) => {
                    const week = planDetails.weeklyPlans?.find(w => w.week === weekNumber);
                    if (week) {
                      setSelectedDate(new Date(week.workouts[0].day));
                    }
                  }}
                  onSelectDay={(date) => date && setSelectedDate(date)}
                  selectedDate={selectedDate}
                />
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex justify-center p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
  );
}