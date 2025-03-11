import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { planGeneratorSchema, type PlanGeneratorFormData } from "./plan-generator-schema";
import { Wand2, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { format, addWeeks } from "date-fns";
import ProgramOverview from "./program-overview";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
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
import { TimeInput } from "./time-input";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

const STEPS = [
  { id: "welcome", label: "Welcome" },
  { id: "basicProfile", label: "Basic Profile" },
  { id: "stravaConnect", label: "Strava Connect" },
  { id: "runningProfile", label: "Running Profile" },
  { id: "goal", label: "Training Goal" },
  {
    id: "raceDetails",
    label: "Race Details",
    conditional: (data: PlanGeneratorFormData) =>
      data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST,
  },
  { id: "trainingPreferences", label: "Training Preferences" },
  { id: "preview", label: "Preview Plan" },
];

interface PlanGeneratorProps {
  existingPlan?: boolean;
}

const PlanGenerator = ({ existingPlan }: PlanGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<TrainingPlanWithWeeklyPlans | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Independent slider states with initial values
  const [runningDaysValue, setRunningDaysValue] = useState(3);
  const [mileageValue, setMileageValue] = useState(15);
  const [workoutsValue, setWorkoutsValue] = useState(1);

  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      goal: undefined,
      startDate: new Date().toISOString(),
      age: undefined,
      gender: undefined,
      preferredDistanceUnit: "miles",
      runningExperience: {
        level: undefined,
        fitnessLevel: undefined,
      },
      trainingPreferences: {
        weeklyRunningDays: runningDaysValue,
        maxWeeklyMileage: mileageValue,
        weeklyWorkouts: workoutsValue,
        preferredLongRunDay: undefined,
        coachingStyle: undefined,
      },
      targetRace: undefined,
    },
  });

  // Reset slider states when form is reset
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "trainingPreferences.weeklyRunningDays") {
        setRunningDaysValue(value.trainingPreferences?.weeklyRunningDays || 3);
      }
      if (name === "trainingPreferences.maxWeeklyMileage") {
        setMileageValue(value.trainingPreferences?.maxWeeklyMileage || 15);
      }
      if (name === "trainingPreferences.weeklyWorkouts") {
        setWorkoutsValue(value.trainingPreferences?.weeklyWorkouts || 1);
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

  // Get visible steps and progress
  const visibleSteps = STEPS.filter((step) => !step.conditional || step.conditional(form.getValues()));
  const currentStep = visibleSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / visibleSteps.length) * 100;

  const handleNext = async () => {
    const isLastStep = currentStepIndex === visibleSteps.length - 2;

    if (isLastStep) {
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;
        const errorMessages = Object.entries(errors)
          .map(([key, error]) => {
            if (typeof error === 'object' && error !== null) {
              return Object.values(error)
                .map(err => err?.message)
                .filter(Boolean)
                .join(", ");
            }
            return error?.message;
          })
          .filter(Boolean)
          .join(", ");

        toast({
          title: "Please complete all required fields",
          description: errorMessages,
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);

      try {
        const formData = form.getValues();
        const now = new Date();

        // Format dates for API request
        const planRequest = {
          ...formData,
          startDate: now.toISOString(),
          targetRace: formData.targetRace ? {
            ...formData.targetRace,
            date: new Date(formData.targetRace.date).toISOString()
          } : undefined
        };

        const response = await fetch('/api/training-plans/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(planRequest),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const previewData = await response.json();
        setPreviewData(previewData);
        setCurrentStepIndex((prev) => prev + 1);
      } catch (error) {
        console.error("Error generating preview:", error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate plan preview",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const currentFields = getFieldsForStep(currentStep.id);
      const isValid = await form.trigger(currentFields as any);
      if (isValid) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStepIndex === visibleSteps.length - 1) {
      setPreviewData(null);
    }
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleApprovePlan = async () => {
    if (!previewData || !user?.id) {
      toast({
        title: "Error",
        description: "Unable to save plan. Please try logging in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const now = new Date();

      // Prepare plan data with properly formatted dates
      const planData = {
        ...previewData,
        userId: user.id,
        startDate: now.toISOString(),
        endDate: previewData.targetRace ?
          new Date(previewData.targetRace.date).toISOString() :
          addWeeks(now, 12).toISOString(),
        weeklyPlans: previewData.weeklyPlans.map(week => ({
          ...week,
          workouts: week.workouts.map(workout => ({
            ...workout,
            day: new Date(workout.day).toISOString()
          }))
        }))
      };

      const response = await fetch('/api/training-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const savedPlan = await response.json();

      setOpen(false);
      setCurrentStepIndex(0);
      form.reset();

      toast({
        title: "Success!",
        description: "Your training plan has been created and saved.",
      });

      // Refresh the training plans list
      await queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });

      // Navigate to training home
      window.location.href = "/training";
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldsForStep = (stepId: string): string[] => {
    switch (stepId) {
      case "goal":
        return ["goal"];
      case "raceDetails":
        return ["targetRace.distance", "targetRace.date", "targetRace.name"];
      case "basicProfile":
        return ["age", "gender", "preferredDistanceUnit"];
      case "runningProfile":
        return ["runningExperience.level", "runningExperience.fitnessLevel"];
      case "trainingPreferences":
        return [
          "trainingPreferences.weeklyRunningDays",
          "trainingPreferences.maxWeeklyMileage",
          "trainingPreferences.weeklyWorkouts",
          "trainingPreferences.preferredLongRunDay",
          "trainingPreferences.coachingStyle",
        ];
      default:
        return [];
    }
  };

  const isLastStep = currentStepIndex === visibleSteps.length - 1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <Wand2 className="mr-2 h-4 w-4" />
          Create Training Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Your Training Plan</DialogTitle>
          <DialogDescription>
            Let our AI build a plan based on your running history and goals
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="mb-8">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Step {currentStepIndex + 1} of {visibleSteps.length}
            </p>
          </div>

          {!isLastStep ? (
            <Form {...form}>
              <div className="space-y-8">
                {renderStepContent(currentStep.id)}

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStepIndex === 0 || isSubmitting}
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    {currentStep.id === "stravaConnect" ? "Skip" : "Next"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Form>
          ) : (
            previewData && (
              <ProgramOverview
                plan={previewData}
                showActions={false}
                onApprove={handleApprovePlan}
                isSubmitting={isSubmitting}
              />
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanGenerator;