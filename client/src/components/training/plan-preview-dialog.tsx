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
      <DialogContent className="max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
        {/* Fixed header */}
        <div className="p-6 border-b flex-shrink-0">
          <DialogHeader>
            <DialogTitle>Training Plan Preview</DialogTitle>
            <DialogDescription>
              Review your personalized training plan before confirming.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <ScrollArea className="h-[calc(85vh-8rem)] px-6 flex-grow">
          <div className="py-6 space-y-8">
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
              <div className="grid grid-cols-1 gap-4">
                {plan.weeklyPlans?.map((week, index) => (
                  <div 
                    key={index} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-medium">Week {week.week}</h4>
                        <Badge variant="outline" className="capitalize">
                          {week.phase.replace(/([A-Z])/g, ' $1').trim()}
                        </Badge>
                      </div>
                      <Badge>{week.totalMileage} miles planned</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {week.workouts?.map((workout, wIndex) => (
                        <div 
                          key={wIndex} 
                          className="p-4 rounded-lg border bg-background"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">{workout.type}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(workout.day), "EEE, MMM d")}
                              </p>
                            </div>
                            <Badge variant="outline">{workout.distance} mi</Badge>
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
        </ScrollArea>

        {/* Fixed footer */}
        <div className="p-6 border-t mt-auto">
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm}>
              Confirm Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}