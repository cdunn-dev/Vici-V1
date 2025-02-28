import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Check, X } from "lucide-react";

type PlanReviewProps = {
  planId: number;
  currentPlan: {
    weeklyPlans: Array<{
      week: number;
      phase: string;
      totalMileage: number;
      workouts: Array<{
        day: string;
        type: string;
        distance: number;
        description: string;
      }>;
    }>;
  };
  onPlanUpdate: () => void;
};

export default function PlanReview({ planId, currentPlan, onPlanUpdate }: PlanReviewProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adjustments, setAdjustments] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmitFeedback = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/training-plans/${planId}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback,
          currentPlan,
        }),
      });

      if (!res.ok) throw new Error("Failed to get adjustments");

      const data = await res.json();
      setAdjustments(data);
      setFeedback("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAdjustment = async () => {
    try {
      const res = await fetch(`/api/training-plans/${planId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(adjustments.suggestedPlan),
      });

      if (!res.ok) throw new Error("Failed to apply adjustments");

      toast({
        title: "Success",
        description: "Training plan updated successfully",
      });
      setAdjustments(null);
      onPlanUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update training plan",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          Review & Adjust Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review Training Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium">Current Plan Overview</h3>
            <div className="grid gap-4">
              {currentPlan.weeklyPlans.map((week) => (
                <Card key={week.week}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Week {week.week} - {week.phase}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      Total Mileage: {week.totalMileage} miles
                    </p>
                    <div className="grid gap-2">
                      {week.workouts.map((workout, idx) => (
                        <div
                          key={idx}
                          className="text-sm p-2 bg-muted rounded-lg"
                        >
                          <div className="font-medium">
                            {new Date(workout.day).toLocaleDateString()} -{" "}
                            {workout.type}
                          </div>
                          <div className="text-muted-foreground">
                            {workout.distance} miles - {workout.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Request Adjustments</h3>
            <Textarea
              placeholder="Describe what you'd like to adjust in the plan. For example: 'I need more recovery days' or 'The long runs are too intense'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback || isSubmitting}
            >
              Get AI Suggestions
            </Button>
          </div>

          {adjustments && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Adjustments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{adjustments.reasoning}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleApplyAdjustment}
                    className="gap-2 bg-success hover:bg-success/90"
                  >
                    <Check className="h-4 w-4" />
                    Apply Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setAdjustments(null)}
                    className="gap-2 border-destructive text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
