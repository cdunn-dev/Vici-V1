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
  { id: "stravaConnect", label: "Connect Strava" },
  { id: "basicProfile", label: "Basic Profile" },
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
      goal: undefined,
      targetRace: undefined,
    },
  });

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
    } else if (currentStep.id === "stravaConnect") {
      // Skip option for Strava connection
      setCurrentStepIndex((prev) => prev + 1);
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

      // Prepare plan data with properly formatted dates
      const planData = {
        ...previewData,
        userId: user.id,
        startDate: new Date().toISOString(),
        endDate: previewData.targetRace ? 
          new Date(previewData.targetRace.date).toISOString() :
          addWeeks(new Date(), 12).toISOString(),
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
        return ["targetRace.distance", "targetRace.date", "targetRace.name", "targetRace.previousBest", "targetRace.goalTime"];
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

  const renderStepContent = (step: string) => {
    switch (step) {
      case "welcome":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Welcome to Training Plan Generator</h2>
            <p className="text-muted-foreground">
              Let's create a personalized training plan that matches your goals and preferences.
            </p>
          </div>
        );

      case "stravaConnect":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Connect Your Running Data</h2>
            <p className="text-muted-foreground">
              Connect with Strava to let us analyze your running history and create a more personalized plan.
            </p>
            <div className="flex flex-col items-center gap-4">
              <Button variant="outline" className="w-full sm:w-auto">
                Connect with Strava
              </Button>
              <Button variant="link" onClick={handleNext}>
                Skip for now
              </Button>
            </div>
          </div>
        );

      case "basicProfile":
        return (
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
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
                        <SelectValue placeholder="Select gender" />
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
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DistanceUnits).map(([key, value]) => (
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
          </div>
        );

      case "runningProfile":
        return (
          <div className="space-y-6">
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
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Goal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your goal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Race Goals</SelectLabel>
                        <SelectItem value={TrainingGoals.FIRST_RACE}>First Race</SelectItem>
                        <SelectItem value={TrainingGoals.PERSONAL_BEST}>Personal Best</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>General Goals</SelectLabel>
                        <SelectItem value={TrainingGoals.GENERAL_FITNESS}>General Fitness</SelectItem>
                        <SelectItem value={TrainingGoals.HEALTH_AND_FITNESS}>Health and Fitness</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "raceDetails":
        return (
          <div className="space-y-6">
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
                  <FormLabel>Race Date</FormLabel>
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

            <FormField
              control={form.control}
              name="targetRace.previousBest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Personal Best</FormLabel>
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
                  <FormLabel>Goal Time</FormLabel>
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
        );

      case "trainingPreferences":
        return (
          <div className="space-y-6">
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
                    Number of quality sessions like intervals or tempo runs
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
                        <SelectValue placeholder="Select day" />
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

            <FormField
              control={form.control}
              name="trainingPreferences.coachingStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired Coaching Style</FormLabel>
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
                  <FormDescription>
                    {field.value && CoachingStyleDescriptions[field.value as keyof typeof CoachingStyleDescriptions]}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
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