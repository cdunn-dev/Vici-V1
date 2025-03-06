
import React from "react";
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Training Plan Preview</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-2 flex-grow overflow-y-auto">
          {plan.weeklyPlans && plan.weeklyPlans.length > 0 ? (
            <div className="space-y-4">
              {plan.weeklyPlans.map((week: any) => (
                <div
                  key={week.week}
                  className="border rounded-lg p-4 bg-background"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-xl font-bold">
                        Week {week.week}
                      </h3>
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
                  <p className="text-muted-foreground mt-2 mb-4">
                    {week.totalMileage} miles planned
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No weekly plans available in the preview.</p>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Approve Plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
