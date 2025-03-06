import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TrainingPlan } from "@/shared/schema";
import { PlanWeekCard } from "./plan-week-card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface PlanPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: TrainingPlan | null;
  loading?: boolean;
  onApprove?: () => void;
}

export function PlanPreviewDialog({
  open,
  onOpenChange,
  plan,
  loading = false,
  onApprove,
}: PlanPreviewDialogProps) {
  const handleApprove = async () => {
    try {
      if (onApprove) {
        onApprove();
      } else {
        // Default behavior when no onApprove is provided
        await api.post("/training-plans", plan);
        toast.success("Plan created successfully!");
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error creating plan:", error);
      toast.error("Failed to create plan. Please try again.");
    }
  };

  if (!plan && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Training Plan Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4">
                {plan?.weeklyPlans.map((week) => (
                  <PlanWeekCard key={week.week} week={week} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing
              </>
            ) : (
              "Approve Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}