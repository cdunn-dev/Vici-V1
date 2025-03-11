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
import { Wand2, Loader2, ChevronRight, ChevronLeft, HelpCircle, Bug } from "lucide-react";
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
  GenderOptions,
  GenderLabels,
  DistanceUnits,
} from "./plan-generator-constants";
import { TimeInput } from "./time-input";

// Update STEPS array to include a final confirmation step and basic profile step
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

  // Form initialization with proper defaults including coachingStyle and new fields
  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      goal: undefined, // Let it be undefined initially
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
      targetRace: undefined, // Will be filled conditionally based on goal
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
      case "raceDetails":
        return ["targetRace.distance", "targetRace.date", "targetRace.name"]; // Added race name
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
      case "basicProfile":
        return ["age", "gender", "preferredDistanceUnit"];
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

  const goToNextStep = () => {
    setCurrentStepIndex(currentStepIndex + 1);
  };

  // Render the current step
  const renderStepContent = (step: string) => {
    switch (step) {
      case "welcome":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Create Your Personalised Training Plan</h2>
            <p className="text-muted-foreground">
              Let our AI build a plan based on your running history and goals. We'll guide you through a few simple steps to create a training plan tailored to your needs.
            </p>
            <div className="flex justify-center py-4">
              <Wand2 className="h-16 w-16 text-primary" />
            </div>
          </div>
        );

      case "basicProfile":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tell Us About Yourself</h2>
            <p className="text-muted-foreground">
              This information helps us create a more personalized training experience.
            </p>

            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={13}
                      max={120}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Must be at least 13 years old
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(GenderOptions).map(([key, value]) => (
                        <SelectItem key={key} value={value}>
                          {GenderLabels[value as keyof typeof GenderLabels]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredDistanceUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Distance Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your preferred unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DistanceUnits).map(([key, value]) => (
                        <SelectItem key={key} value={value}>
                          {value.charAt(0).toUpperCase() + value.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "stravaConnect":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Connect Your Running Data</h2>
            <p className="text-muted-foreground">
              Connect with Strava to let us analyze your running history and tailor your plan accordingly. This helps us create a more personalized training experience.
            </p>
            <div className="flex justify-center py-4">
              <Button variant="outline" className="bg-[#FC4C02] text-white hover:bg-[#E34402]">
                Connect with Strava
              </Button>
            </div>
            <div className="text-center mt-4">
              <Button variant="link" onClick={() => goToNextStep()}>
                Skip this step
              </Button>
            </div>
          </div>
        );

      case "runningProfile":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Tell Us About Your Running</h2>
            <p className="text-muted-foreground">
              To create a plan that fits your needs, we need to know a bit about your running background.
            </p>

            <FormField
              control={form.control}
              name="runningExperience.level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experience Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your experience level" />
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
                  <FormDescription>
                    {field.value && ExperienceLevelDescriptions[field.value as keyof typeof ExperienceLevelDescriptions]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="runningExperience.fitnessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Fitness Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your current fitness level" />
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
                  <FormDescription>
                    {field.value && FitnessLevelDescriptions[field.value as keyof typeof FitnessLevelDescriptions]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "goal":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">What's Your Training Goal?</h2>
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Choose your primary training goal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Race Preparation</SelectLabel>
                        <SelectItem value={TrainingGoals.FIRST_RACE}>
                          {TrainingGoals.FIRST_RACE}
                        </SelectItem>
                        <SelectItem value={TrainingGoals.PERSONAL_BEST}>
                          {TrainingGoals.PERSONAL_BEST}
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>General Fitness</SelectLabel>
                        <SelectItem value={TrainingGoals.GENERAL_FITNESS}>
                          {TrainingGoals.GENERAL_FITNESS}
                        </SelectItem>
                        <SelectItem value={TrainingGoals.HEALTH_AND_FITNESS}>
                          {TrainingGoals.HEALTH_AND_FITNESS}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    This will help us tailor your training plan to your specific needs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "raceDetails":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Race Details</h2>

            <FormField
              control={form.control}
              name="targetRace.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Race Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter the name of your target race" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetRace.distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Race Distance</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

            {form.getValues().goal === TrainingGoals.PERSONAL_BEST && (
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
              </>
            )}
          </div>
        );

      case "trainingPreferences":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Training Preferences</h2>
            <p className="text-muted-foreground">
              Tell us about your preferred training schedule and approach.
            </p>

            <FormField
              control={form.control}
              name="trainingPreferences.weeklyRunningDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekly Running Days: {runningDaysValue}</FormLabel>
                  <FormControl>
                    <Slider
                      value={[runningDaysValue]}
                      min={1}
                      max={7}
                      step={1}
                      onValueChange={(value) => {
                        setRunningDaysValue(value[0]);
                        field.onChange(value[0]);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Select between 1-7 days per week
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainingPreferences.maxWeeklyMileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum Weekly Mileage: {mileageValue}</FormLabel>
                  <FormControl>
                    <Slider
                      value={[mileageValue]}
                      min={5}
                      max={100}
                      step={5}
                      onValueChange={(value) => {
                        setMileageValue(value[0]);
                        field.onChange(value[0]);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Target weekly mileage (approximate)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainingPreferences.weeklyWorkouts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weekly Quality Sessions: {workoutsValue}</FormLabel>
                  <FormControl>
                    <Slider
                      value={[workoutsValue]}
                      min={0}
                      max={3}
                      step={1}
                      onValueChange={(value) => {
                        setWorkoutsValue(value[0]);
                        field.onChange(value[0]);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Quality sessions like intervals or tempo runs
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainingPreferences.preferredLongRunDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Long Run Day</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a day" />
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
                  <FormDescription>
                    The day of the week for your longest run
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trainingPreferences.coachingStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired Coaching Style</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a coaching style" />
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
                  <FormDescription>
                    {field.value && CoachingStyleDescriptions[field.value as keyof typeof CoachingStyleDescriptions]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
                    showActions={true}
                    onApprove={handleApprovePlan}
                    onAskQuestion={async (question) => {
                      setIsSubmitting(true);
                      try {
                        const response = await fetch('/api/training-plans/ask', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            planId: previewData.id,
                            question,
                          }),
                        });

                        if (!response.ok) {
                          throw new Error(await response.text());
                        }

                        toast({
                          title: "Question Sent",
                          description: "Your question has been sent to the AI coach.",
                        });
                      } catch (error) {
                        console.error("Error asking question:", error);
                        toast({
                          title: "Error",
                          description: "Failed to send question. Please try again.",
                          variant: "destructive",
                        });
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    onRequestChanges={async (changes) => {
                      setIsSubmitting(true);
                      try {
                        const response = await fetch('/api/training-plans/modify', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            planId: previewData.id,
                            changes,
                          }),
                        });

                        if (!response.ok) {
                          throw new Error(await response.text());
                        }

                        const updatedPlan = await response.json();
                        setPreviewData(updatedPlan);

                        toast({
                          title: "Plan Updated",
                          description: "Your training plan has been updated based on your feedback.",
                        });
                      } catch (error) {
                        console.error("Error requesting changes:", error);
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

  const currentVisibleStepIndex = currentStepIndex;

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

  const onSubmit = (data: PlanGeneratorFormData) => {
    handleNext();
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full md:w-auto" onClick={() => {
            setCurrentStepIndex(0);
            form.reset();
            setPreviewData(null);
          }}>
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

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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

                {currentStepIndex === visibleSteps.length - 1 ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Plan...
                      </>
                    ) : (
                      <>
                        Save Plan
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isSubmitting}
                  >
                    {currentStep.id === "stravaConnect" ? "Skip" : "Next"}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanGenerator;