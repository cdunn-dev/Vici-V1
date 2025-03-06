
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
}

export default function PlanPreviewDialog({
  plan,
  open,
  onOpenChange,
  onConfirm,
}: PlanPreviewDialogProps) {
  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Training Plan Preview</DialogTitle>
          <DialogDescription>
            Review your generated training plan before confirming
          </DialogDescription>
        </DialogHeader>
        
        {/* Main scrollable content area */}
        <div className="flex-1 overflow-y-auto pr-2 pb-4">
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
                  <span className="font-medium">Current Fitness:</span>{" "}
                  {plan.runningExperience?.fitnessLevel}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Weekly Running Days:</span>{" "}
                  {plan.trainingPreferences?.weeklyRunningDays}
                </p>
              </div>
            </div>
            {plan.targetRace && (
              <div className="mt-4 p-3 bg-primary/10 rounded-md">
                <h4 className="text-sm font-semibold mb-1">Target Race</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(plan.targetRace.date)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Distance:</span>{" "}
                    {plan.targetRace.distance}
                  </p>
                  {plan.targetRace.previousBest && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Previous Best:</span>{" "}
                      {plan.targetRace.previousBest}
                    </p>
                  )}
                  {plan.targetRace.goalTime && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Goal Time:</span>{" "}
                      {plan.targetRace.goalTime}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Weekly plans */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold px-4">Weekly Training</h3>
            
            {plan.weeklyPlans?.map((week: any) => (
              <div key={week.week} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
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
                      <h4 className="font-semibold text-lg">Week {week.week}</h4>
                      <p className="text-sm text-muted-foreground">{week.totalMileage} miles planned</p>
                    </div>
                  </div>
                  <Badge variant={week.phase === "Base Building" ? "default" : "secondary"}>
                    {week.phase}
                  </Badge>
                </div>

                {/* Daily workouts */}
                <div className="space-y-2 mt-3">
                  {week.workouts?.map((workout: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted/30 rounded-md flex flex-col sm:flex-row sm:items-center gap-2"
                    >
                      <div className="font-medium min-w-[110px]">
                        {formatDate(workout.day, "EEE, MMM d")}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-background">
                            {workout.type}
                          </Badge>
                          <span className="text-sm">{workout.distance} miles</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workout.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Request Changes
          </Button>
          <Button onClick={onConfirm}>Approve Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
