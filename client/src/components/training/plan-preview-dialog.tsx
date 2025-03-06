import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TrainingPlan } from "@shared/schema";

interface PlanPreviewDialogProps {
  plan: TrainingPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PlanPreviewDialog({
  plan,
  isOpen,
  onClose,
  onConfirm,
}: PlanPreviewDialogProps) {
  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col" aria-describedby="plan-preview-description">
        <DialogHeader>
          <DialogTitle>Training Plan Preview</DialogTitle>
          <DialogDescription id="plan-preview-description">
            Review your personalized training plan before confirming.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-4">
          <div className="space-y-6">
            {/* Plan Overview */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Plan Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Goal</p>
                  <p className="font-medium">{plan.goal}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(plan.startDate), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-medium">{format(new Date(plan.endDate), "MMM d, yyyy")}</p>
                </div>
                {plan.targetRace && (
                  <div>
                    <p className="text-sm text-muted-foreground">Target Race</p>
                    <p className="font-medium">{plan.targetRace.distance}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Weekly Plans */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Weekly Training Schedule</h3>
              <div className="space-y-6">
                {plan.weeklyPlans.map((week, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Week {week.week}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline">{week.phase}</Badge>
                        <Badge>{week.totalMileage} miles</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {week.workouts.map((workout, wIndex) => (
                        <div key={wIndex} className="p-4 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{workout.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(workout.day), "EEE, MMM d")}
                              </p>
                            </div>
                            <Badge variant="outline">{workout.distance} mi</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{workout.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
