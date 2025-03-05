import React, { useState } from "react";
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
import { Wand2, Loader2, ChevronRight, ChevronLeft, HelpCircle } from "lucide-react";
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
import {
  TrainingGoals,
  RaceDistances,
  DistanceUnits,
  ExperienceLevels,
  ExperienceLevelDescriptions,
  FitnessLevels,
  FitnessLevelDescriptions,
  DaysOfWeek,
  CoachingStyles,
  CoachingStyleDescriptions,
} from "./plan-generator-constants";

// Define all possible steps
const STEPS = [
  { id: "goal", label: "Training Goal" },
  { id: "raceDistance", label: "Race Distance", conditional: (data: PlanGeneratorFormData) =>
    data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST },
  { id: "raceDate", label: "Race Date", conditional: (data: PlanGeneratorFormData) =>
    data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST },
  { id: "raceTimes", label: "Race Times", conditional: (data: PlanGeneratorFormData) =>
    data.goal === TrainingGoals.PERSONAL_BEST },
  { id: "experience", label: "Running Experience" },
  { id: "fitness", label: "Current Fitness" },
  { id: "runningDays", label: "Weekly Running Days" },
  { id: "mileage", label: "Weekly Mileage" },
  { id: "workouts", label: "Quality Sessions" },
  { id: "longRunDay", label: "Long Run Day" },
  { id: "coachingStyle", label: "Coaching Style" },
  { id: "startDate", label: "Start Date" },
  { id: "preview", label: "Preview Plan" }
];

interface PlanGeneratorProps {
  existingPlan?: boolean;
  onPreview?: (plan: PlanGeneratorFormData & { endDate: Date }) => void;
}

const PlanGenerator = ({ existingPlan, onPreview }: PlanGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<PlanGeneratorFormData & { endDate: Date } | null>(null);
  const { toast } = useToast();

  // Initialize form with proper defaults
  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      goal: "",
      goalDescription: "",
      startDate: new Date().toISOString(),
      runningExperience: {
        level: "",
        fitnessLevel: "",
      },
      trainingPreferences: {
        weeklyRunningDays: 1,
        maxWeeklyMileage: 0,
        weeklyWorkouts: 0,
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
        goalTime: "",
        previousBest: "",
      },
    },
  });

  // Get visible steps based on form data
  const visibleSteps = STEPS.filter(step =>
    !step.conditional || step.conditional(form.getValues())
  );

  const currentStep = visibleSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / visibleSteps.length) * 100;

  // Helper function to validate the current step
  const validateCurrentStep = async () => {
    const currentFields = getFieldsForStep(currentStep.id);
    const isValid = await form.trigger(currentFields as any);

    if (!isValid) {
      const errors = form.formState.errors;
      const errorMessages = Object.values(errors)
        .map(error => error.message)
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

  // Update the slider field components for proper default handling
  const renderWeeklyRunningDaysField = () => (
    <FormField
      control={form.control}
      name="trainingPreferences.weeklyRunningDays"
      render={({ field }) => (
        <FormItem>
          <FormLabel>How many days per week would you like to run?</FormLabel>
          <FormControl>
            <Slider
              min={1}
              max={7}
              step={1}
              value={[field.value ?? 1]}
              onValueChange={(vals) => {
                field.onChange(Math.round(vals[0]));
              }}
            />
          </FormControl>
          <div className="text-sm text-muted-foreground text-center">
            {field.value ?? 1} days per week
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderWeeklyMileageField = () => (
    <FormField
      control={form.control}
      name="trainingPreferences.maxWeeklyMileage"
      render={({ field }) => (
        <FormItem>
          <FormLabel>What's your target weekly mileage?</FormLabel>
          <FormDescription>
            This will be the peak mileage in your training plan
          </FormDescription>
          <FormControl>
            <Slider
              min={0}
              max={150}
              step={5}
              value={[field.value ?? 0]}
              onValueChange={(vals) => {
                const value = Math.round(vals[0] / 5) * 5;
                field.onChange(value);
              }}
            />
          </FormControl>
          <div className="text-sm text-muted-foreground text-center">
            {field.value ?? 0} miles per week
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderQualitySessionsField = () => (
    <FormField
      control={form.control}
      name="trainingPreferences.weeklyWorkouts"
      render={({ field }) => (
        <FormItem>
          <FormLabel>How many quality sessions per week?</FormLabel>
          <FormDescription>
            These are harder workouts like intervals, tempo runs, or progression runs
          </FormDescription>
          <FormControl>
            <Slider
              min={0}
              max={3}
              step={1}
              value={[field.value ?? 0]}
              onValueChange={(vals) => {
                field.onChange(Math.round(vals[0]));
              }}
            />
          </FormControl>
          <div className="text-sm text-muted-foreground text-center">
            {field.value ?? 0} quality sessions per week
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  // Update handleNext to reset fields properly
  const handleNext = async () => {
    const isLastStep = currentStepIndex === visibleSteps.length - 2;

    if (isLastStep) {
      const isValid = await form.trigger();
      if (isValid) {
        setIsSubmitting(true);
        try {
          const data = form.getValues();
          const endDate = data.targetRace?.date
            ? new Date(data.targetRace.date)
            : addWeeks(new Date(data.startDate), 12);

          const planData = {
            ...data,
            endDate,
          };

          await new Promise(resolve => setTimeout(resolve, 1500));
          setPreviewData(planData);
          setCurrentStepIndex(prev => prev + 1);
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
      }
    } else {
      const currentFields = getFieldsForStep(currentStep.id);
      const isValid = await form.trigger(currentFields as any);

      if (isValid) {
        // Reset slider values when moving to a slider step
        const nextStepIndex = currentStepIndex + 1;
        const nextStepId = visibleSteps[nextStepIndex]?.id;

        if (nextStepId === 'mileage') {
          form.setValue('trainingPreferences.maxWeeklyMileage', 0);
        } else if (nextStepId === 'workouts') {
          form.setValue('trainingPreferences.weeklyWorkouts', 0);
        } else if (nextStepId === 'runningDays') {
          form.setValue('trainingPreferences.weeklyRunningDays', 1);
        }

        setCurrentStepIndex(nextStepIndex);
      } else {
        // Show validation errors
        const errors = form.formState.errors;
        const errorMessages = Object.values(errors)
          .map(error => error.message)
          .filter(Boolean)
          .join(", ");

        toast({
          title: "Please complete this step",
          description: errorMessages || "Please fill in all required fields correctly.",
          variant: "destructive",
        });
      }
    }
  };

  // Handle back button click
  const handleBack = () => {
    if (currentStepIndex === visibleSteps.length - 1) {
      setPreviewData(null);
    }

    const prevStepIndex = Math.max(currentStepIndex - 1, 0);
    const prevStepId = visibleSteps[prevStepIndex]?.id;

    // Reset slider values when moving back to a slider step
    if (prevStepId === 'mileage') {
      form.setValue('trainingPreferences.maxWeeklyMileage', 0);
    } else if (prevStepId === 'workouts') {
      form.setValue('trainingPreferences.weeklyWorkouts', 0);
    } else if (prevStepId === 'runningDays') {
      form.setValue('trainingPreferences.weeklyRunningDays', 1);
    }

    setCurrentStepIndex(prevStepIndex);
  };

  // Helper function to get fields for each step
  const getFieldsForStep = (stepId: string): string[] => {
    switch (stepId) {
      case "goal":
        return ["goal"];
      case "raceDistance":
        if (form.watch("targetRace.distance") === RaceDistances.OTHER) {
          return ["targetRace.distance", "targetRace.customDistance.value", "targetRace.customDistance.unit"];
        }
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

  // Render form fields for sliders

  // Submit the plan
  const handleSubmitPlan = async (data: PlanGeneratorFormData) => {
    try {
      // Validate all fields before proceeding
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Validation Error",
          description: "Please complete all required fields before proceeding.",
          variant: "destructive"
        });
        return;
      }

      setIsSubmitting(true);

      // Calculate end date
      const planStartDate = new Date(data.startDate);
      const endDate = data.targetRace?.date
        ? new Date(data.targetRace.date)
        : addWeeks(planStartDate, 12);

      // Prepare the plan data
      const planData = {
        ...data,
        endDate,
      };

      // If onPreview is provided, call it with the current data
      if (onPreview) {
        onPreview(planData);
      }

      // Reset everything
      setOpen(false);
      form.reset();
      setCurrentStepIndex(0);

      toast({
        title: "Plan Created",
        description: "Your training plan has been created successfully!",
      });
    } catch (error) {
      console.error("Error submitting plan:", error);
      toast({
        title: "Error",
        description: "Failed to create plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the current question based on step ID
  const renderQuestion = () => {
    switch (currentStep.id) {
      case "goal":
        return (
          <FormField
            control={form.control}
            name="goal"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <FormLabel className="text-lg">What's your training goal?</FormLabel>
                <FormDescription>
                  Choose the primary goal you'd like to achieve through your training plan
                </FormDescription>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12">
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
          <>
            <FormField
              control={form.control}
              name="targetRace.distance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Which race distance are you targeting?</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== RaceDistances.OTHER) {
                      form.setValue('targetRace.customDistance.value', 0);
                      form.setValue('targetRace.customDistance.unit', '');
                    }
                  }}
                  defaultValue={field.value}>
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
            {form.watch("targetRace.distance") === RaceDistances.OTHER && (
              <div className="grid grid-cols-2 gap-4 mt-4">
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
                          placeholder="Enter distance"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            )}
          </>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        return renderWeeklyRunningDaysField();

      case "mileage":
        return renderWeeklyMileageField();

      case "workouts":
        return renderQualitySessionsField();

      case "longRunDay":
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.preferredLongRunDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Which day would you prefer for your long run?</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <FormLabel>What coaching style works best for you?</FormLabel>
                <FormDescription>
                  {CoachingStyleDescriptions[field.value as keyof typeof CoachingStyleDescriptions]}
                </FormDescription>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    <div className="flex items-center space-x-2">
                      <span>When would you like to start?</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Choose when you want to begin your training program
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </FormLabel>
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
                  <FormControl>
                    <div className="border rounded-md p-2">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date?.toISOString())}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "preview":
        if (isSubmitting) {
          return (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">Generating your training plan...</p>
              <p className="text-sm text-muted-foreground">
                This may take a few moments as we tailor a plan to your needs.
              </p>
            </div>
          );
        }

        if (!previewData) {
          return (
            <div className="text-center p-8">
              <p>No preview data available</p>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Personalized Training Plan</h2>
            <div className="bg-muted p-4 rounded-md text-sm">
              <p className="font-medium">Training Period:</p>
              <p>
                {format(new Date(previewData.startDate), 'MMMM d, yyyy')} - {format(previewData.endDate, 'MMMM d, yyyy')}
              </p>
              <p className="font-medium mt-2">Goal:</p>
              <p>{previewData.goal}</p>
              <p className="font-medium mt-2">Weekly Schedule:</p>
              <p>
                {previewData.trainingPreferences.weeklyRunningDays} days per week,{' '}
                {previewData.trainingPreferences.maxWeeklyMileage} miles max,{' '}
                {previewData.trainingPreferences.weeklyWorkouts} quality sessions
              </p>
            </div>

            <ProgramOverview
              plan={previewData}
              onApprove={handleSubmitPlan}
            />
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
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
                <p className="max-w-xs">
                  {/* Add help text based on current step */}
                  Help text explaining the current question and its importance
                </p>
              </TooltipContent>
            </Tooltip>
          </DialogTitle>
          <div className="mt-2">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-sm text-muted-foreground text-center">
              Step {currentStepIndex + 1} of {visibleSteps.length}
            </p>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitPlan)} className="flex-1 flex flex-col">
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

              {currentStep.id === "preview" && previewData ? (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Approve Plan"
                  )}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Preview...
                    </>
                  ) : currentStepIndex === visibleSteps.length - 2 ? (
                    "Preview Plan"
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