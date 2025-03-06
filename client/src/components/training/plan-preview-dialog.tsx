
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon } from "lucide-react";

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
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>Training Plan Preview</DialogTitle>
          <DialogDescription>
            Review your generated training plan before confirming
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto py-4">
          {/* Plan Overview */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Plan Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium text-sm text-muted-foreground">Goal</div>
                <div>{plan.goal}</div>
              </div>
              {plan.targetRace && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="font-medium text-sm text-muted-foreground">Target Race</div>
                  <div>{plan.targetRace.distance}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(plan.targetRace.date).toLocaleDateString()}
                  </div>
                </div>
              )}
              <div className="p-4 bg-muted rounded-lg">
                <div className="font-medium text-sm text-muted-foreground">Duration</div>
                <div>
                  {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Plans */}
          <h3 className="text-lg font-semibold mb-4">Weekly Schedule</h3>
          {plan.weeklyPlans && plan.weeklyPlans.length > 0 ? (
            <div className="space-y-6">
              {plan.weeklyPlans.map((week: any) => (
                <div key={week.week} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-xl font-bold">Week {week.week}</h3>
                    </div>
                    <Badge
                      className={`${
                        week.phase.includes("Base")
                          ? "bg-blue-100 text-blue-800"
                          : week.phase.includes("Peak")
                          ? "bg-purple-100 text-purple-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {week.phase}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">
                    {week.totalMileage} miles planned
                  </p>
                  
                  {/* Workouts for the week - flattened layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {week.workouts && week.workouts.map((workout: any, idx: number) => (
                      <div key={idx} className="p-3 border rounded-md bg-card">
                        <div className="font-medium">
                          {new Date(workout.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{workout.type}</span>
                          <span className="text-sm">{workout.distance} mi</span>
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
          ) : (
            <p>No weekly plans available in the preview.</p>
          )}
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Approve Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
