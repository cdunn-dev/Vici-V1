import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/components/ui/use-toast";
import { addWeeks } from "date-fns";
import ProgramOverview from "./program-overview";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { TimeInput } from "./time-input";
import { planGeneratorSchema } from "./plan-generator-schema";
import {
  TrainingGoals,
  RaceDistances,
  ExperienceLevels,
  ExperienceLevelDescriptions,
  FitnessLevels,
  FitnessLevelDescriptions,
  DaysOfWeek,
  CoachingStyles,
  CoachingStyleDescriptions,
  GenderOptions,
  GenderLabels,
  DistanceUnits,
} from "./plan-generator-constants";
import { useAuth } from "@/hooks/use-auth";

type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;

interface PlanGeneratorProps {
  existingPlan: boolean;
  onPreview: (planDetails: any) => void;
}

function PlanGenerator({ existingPlan, onPreview }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();

  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      goal: "",
      runningExperience: {
        level: "beginner",
        fitnessLevel: "building-base"
      },
      trainingPreferences: {
        weeklyRunningDays: 3,
        maxWeeklyMileage: 15,
        weeklyWorkouts: 1,
        preferredLongRunDay: "Sunday",
        coachingStyle: "directive"
      },
      targetRace: {}
    }
  });

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleClose = () => {
    setOpen(false);
    setStep(1);
    form.reset();
  };

  const onSubmit = async (values: PlanGeneratorFormData) => {
    setIsSubmitting(true);
    try {
      // Calculate dates
      const startDate = new Date();
      const endDate = values.targetRace?.date
        ? new Date(values.targetRace.date)
        : addWeeks(startDate, 12);

      // Create preview data
      const previewData = {
        ...values,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };

      // Generate preview plan
      const response = await fetch('/api/training-plans/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewData),
      });

      if (!response.ok) {
        throw new Error('Error generating plan preview');
      }

      const previewPlan = await response.json();
      onPreview({
        ...values,
        ...previewPlan,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      handleClose();
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate training plan",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render different content based on current step
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return <TrainingGoals form={form} control={form.control} />;
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Your Running Experience</h2>
            {/* Running experience form fields would go here */}
            <p>Experience level inputs would be here</p>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold mb-4">Training Preferences</h2>
            {/* Training preferences form fields would go here */}
            <p>Training preferences inputs would be here</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {existingPlan ? "Create New Plan" : "Create Training Plan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Training Plan</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStepContent()}

            <DialogFooter className="flex justify-between">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}

              {step < 3 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Plan
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default PlanGenerator;