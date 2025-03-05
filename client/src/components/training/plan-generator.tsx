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
import { TimeInput } from "./time-input"; 

// Update STEPS array to include a final confirmation step
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
  { id: "coachingStyle", label: "Coaching Style" },
  { id: "startDate", label: "Training Plan Start Date" },
  { id: "confirmation", label: "Confirm Plan Generation" },
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

  // Form initialization with proper defaults including coachingStyle
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
        weeklyRunningDays: runningDaysValue,
        maxWeeklyMileage: mileageValue,
        weeklyWorkouts: workoutsValue,
        preferredLongRunDay: "",
        coachingStyle: "Motivational",
      },
      targetRace: {
        date: "",
        distance: "",
        customDistance: {
          value: 0,
          unit: "miles",
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
      case "coachingStyle":
        return ["trainingPreferences.coachingStyle"];
      case "startDate":
        return ["startDate"];
      default:
        return [];
    }
  };

  // Update the handleNext function to properly handle date validation
  const handleNext = async () => {
    const isLastStep = currentStepIndex === visibleSteps.length - 2;

    if (isLastStep) {
      // Validate all fields before preview
      const isValid = await form.trigger();
      if (!isValid) {
        const errors = form.formState.errors;
        console.log("Form Errors:", errors); // Debug log

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
          title: "Validation Error",
          description: errorMessages || "Please complete all required fields before generating preview.",
          variant: "destructive",
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const formData = form.getValues();

        // Handle dates and race information
        formData.startDate = new Date(formData.startDate).toISOString();

        // Handle race-specific data
        if (formData.goal === TrainingGoals.FIRST_RACE || formData.goal === TrainingGoals.PERSONAL_BEST) {
          if (formData.targetRace) {
            formData.targetRace.date = new Date(formData.targetRace.date).toISOString();

            // Handle custom distance
            if (formData.targetRace.distance !== RaceDistances.OTHER) {
              formData.targetRace.customDistance = {
                value: 0,
                unit: "miles",
              };
            }
          }
        } else {
          // For non-race goals, ensure targetRace is undefined
          delete formData.targetRace;
        }

        console.log("Generating training plan preview with data:", formData);

        const response = await fetch('/api/training-plans/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const previewData = await response.json();
        console.log("Previewing plan:", previewData);
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

      const response = await fetch('/api/training-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewData),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      if (onPreview) {
        onPreview(previewData);
      }

      setOpen(false);
      setCurrentStepIndex(0);
      form.reset();

      toast({
        title: "Success!",
        description: "Your training plan has been created and saved.",
      });

      // Redirect to training home
      window.location.href = "/training";
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: "Error",
        description: "Failed to save plan. Please try again.",
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
                      form.setValue("targetRace.customDistance.unit", "miles"); // set default unit
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
                {form.watch("targetRace.distance") === RaceDistances.OTHER && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="targetRace.customDistance.value"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distance</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="targetRace.customDistance.unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || "miles"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="miles">Miles</SelectItem>
                              <SelectItem value="kilometers">Kilometers</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
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
                  <TimeInput
                    value={field.value || ""}
                    onChange={field.onChange}
                    error={!!form.formState.errors.targetRace?.previousBest}
                  />
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
                    <TimeInput
                      value={field.value || ""}
                      onChange={field.onChange}
                      error={!!form.formState.errors.targetRace?.goalTime}
                    />
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
      case "coachingStyle":
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.coachingStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>What type of coaching style would you prefer?</FormLabel>
                <FormDescription>
                  {CoachingStyleDescriptions[field.value as keyof typeof CoachingStyleDescriptions] ||
                    "Choose a coaching style that matches your preferences"}
                </FormDescription>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coaching style" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(CoachingStyles).map(([key, value]) => (
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
                      form.setValue("startDate", today.toISOString(), {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true
                      });
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
                      form.setValue("startDate", nextMondayDate.toISOString(), {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true
                      });
                    }}
                  >
                    Start Next Week
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      field.onChange(date.toISOString());
                      form.setValue("startDate", date.toISOString(), {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true
                      });
                    }
                  }}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case "confirmation":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Ready to Generate Your Plan</h2>
            <p className="text-muted-foreground">
              We'll create a personalized training plan based on your goals and preferences.
              Click "Preview Plan" to see your customized training schedule.
            </p>
            <div className="bg-muted p-4 rounded-md">
              <h3 className="font-semibold mb-2">Summary of Your Preferences:</h3>
              <p><strong>Goal:</strong> {form.getValues().goal}</p>
              <p>
                <strong>Training Days:</strong> {form.getValues().trainingPreferences.weeklyRunningDays} days/week
              </p>
              <p>
                <strong>Target Mileage:</strong> {form.getValues().trainingPreferences.maxWeeklyMileage} miles/week
              </p>
              <p>
                <strong>Start Date:</strong> {format(new Date(form.getValues().startDate), "PPP")}
              </p>
            </div>
          </div>
        );

      case "preview":
        return (
          <div className="space-y-6">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {previewData ? "Saving your training plan..." : "Generating your personalized training plan..."}
                </p>
              </div>
            ) : previewData ? (
              <div className="space-y-6">
                <div className="border rounded-lg p-6">
                  <ProgramOverview
                    plan={previewData}
                    showActions={false}
                  />
                </div>
                <div className="flex justify-end space-x-4">
                  <Button variant="outline" onClick={handleBack}>
                    Make Changes
                  </Button>
                  <Button onClick={handleApprovePlan} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving Plan...
                      </>
                    ) : (
                      "Approve Plan"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">
                  Please complete previous steps to preview your plan
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "goal") {
        const goal = value.goal;
        if (goal !== TrainingGoals.FIRST_RACE && goal !== TrainingGoals.PERSONAL_BEST) {
          form.setValue("targetRace", undefined);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

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
            <div className="flex-1 px-6 py-4 overflow-y-auto">{renderQuestion()}
            </div>

            <div className="border-t px-6 py-4 flex justify-between items-center">
              {currentStep.id === "preview" ? (
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
                  {currentStep.id === "confirmation" ? (
                    isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      <>
                        Preview Plan
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )
                  ) : (
                    <>
                      Next
                      <ChevronRight className="ml-2 h-4 w-4" />
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