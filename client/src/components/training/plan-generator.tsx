import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Wand2, Loader2, ChevronRight, ChevronLeft, HelpCircle, Bug } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { format, addWeeks, nextMonday } from "date-fns";
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
} from "./plan-generator-constants";

// Define steps with proper conditionals
const STEPS = [
  { id: "goal", label: "Training Goal" },
  {
    id: "raceDistance",
    label: "Race Distance",
    conditional: (data: PlanGeneratorFormData) =>
      data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST,
  },
  {
    id: "raceDate",
    label: "Race Date",
    conditional: (data: PlanGeneratorFormData) =>
      data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST,
  },
  {
    id: "raceTimes",
    label: "Race Times",
    conditional: (data: PlanGeneratorFormData) =>
      data.goal === TrainingGoals.PERSONAL_BEST,
  },
  { id: "experience", label: "Running Experience" },
  { id: "fitness", label: "Current Fitness" },
  { id: "runningDays", label: "Weekly Running Days" },
  { id: "mileage", label: "Weekly Mileage" },
  { id: "workouts", label: "Quality Sessions" },
  { id: "longRunDay", label: "Long Run Day" },
  { id: "startDate", label: "Training Plan Start Date" },
  { id: "preview", label: "Preview Plan" },
];

interface PlanGeneratorProps {
  existingPlan?: boolean;
  onPreview?: (plan: TrainingPlanWithWeeklyPlans) => void;
}

const PlanGenerator = ({ existingPlan, onPreview }: PlanGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<TrainingPlanWithWeeklyPlans | null>(null);
  const { toast } = useToast();

  // Independent slider states with initial values
  const [runningDaysValue, setRunningDaysValue] = useState(3);
  const [mileageValue, setMileageValue] = useState(15);
  const [workoutsValue, setWorkoutsValue] = useState(1);

  // Form initialization with proper defaults
  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      goal: "",
      startDate: new Date().toISOString(),
      runningExperience: {
        level: "",
        fitnessLevel: "",
      },
      trainingPreferences: {
        weeklyRunningDays: 3,
        maxWeeklyMileage: 15,
        weeklyWorkouts: 1,
        preferredLongRunDay: "",
        coachingStyle: "",
      },
      targetRace: {
        date: "",
        distance: "",
        customDistance: {
          value: 0,
          unit: "",
        },
        previousBest: "",
        goalTime: "",
      },
    },
    mode: "onBlur",
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

  // Debug function to show form state
  const showDebugInfo = () => {
    console.log("Form Values:", form.getValues());
    console.log("Form Errors:", form.formState.errors);
    toast({
      title: "Debug Info",
      description: "Check console for form values and errors",
    });
  };

  // Get visible steps and progress
  const visibleSteps = STEPS.filter((step) => !step.conditional || step.conditional(form.getValues()));
  const currentStep = visibleSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / visibleSteps.length) * 100;

  // Helper function to validate current step
  const validateCurrentStep = async () => {
    const currentFields = getFieldsForStep(currentStep.id);
    const isValid = await form.trigger(currentFields as any);

    if (!isValid) {
      const errors = form.formState.errors;
      const errorMessages = Object.values(errors)
        .map((error) => error?.message)
        .filter(Boolean)
        .join(", ");

      toast({
        title: "Please complete this step",
        description: errorMessages || "Please fill in all required fields correctly.",
        variant: "destructive",
      });
    }

    return isValid;
  };

  // Helper function to get fields for each step
  const getFieldsForStep = (stepId: string): string[] => {
    switch (stepId) {
      case "goal":
        return ["goal"];
      case "raceDistance":
        return ["targetRace.distance"];
      case "raceDate":
        return ["targetRace.date"];
      case "raceTimes":
        return ["targetRace.previousBest", "targetRace.goalTime"];
      case "experience":
        return ["runningExperience.level"];
      case "fitness":
        return ["runningExperience.fitnessLevel"];
      case "runningDays":
        return ["trainingPreferences.weeklyRunningDays"];
      case "mileage":
        return ["trainingPreferences.maxWeeklyMileage"];
      case "workouts":
        return ["trainingPreferences.weeklyWorkouts"];
      case "longRunDay":
        return ["trainingPreferences.preferredLongRunDay"];
      case "startDate":
        return ["startDate"];
      default:
        return [];
    }
  };

  // Handle next button click with proper validation
  const handleNext = async () => {
    const isLastStep = currentStepIndex === visibleSteps.length - 2;

    if (isLastStep) {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please complete all required fields before generating preview.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const formData = form.getValues();

        // Ensure slider values are properly included
        formData.trainingPreferences.weeklyRunningDays = runningDaysValue;
        formData.trainingPreferences.maxWeeklyMileage = mileageValue;
        formData.trainingPreferences.weeklyWorkouts = workoutsValue;

        // Request plan preview from backend
        const response = await fetch('/api/training-plans/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to generate plan preview');
        }

        const previewData = await response.json();
        setPreviewData(previewData);
        setCurrentStepIndex((prev) => prev + 1);
      } catch (error) {
        console.error("Error generating preview:", error);
        toast({
          title: "Error",
          description: "Failed to generate plan preview. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      const isValid = await validateCurrentStep();
      if (isValid) {
        setCurrentStepIndex((prev) => prev + 1);
      }
    }
  };

  // Handle back button click
  const handleBack = () => {
    if (currentStepIndex === visibleSteps.length - 1) {
      setPreviewData(null);
    }
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  // Handle plan approval with proper error handling
  const handleApprovePlan = async () => {
    if (!previewData) return;

    try {
      setIsSubmitting(true);

      if (onPreview) {
        onPreview(previewData);
      }

      setOpen(false);
      setCurrentStepIndex(0);
      form.reset();

      toast({
        title: "Plan Created",
        description: "Your training plan has been created successfully!",
      });

      window.location.href = "/training";
    } catch (error) {
      console.error("Error approving plan:", error);
      toast({
        title: "Error",
        description: "Failed to create plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the current step
  const renderQuestion = () => {
    switch (currentStep.id) {
      case "goal":
        return (
          <FormField
            control={form.control}
            name="goal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What's your training goal?</FormLabel>
                <FormDescription>
                  Choose the primary goal you'd like to achieve through your training plan
                </FormDescription>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your goal" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(TrainingGoals).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "raceDistance":
        return (
          <FormField
            control={form.control}
            name="targetRace.distance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Which race distance are you targeting?</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== RaceDistances.OTHER) {
                      form.setValue("targetRace.customDistance.value", 0);
                      form.setValue("targetRace.customDistance.unit", "");
                    }
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select race distance" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(RaceDistances).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "raceDate":
        return (
          <FormField
            control={form.control}
            name="targetRace.date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When is your race?</FormLabel>
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString())}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "raceTimes":
        return (
          <>
            <FormField
              control={form.control}
              name="targetRace.previousBest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What's your current personal best?</FormLabel>
                  <FormDescription>
                    Enter your time in HH:MM:SS format
                  </FormDescription>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="HH"
                      value={field.value?.split(":")[0] || ""}
                      onChange={(e) => {
                        const [_, mm, ss] = field.value?.split(":") || ["", "", ""];
                        const newHH = e.target.value.padStart(2, "0");
                        field.onChange(`${newHH}:${mm || "00"}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="MM"
                      value={field.value?.split(":")[1] || ""}
                      onChange={(e) => {
                        const [hh, _, ss] = field.value?.split(":") || ["", "", ""];
                        const newMM = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${newMM}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="SS"
                      value={field.value?.split(":")[2] || ""}
                      onChange={(e) => {
                        const [hh, mm, _] = field.value?.split(":") || ["", "", ""];
                        const newSS = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${mm || "00"}:${newSS}`);
                      }}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="mt-4">
              <FormField
                control={form.control}
                name="targetRace.goalTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What's your goal time?</FormLabel>
                    <FormDescription>
                      Enter your time in HH:MM:SS format
                    </FormDescription>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        placeholder="HH"
                        value={field.value?.split(":")[0] || ""}
                        onChange={(e) => {
                          const [_, mm, ss] = field.value?.split(":") || ["", "", ""];
                          const newHH = e.target.value.padStart(2, "0");
                          field.onChange(`${newHH}:${mm || "00"}:${ss || "00"}`);
                        }}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="MM"
                        value={field.value?.split(":")[1] || ""}
                        onChange={(e) => {
                          const [hh, _, ss] = field.value?.split(":") || ["", "", ""];
                          const newMM = e.target.value.padStart(2, "0");
                          field.onChange(`${hh || "00"}:${newMM}:${ss || "00"}`);
                        }}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="SS"
                        value={field.value?.split(":")[2] || ""}
                        onChange={(e) => {
                          const [hh, mm, _] = field.value?.split(":") || ["", "", ""];
                          const newSS = e.target.value.padStart(2, "0");
                          field.onChange(`${hh || "00"}:${mm || "00"}:${newSS}`);
                        }}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        );

      case "experience":
        return (
          <FormField
            control={form.control}
            name="runningExperience.level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What's your running experience level?</FormLabel>
                <FormDescription>
                  {ExperienceLevelDescriptions[field.value as keyof typeof ExperienceLevelDescriptions]}
                </FormDescription>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ExperienceLevels).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "fitness":
        return (
          <FormField
            control={form.control}
            name="runningExperience.fitnessLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How would you describe your current fitness level?</FormLabel>
                <FormDescription>
                  {FitnessLevelDescriptions[field.value as keyof typeof FitnessLevelDescriptions]}
                </FormDescription>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your fitness level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(FitnessLevels).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "runningDays":
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.weeklyRunningDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How many days per week would you like to run?</FormLabel>
                <FormDescription>Choose between 1 to 7 days per week</FormDescription>
                <FormControl>
                  <Slider
                    min={1}
                    max={7}
                    step={1}
                    value={[runningDaysValue]}
                    onValueChange={(vals) => {
                      const newValue = Math.min(Math.max(Math.round(vals[0]), 1), 7);
                      setRunningDaysValue(newValue);
                      field.onChange(newValue);
                    }}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground text-center">
                  {runningDaysValue} days per week
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "mileage":
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.maxWeeklyMileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What's your target weekly mileage?</FormLabel>
                <FormDescription>
                  This will be the peak mileage in your training plan (0-150 miles)
                </FormDescription>
                <FormControl>
                  <Slider
                    min={0}
                    max={150}
                    step={5}
                    value={[mileageValue]}
                    onValueChange={(vals) => {
                      const newValue = Math.min(Math.max(Math.round(vals[0] / 5) * 5, 0), 150);
                      setMileageValue(newValue);
                      field.onChange(newValue);
                    }}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground text-center">
                  {mileageValue} miles per week
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "workouts":
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.weeklyWorkouts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>How many quality sessions per week?</FormLabel>
                <FormDescription>
                  These are harder workouts like intervals, tempo runs, or progression runs (0-3 sessions)
                </FormDescription>
                <FormControl>
                  <Slider
                    min={0}
                    max={3}
                    step={1}
                    value={[workoutsValue]}
                    onValueChange={(vals) => {
                      const newValue = Math.min(Math.max(Math.round(vals[0]), 0), 3);
                      setWorkoutsValue(newValue);
                      field.onChange(newValue);
                    }}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground text-center">
                  {workoutsValue} quality sessions per week
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "longRunDay":
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.preferredLongRunDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Which day would you prefer for your long run?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preferred day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(DaysOfWeek).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "startDate":
        return (
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When would you like to start your training plan?</FormLabel>
                <div className="my-4 flex space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const today = new Date();
                      field.onChange(today.toISOString());
                    }}
                  >
                    Start Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const nextMondayDate = nextMonday(new Date());
                      field.onChange(nextMondayDate.toISOString());
                    }}
                  >
                    Start Next Week
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString())}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "preview":
        return (
          <div className="space-y-6">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating your personalized training plan...</p>
                <p className="text-sm text-muted-foreground">
                  We're creating a plan tailored to your goals and preferences
                </p>
              </div>
            ) : previewData ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Your Training Plan Preview</h2>
                <div className="bg-muted p-4 rounded-md">
                  <p><strong>Goal:</strong> {previewData.goal}</p>
                  <p>
                    <strong>Training Period:</strong>{" "}
                    {format(new Date(previewData.startDate), "PPP")} -{" "}
                    {format(new Date(previewData.endDate), "PPP")}
                  </p>
                  <p>
                    <strong>Weekly Schedule:</strong>{" "}
                    {previewData.trainingPreferences.weeklyRunningDays} days/week
                  </p>
                  <p>
                    <strong>Peak Mileage:</strong>{" "}
                    {previewData.trainingPreferences.maxWeeklyMileage} miles
                  </p>
                </div>
                <ProgramOverview
                  plan={previewData}
                  onApprove={handleApprovePlan}
                  onAskQuestion={async (question) => {
                    setIsSubmitting(true);
                    try {
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      toast({
                        title: "Question Answered",
                        description: "Your question has been answered. Please check the updated plan.",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to process your question. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  onRequestChanges={async (changes) => {
                    setIsSubmitting(true);
                    try {
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      toast({
                        title: "Plan Updated",
                        description: "Your training plan has been updated based on your feedback.",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to update plan. Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-lg font-medium">Please complete previous steps</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Wand2 className="h-5 w-5" />
          Create New Training Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl min-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            {currentStep.label}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Help text for {currentStep.label}</p>
              </TooltipContent>
            </Tooltip>
          </DialogTitle>
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
            <div className="mt-2 flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Step {currentStepIndex + 1} of {visibleSteps.length}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={showDebugInfo}
                className="px-2"
              >
                <Bug className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleApprovePlan)} className="flex-1 flex flex-col">
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {renderQuestion()}
            </div>

            <div className="border-t px-6 py-4 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStepIndex === visibleSteps.length - 1 ? (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Plan...
                    </>
                  ) : (
                    "Create Plan"
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  {currentStepIndex === visibleSteps.length - 2 ? (
                    isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      "Preview Plan"
                    )
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PlanGenerator;