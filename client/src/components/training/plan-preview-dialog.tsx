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
import { formatDate } from "@/lib/utils"; // Added import for formatDate

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
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle>Training Plan Preview</DialogTitle>
          <DialogDescription>
            Review your generated training plan before confirming
          </DialogDescription>
        </DialogHeader>

        {/* Main content with scrolling */}
        <div className="flex-1 overflow-y-auto p-1">
          {/* Plan overview */}
          <div className="mb-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Plan Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Goal:</span> {plan.goal}</p>
                <p><span className="font-medium">Start:</span> {formatDate(plan.startDate)}</p>
                <p><span className="font-medium">End:</span> {formatDate(plan.endDate)}</p>
              </div>
              <div>
                <p><span className="font-medium">Experience:</span> {plan.runningExperience?.level}</p>
                <p><span className="font-medium">Fitness:</span> {plan.runningExperience?.fitnessLevel}</p>
                <p><span className="font-medium">Running Days:</span> {plan.trainingPreferences?.weeklyRunningDays} days/week</p>
              </div>
            </div>
            {plan.targetRace && (
              <div className="mt-2">
                <p className="font-medium">Target Race:</p>
                <p>
                  {plan.targetRace.distance} on {formatDate(plan.targetRace.date)}
                  {plan.targetRace.goalTime && ` (Goal: ${plan.targetRace.goalTime})`}
                </p>
              </div>
            )}
          </div>

          {/* Weekly plans */}
          <div className="space-y-4 w-full">
            <h3 className="text-lg font-semibold px-2">Weekly Plans</h3>
            {plan.weeklyPlans?.map((weekPlan: any) => (
              <div key={`week-${weekPlan.week}`} className="border rounded-lg p-4 w-full">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className=""><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                    </span>
                    <div>
                      <h4 className="font-semibold text-lg">Week {weekPlan.week}</h4>
                    </div>
                  </div>
                  <Badge className="ml-auto" variant={weekPlan.phase === "Base Building" ? "default" : "secondary"}>
                    {weekPlan.phase}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm mb-4">{weekPlan.totalMileage} miles planned</p>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            Confirm Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}