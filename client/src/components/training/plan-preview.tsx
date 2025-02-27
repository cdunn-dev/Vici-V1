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
import { ChevronLeft, CheckCircle2, MessageSquare } from "lucide-react";

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
    weeklyPlans?: any[]; // Will be populated after AI generates the plan
  };
  onConfirm: () => void;
  onAdjust: (feedback: string) => void;
  onBack: () => void;
}

export default function PlanPreview({
  planDetails,
  onConfirm,
  onAdjust,
  onBack,
}: PlanPreviewProps) {
  const [feedback, setFeedback] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(planDetails.startDate));

  return (
    <div className="space-y-6">
      {isAdjusting ? (
        <div className="space-y-4 max-w-2xl mx-auto">
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

          <div className="flex justify-between">
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
        <>
          <div className="flex justify-between items-center pb-4 border-b">
            <div>
              <h2 className="text-2xl font-bold">{planDetails.goal}</h2>
              <p className="text-muted-foreground">{planDetails.goalDescription}</p>
            </div>
            <div className="flex items-center gap-3">
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
              <Button onClick={onConfirm} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Approve Plan
              </Button>
            </div>
          </div>

          <Card className="shadow-sm border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg">Training Plan Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-primary mb-2">Experience Level</h3>
                  <p className="text-sm">Running Level: {planDetails.runningExperience.level}</p>
                  <p className="text-sm">Fitness Level: {planDetails.runningExperience.fitnessLevel}</p>
                </div>

                <div>
                  <h3 className="font-medium text-primary mb-2">Training Preferences</h3>
                  <p className="text-sm">{planDetails.trainingPreferences.weeklyRunningDays} days per week</p>
                  <p className="text-sm">Up to {planDetails.trainingPreferences.maxWeeklyMileage} miles per week</p>
                  <p className="text-sm">{planDetails.trainingPreferences.weeklyWorkouts} workouts per week</p>
                </div>

                {planDetails.targetRace && (
                  <div>
                    <h3 className="font-medium text-primary mb-2">Target Race</h3>
                    <p className="text-sm">Distance: {planDetails.targetRace.customDistance || planDetails.targetRace.distance}</p>
                    <p className="text-sm">Date: {format(new Date(planDetails.targetRace.date), "PPP")}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium text-primary mb-2">Program Timeline</h3>
                  <p className="text-sm">Start: {format(new Date(planDetails.startDate), "PPP")}</p>
                  <p className="text-sm">End: {format(planDetails.endDate, "PPP")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {planDetails.weeklyPlans && (
            <ProgramOverview
              weeklyPlans={planDetails.weeklyPlans}
              onSelectWeek={(weekNumber) => {
                const week = planDetails.weeklyPlans?.find(w => w.week === weekNumber);
                if (week) {
                  setSelectedDate(new Date(week.workouts[0].day));
                }
              }}
              onSelectDay={(date) => date && setSelectedDate(date)}
              selectedDate={selectedDate}
              goal={planDetails.goal}
              endDate={planDetails.endDate}
              targetRace={planDetails.targetRace}
            />
          )}
        </>
      )}
    </div>
  );
}