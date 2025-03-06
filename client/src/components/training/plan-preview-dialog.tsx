
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
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
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
        <div className="flex-grow overflow-auto px-6 py-6">
          <div className="space-y-8">
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Weekly Plans</h3>
              <div className="space-y-4">
                {plan.weeklyPlans?.map((weekPlan) => (
                  <div
                    key={weekPlan.week}
                    className="border rounded-lg p-4 bg-card shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
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
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-base font-medium">Week {weekPlan.week}</h4>
                          <p className="text-sm text-muted-foreground">
                            {weekPlan.totalMileage} miles planned
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {weekPlan.phase}
                      </Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {weekPlan.workouts?.map((workout, idx) => (
                        <div key={idx} className="p-3 rounded-md bg-background border">
                          <div className="flex justify-between items-center mb-1">
                            <div className="font-medium">
                              {format(new Date(workout.day), "EEE, MMM d")}
                            </div>
                            <Badge variant="outline">{workout.type}</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>{workout.description}</span>
                            <span className="font-medium">{workout.distance} miles</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fixed footer */}
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
