```typescript
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Training Plan Preview</CardTitle>
          <CardDescription>
            Review your training plan settings before generating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">Goal</h3>
            <p>{planDetails.goal}</p>
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
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">
            Want to adjust anything before generating?
          </h3>
          <Textarea
            placeholder="Enter any specific adjustments or preferences you'd like to make..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[100px]"
          />
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back to Settings
          </Button>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => onAdjust(feedback)}
              disabled={!feedback}
            >
              Request Adjustments
            </Button>
            <Button onClick={onConfirm}>Generate Plan</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```
