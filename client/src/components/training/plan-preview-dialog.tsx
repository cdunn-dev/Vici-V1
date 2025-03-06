import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface PlanPreviewDialogProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onAdjust: () => void;
  isSubmitting?: boolean;
}

export default function PlanPreviewDialog({
  plan,
  open,
  onOpenChange,
  onConfirm,
  onAdjust,
  isSubmitting = false,
}: PlanPreviewDialogProps) {
  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl sm:max-h-[90vh] flex flex-col p-0 h-full">
        <DialogHeader className="p-6 pb-2 sticky top-0 bg-background z-10">
          <DialogTitle>Training Plan Preview</DialogTitle>
          <DialogDescription>
            Review your generated training plan before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 flex-1 pb-6">
          {/* Plan overview */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Plan Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Goal:</span> {plan.goal}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Start Date:</span>{" "}
                  {formatDate(plan.startDate)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">End Date:</span>{" "}
                  {formatDate(plan.endDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Runner Level:</span>{" "}
                  {plan.runningExperience?.level}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Fitness Level:</span>{" "}
                  {plan.runningExperience?.fitnessLevel}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Weekly Running Days:</span>{" "}
                  {plan.trainingPreferences?.weeklyRunningDays}
                </p>
              </div>
            </div>
          </div>

          {/* Weekly plans */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Weekly Training</h3>

            {plan.weeklyPlans?.map((week: any) => (
              <div key={week.week} className="border rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-primary"
                    >
                      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                      <line x1="16" x2="16" y1="2" y2="6" />
                      <line x1="8" x2="8" y1="2" y2="6" />
                      <line x1="3" x2="21" y1="10" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-medium">Week {week.week}</h4>
                    <div className="text-sm text-muted-foreground">
                      {week.totalMileage} miles planned
                    </div>
                  </div>
                  <Badge className="ml-auto" variant="outline">
                    {week.phase}
                  </Badge>
                </div>

                {/* Daily workouts */}
                <div className="space-y-2 mt-3">
                  {week.workouts?.slice(0, 3).map((workout: any, index: number) => (
                    <div key={index} className="text-sm p-2 bg-background border rounded-md">
                      <div className="font-medium">{workout.type} - {workout.distance} miles</div>
                      <div className="text-muted-foreground text-xs">
                        {formatDate(workout.day)}
                      </div>
                    </div>
                  ))}
                  {week.workouts?.length > 3 && (
                    <div className="text-xs text-center text-muted-foreground">
                      +{week.workouts.length - 3} more workouts this week
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="p-6 pt-2 border-t bg-background sticky bottom-0">
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button
              variant="outline"
              onClick={onAdjust}
              className="sm:flex-1"
              disabled={isSubmitting}
            >
              Request Adjustments
            </Button>
            <Button
              onClick={onConfirm}
              className="sm:flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Confirm Plan"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}