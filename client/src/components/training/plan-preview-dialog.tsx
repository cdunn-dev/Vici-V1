import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="flex flex-col w-full max-w-5xl h-[95vh] p-0 sm:h-auto overflow-hidden max-h-[90vh]"> {/* Added max-h and removed conflicting class */}
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
          <DialogTitle>Training Plan Preview</DialogTitle>
          <DialogDescription>
            Review your generated training plan before confirming
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Plan Overview */}
          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Plan Overview</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Goal:</p>
                <p className="text-sm text-muted-foreground">{plan.goal}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Timeline:</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Experience:</p>
                <p className="text-sm text-muted-foreground">
                  {plan.runningExperience.level} Runner, {plan.runningExperience.fitnessLevel} fitness
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Weekly Schedule:</p>
                <p className="text-sm text-muted-foreground">
                  {plan.trainingPreferences.weeklyRunningDays} runs per week,
                  up to {plan.trainingPreferences.maxWeeklyMileage} miles
                </p>
              </div>
              {plan.targetRace && (
                <div className="sm:col-span-2">
                  <p className="text-sm font-medium">Target Race:</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.targetRace.distance} on {formatDate(plan.targetRace.date)}
                    {plan.targetRace.goalTime && ` (Goal: ${plan.targetRace.goalTime})`}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Plans */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Weekly Plans</h3>
            {plan.weeklyPlans?.map((week: any) => (
              <div key={week.week} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-semibold">Week {week.week}</h4>
                    <p className="text-sm text-muted-foreground">
                      {week.totalMileage} miles total
                    </p>
                  </div>
                  <div className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full">
                    {week.phase}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {week.workouts?.map((workout: any, idx: number) => (
                    <div key={idx} className="bg-muted/30 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">
                          {formatDate(workout.day)} - {workout.type}
                        </p>
                        <span className="text-sm">{workout.distance} miles</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {workout.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-background z-10">
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