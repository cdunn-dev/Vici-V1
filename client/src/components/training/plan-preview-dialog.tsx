
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>Training Plan Preview</DialogTitle>
          <DialogDescription>
            Review your generated training plan before confirming
          </DialogDescription>
        </DialogHeader>

        {/* Main content with scrolling */}
        <div className="flex-1 overflow-y-auto">
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
            <h3 className="text-lg font-semibold px-4">Weekly Training</h3>

            {plan.weeklyPlans?.map((week: any) => (
              <div key={week.week} className="w-full p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
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
                    <div className="text-xl font-semibold">
                      Week {week.week}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {week.totalMileage} miles planned
                    </div>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">
                      {week.phase}
                    </span>
                  </div>
                </div>
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
