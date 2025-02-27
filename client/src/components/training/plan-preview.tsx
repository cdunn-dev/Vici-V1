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

interface PlanPreviewProps {
  planDetails: {
    goal: string;
    goalDescription: string;
    startDate: string;
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Training Plan Preview</CardTitle>
          <CardDescription>
            Review your training plan settings and make adjustments if needed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-medium">Goal</h3>
            <p className="text-lg">{planDetails.goal}</p>
            <p className="text-sm text-muted-foreground">
              {planDetails.goalDescription}
            </p>
          </div>

          {planDetails.targetRace && (
            <div className="space-y-2">
              <h3 className="font-medium">Target Race</h3>
              <p>
                Distance:{" "}
                {planDetails.targetRace.customDistance ||
                  planDetails.targetRace.distance}
              </p>
              {planDetails.targetRace.date && (
                <p>Date: {format(new Date(planDetails.targetRace.date), "PPP")}</p>
              )}
              {planDetails.targetRace.previousBest && (
                <p>Previous Best: {planDetails.targetRace.previousBest}</p>
              )}
              {planDetails.targetRace.goalTime && (
                <p>Goal Time: {planDetails.targetRace.goalTime}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-medium">Experience Level</h3>
            <p>Running Level: {planDetails.runningExperience.level}</p>
            <p>Fitness Level: {planDetails.runningExperience.fitnessLevel}</p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Training Preferences</h3>
            <p>
              Running {planDetails.trainingPreferences.weeklyRunningDays} days per
              week
            </p>
            <p>
              Target mileage: {planDetails.trainingPreferences.maxWeeklyMileage}{" "}
              miles per week
            </p>
            <p>
              {planDetails.trainingPreferences.weeklyWorkouts} workout sessions per
              week
            </p>
            <p>
              Long runs on {planDetails.trainingPreferences.preferredLongRunDay}s
            </p>
            <p>
              Coaching style: {planDetails.trainingPreferences.coachingStyle}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Program Timeline</h3>
            <p>
              Starting: {format(new Date(planDetails.startDate), "PPP")}
            </p>
          </div>
        </CardContent>
      </Card>

      {isAdjusting ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              What adjustments would you like to make?
            </h3>
            <Textarea
              placeholder="Describe any changes you'd like to make to your training plan..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

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
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back to Settings
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setIsAdjusting(true)}>
              Request Adjustments
            </Button>
            <Button onClick={onConfirm}>Approve Plan</Button>
          </div>
        </div>
      )}
    </div>
  );
}