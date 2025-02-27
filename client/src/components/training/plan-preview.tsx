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
    <div className="space-y-8">
      {isAdjusting ? (
        <div className="space-y-4 max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Request Training Plan Adjustments</CardTitle>
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
            <Button variant="outline" onClick={() => setIsAdjusting(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                onAdjust(feedback);
                setFeedback("");
                setIsAdjusting(false);
              }}
              disabled={!feedback}
            >
              Submit Adjustments
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{planDetails.goal}</h2>
              <p className="text-muted-foreground">{planDetails.goalDescription}</p>
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button variant="outline" onClick={() => setIsAdjusting(true)}>
                Request Adjustments
              </Button>
              <Button onClick={onConfirm}>
                Approve Plan
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Training Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Experience Level</h3>
                  <p>Running Level: {planDetails.runningExperience.level}</p>
                  <p>Fitness Level: {planDetails.runningExperience.fitnessLevel}</p>
                </div>

                <div>
                  <h3 className="font-medium">Training Preferences</h3>
                  <p>{planDetails.trainingPreferences.weeklyRunningDays} days per week</p>
                  <p>Up to {planDetails.trainingPreferences.maxWeeklyMileage} miles per week</p>
                  <p>{planDetails.trainingPreferences.weeklyWorkouts} workouts per week</p>
                </div>

                {planDetails.targetRace && (
                  <div>
                    <h3 className="font-medium">Target Race</h3>
                    <p>Distance: {planDetails.targetRace.customDistance || planDetails.targetRace.distance}</p>
                    <p>Date: {format(new Date(planDetails.targetRace.date), "PPP")}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-medium">Program Timeline</h3>
                  <p>Start: {format(new Date(planDetails.startDate), "PPP")}</p>
                  <p>End: {format(planDetails.endDate, "PPP")}</p>
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