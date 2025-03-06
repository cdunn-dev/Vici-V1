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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { TrainingPlan } from "@shared/schema";

interface PlanPreviewDialogProps {
  plan: TrainingPlan;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function PlanPreviewDialog({
  plan,
  isOpen,
  onClose,
  onConfirm,
}: PlanPreviewDialogProps) {
  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 h-[90vh] max-h-[90vh] overflow-hidden">
        {/* Fixed Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>Training Plan Preview</DialogTitle>
            <DialogDescription>
              Review your personalized training plan before confirming.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto h-[calc(90vh-8rem)]">
          <div className="px-6 py-4 space-y-8">
            {/* Plan Overview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Plan Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Goal</p>
                  <p className="font-medium">{plan.goal}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {format(new Date(plan.startDate), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {format(new Date(plan.endDate), "MMM d, yyyy")}
                  </p>
                </div>
                {plan.targetRace && (
                  <div>
                    <p className="text-sm text-muted-foreground">Target Race</p>
                    <p className="font-medium">{plan.targetRace.distance}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Weekly Plans */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Weekly Training Schedule</h3>
              <div className="space-y-6">
                {plan.weeklyPlans?.map((week, index) => (
                  <div 
                    key={index} 
                    className="rounded-lg border bg-card p-6 hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <h4 className="text-lg font-medium">Week {week.week}</h4>
                        <Badge variant="outline" className="capitalize">
                          {week.phase.toLowerCase()}
                        </Badge>
                      </div>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                        {week.totalMileage} miles planned
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {week.workouts?.map((workout, wIndex) => (
                        <div 
                          key={wIndex} 
                          className="p-4 rounded-lg border bg-background hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-primary">
                                {workout.type}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(workout.day), "EEEE, MMM d")}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {workout.distance} mi
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {workout.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="sticky bottom-0 z-10 bg-background border-t px-6 py-4">
          <DialogFooter>
            <div className="flex justify-end gap-4 w-full">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onConfirm}>
                Confirm Plan
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}