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
import { formatDate } from "@/lib/utils";
import PlanPreview from "./plan-preview";

interface PlanPreviewDialogProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onAdjust: () => void;
  isSubmitting?: boolean;
}

export default function PlanPreviewDialog({
  plan,
  open,
  onOpenChange,
  onConfirm,
  onAdjust,
  isSubmitting = false,
}: PlanPreviewDialogProps) {
  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-full max-w-5xl h-[95vh] p-0 sm:h-auto max-h-[95vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Fixed Header */}
          <DialogHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
            <DialogTitle>Training Plan Preview</DialogTitle>
            <DialogDescription>
              Review your generated training plan before confirming
            </DialogDescription>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <PlanPreview
              planDetails={plan}
              onConfirm={onConfirm}
              onAdjust={() => {
                onAdjust();
                onOpenChange(false);
              }}
              onBack={() => onOpenChange(false)}
              isSubmitting={isSubmitting}
              isDialog={true}
            />
          </div>
          {/* Fixed Footer */}
          <DialogFooter className="px-6 py-4 border-t sticky bottom-0 bg-background z-10">
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="outline"
                onClick={onAdjust}
                className="sm:flex-1"
                disabled={isSubmitting}
              >
                Request Adjustments
              </Button>
              <Button
                onClick={onConfirm}
                className="sm:flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Confirm Plan"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}