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

export default function PlanGenerator({ existingPlan, onPreview }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const { toast } = useToast();

  // Update the form initialization with proper defaults
  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      goal: "",
      goalDescription: "",
      startDate: new Date().toISOString(), // Provide a sensible default for date
      runningExperience: {
        level: "",
        fitnessLevel: "",
      },
      trainingPreferences: {
        weeklyRunningDays: 3, // Default to 3 days (more reasonable)
        maxWeeklyMileage: 15, // Default to 15 miles
        weeklyWorkouts: 1, // Default to 1 session
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
    mode: "onChange",
  });

  // Get current visible steps based on form data
  const visibleSteps = STEPS.filter(step =>
    !step.conditional || step.conditional(form.getValues())
  );

  const currentStep = visibleSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / visibleSteps.length) * 100;

  const onSubmit = async (data: PlanGeneratorFormData) => {
    try {
      setIsSubmitting(true);
      console.log("Generating preview with data:", data);

      const endDate = data.targetRace?.date
        ? new Date(data.targetRace.date)
        : addWeeks(new Date(data.startDate), 12);

      const planData = {
        ...data,
        endDate,
      };

      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      setPreviewData(planData);
      setCurrentStepIndex(visibleSteps.length - 1); // Move to preview step
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
  };

  // Improved handleNext function with better validation and error handling
  const handleNext = async () => {
    const isLastStep = currentStepIndex === visibleSteps.length - 1;

    // Ensure all required fields are filled out
    let isValid = true;

    // First trigger validation on the entire form
    isValid = await form.trigger();

    if (isValid) {
      if (isLastStep) {
          onSubmit(form.getValues());
      } else {
          setCurrentStepIndex(currentStepIndex + 1);
      }
    } else {
      // Show validation errors
      const errors = form.formState.errors;
      console.log("Form validation errors:", errors);

      toast({
        title: "Please complete all required fields",
        description: "Some required information is missing or invalid.",
        variant: "destructive",
      });
    }
  };

  // Update handleBack to maintain state properly
  const handleBack = () => {
    if (currentStepIndex === visibleSteps.length - 1) {
      setPreviewData(null);
    }

    // Simply move back without resetting slider values
    setCurrentStepIndex(Math.max(currentStepIndex - 1, 0));
  };

  const handleApprovePlan = () => {
    if (onPreview && previewData) {
      onPreview(previewData);
      setOpen(false);
    }
  };

  const handleRequestChanges = async () => {
    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Plan Updated",
        description: "The training plan has been adjusted based on your feedback.",
      });
    } catch (error) {
      console.error("Error updating plan:", error);
      toast({
        title: "Error",
        description: "Failed to update plan. Please try again.",
        variant: "destructive",
      });
    }
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

  // Use state to track if initialization has happened
  const [initializedDefaults, setInitializedDefaults] = useState(false);

  // Initialize form values when the component mounts
  useEffect(() => {
    // Only initialize values once and only if they haven't been properly set
    if (!initializedDefaults) {
      const defaultsToCheck = [
        {
          path: 'trainingPreferences.weeklyRunningDays',
          defaultValue: 3,
          min: 1,
          max: 7
        },
        {
          path: 'trainingPreferences.maxWeeklyMileage',
          defaultValue: 15,
          min: 0,
          max: 150
        },
        {
          path: 'trainingPreferences.weeklyWorkouts',
          defaultValue: 1,
          min: 0,
          max: 3
        }
      ];

      let valuesSet = false;

      defaultsToCheck.forEach(({ path, defaultValue, min, max }) => {
        const currentValue = form.getValues(path);
        if (currentValue === undefined || currentValue === null || 
            currentValue < min || currentValue > max) {
          form.setValue(path, defaultValue, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
          valuesSet = true;
        }
      });

      // Mark initialization as complete
      setInitializedDefaults(true);
    }
  }, [form, initializedDefaults]); // Add proper dependencies

  // Use local state to track slider values independently
  const [weeklyRunningDays, setWeeklyRunningDays] = useState<number | null>(null);
  const [weeklyMileage, setWeeklyMileage] = useState<number | null>(null);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<number | null>(null);

  // Combine all slider initializations into a single useEffect to avoid hook count changes
  useEffect(() => {
    // Initialize weekly running days if not set
    if (weeklyRunningDays === null) {
      const runningDaysValue = form.getValues('trainingPreferences.weeklyRunningDays');
      setWeeklyRunningDays(runningDaysValue);
    }

    // Initialize weekly mileage if not set
    if (weeklyMileage === null) {
      const mileageValue = form.getValues('trainingPreferences.maxWeeklyMileage');
      setWeeklyMileage(mileageValue);
    }

    // Initialize weekly workouts if not set
    if (weeklyWorkouts === null) {
      const workoutsValue = form.getValues('trainingPreferences.weeklyWorkouts');
      setWeeklyWorkouts(workoutsValue);
    }
  }, [form, weeklyRunningDays, weeklyMileage, weeklyWorkouts]);

  // Weekly Running Days field component that properly preserves state
  const renderWeeklyRunningDaysField = () => {
    // The local state should be initialized outside of the render function
    // Instead of using useEffect in the render function, we'll use the existing form value 
    // or default to 3 if not set
    const formValue = form.getValues('trainingPreferences.weeklyRunningDays') || 3;
    // Only set the state if it hasn't been initialized yet
    if (weeklyRunningDays === null) {
      setWeeklyRunningDays(formValue);
    }

    // Use local state with fallback to default
    const value = weeklyRunningDays !== null ? weeklyRunningDays : 3;

    return (
      <FormItem>
        <FormLabel>How many days per week would you like to run?</FormLabel>
        <FormControl>
          <Slider
            min={1}
            max={7}
            step={1}
            value={[value]}
            onValueChange={(vals) => {
              // Update both local state and form value
              const newValue = Math.min(Math.max(Math.round(vals[0]), 1), 7);
              setWeeklyRunningDays(newValue);
              form.setValue('trainingPreferences.weeklyRunningDays', newValue, { shouldValidate: true });
            }}
          />
        </FormControl>
        <div className="text-sm text-muted-foreground text-center">
          {value} days per week
        </div>
        <FormMessage />
      </FormItem>
    );
  };

  // Weekly Mileage field component that properly preserves state
  const renderWeeklyMileageField = () => {
    // Initialize from form value directly
    const formValue = form.getValues('trainingPreferences.maxWeeklyMileage') || 15;
    if (weeklyMileage === null) {
      setWeeklyMileage(formValue);
    }

    // Use local state with fallback to default
    const value = weeklyMileage !== null ? weeklyMileage : 15;

    return (
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
            value={[value]}
            onValueChange={(vals) => {
              // Always round to nearest 5 and update both local state and form
              const roundedValue = Math.min(Math.max(Math.round(vals[0] / 5) * 5, 0), 150);
              setWeeklyMileage(roundedValue);
              form.setValue('trainingPreferences.maxWeeklyMileage', roundedValue, { shouldValidate: true });
            }}
          />
        </FormControl>
        <div className="text-sm text-muted-foreground text-center">
          {value} miles per week
        </div>
        <FormMessage />
      </FormItem>
    );
  };

  // Quality Sessions field component that properly preserves state
  const renderQualitySessionsField = () => {
    const formValue = form.getValues('trainingPreferences.weeklyWorkouts') || 1;
    if (weeklyWorkouts === null) {
      setWeeklyWorkouts(formValue);
    }

    // Use local state with fallback to default
    const value = weeklyWorkouts !== null ? weeklyWorkouts : 1;

    return (
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
            value={[value]}
            onValueChange={(vals) => {
              // Ensure we only get integers from 0-3 and update both states
              const newValue = Math.min(Math.max(Math.round(vals[0]), 0), 3);
              setWeeklyWorkouts(newValue);
              form.setValue('trainingPreferences.weeklyWorkouts', newValue, { shouldValidate: true });
            }}
          />
        </FormControl>
        <div className="text-sm text-muted-foreground text-center">
          {value} quality sessions per week
        </div>
        <FormMessage />
      </FormItem>
    );
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

                    // If changing from "Other" to a standard distance, clear custom values
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
                      value={field.value.split(":")[0] || ""}
                      onChange={(e) => {
                        const [_, mm, ss] = field.value.split(":") || ["", "", ""];
                        const newHH = e.target.value.padStart(2, "0");
                        field.onChange(`${newHH}:${mm || "00"}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="MM"
                      value={field.value.split(":")[1] || ""}
                      onChange={(e) => {
                        const [hh, _, ss] = field.value.split(":") || ["", "", ""];
                        const newMM = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${newMM}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="SS"
                      value={field.value.split(":")[2] || ""}
                      onChange={(e) => {
                        const [hh, mm, _] = field.value.split(":") || ["", "", ""];
                        const newSS = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${mm || "00"}:${newSS}`);
                      }}
                    />
                  </div>
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
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="HH"
                      value={field.value.split(":")[0] || ""}
                      onChange={(e) => {
                        const [_, mm, ss] = field.value.split(":") || ["", "", ""];
                        const newHH = e.target.value.padStart(2, "0");
                        field.onChange(`${newHH}:${mm || "00"}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="MM"
                      value={field.value.split(":")[1] || ""}
                      onChange={(e) => {
                        const [hh, _, ss] = field.value.split(":") || ["", "", ""];
                        const newMM = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${newMM}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="SS"
                      value={field.value.split(":")[2] || ""}
                      onChange={(e) => {
                        const [hh, mm, _] = field.value.split(":") || ["", "", ""];
                        const newSS = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${mm || "00"}:${newSS}`);
                      }}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                          form.setValue('startDate', today.toISOString(), { shouldValidate: true });
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
                          form.setValue('startDate', nextMondayDate.toISOString(), { shouldValidate: true });
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
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date.toISOString());
                              form.setValue('startDate', date.toISOString(), { shouldValidate: true });
                            }
                          }}
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
        return (
          <div className="space-y-6">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating your training plan...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments as we tailor a plan to your needs.
                </p>
              </div>
            ) : previewData ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Your Personalized Training Plan</h2>
                <div className="bg-muted p-4 rounded-md text-sm">
                  <p className="font-medium">Training Period:</p>
                  <p>{format(new Date(previewData.startDate), 'MMMM d, yyyy')} - {format(previewData.endDate, 'MMMM d, yyyy')}</p>
                  <p className="font-medium mt-2">Goal:</p>
                  <p>{previewData.goal}: {previewData.goalDescription}</p>
                  <p className="font-medium mt-2">Weekly Schedule:</p>
                  <p>{previewData.trainingPreferences.weeklyRunningDays} days per week, {previewData.trainingPreferences.maxWeeklyMileage} miles max, {previewData.trainingPreferences.weeklyWorkouts} quality sessions</p>
                </div>

                <ProgramOverview
                  plan={previewData}
                  onApprove={handleApprovePlan}
                  onAskQuestion={async (question) => {
                    await handleRequestChanges();
                  }}
                  onRequestChanges={async (changes) => {
                    await handleRequestChanges();
                  }}
                />

                <div className="flex justify-between mt-6">
                  <Button 
                    variant="outline" 
                    onClick={handleBack}
                  >
                    Make Changes
                  </Button>
                  <Button 
                    onClick={handleApprovePlan}
                  >
                    Approve Plan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-lg font-medium">No preview available</p>
                <p className="text-sm text-muted-foreground">
                  Please complete previous steps to generate a plan preview.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setCurrentStepIndex(0)}
                >
                  Start Over
                </Button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Function to properly update form values when slider changes
  const onSliderChange = (fieldName: string, value: number[]) => {
    const numValue = value[0];
    form.setValue(fieldName, numValue, { 
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });
  };

  // Separate effects for each slider to prevent cross-influence
  useEffect(() => {
    // Make sure weeklyRunningDays has a valid value on first render
    const weeklyRunningDays = form.getValues('trainingPreferences.weeklyRunningDays');
    if (!weeklyRunningDays || weeklyRunningDays < 1 || weeklyRunningDays > 7) {
      form.setValue('trainingPreferences.weeklyRunningDays', 3, { shouldValidate: true });
    }
  }, []);

  // Separate effect for weekly mileage
  useEffect(() => {
    //    // Make sure maxWeeklyMileage has a valid value on first render
    const maxWeeklyMileage = form.getValues('trainingPreferences.maxWeeklyMileage');
    if (!maxWeeklyMileage || maxWeeklyMileage < 10 || maxWeeklyMileage > 100) {
      form.setValue('trainingPreferences.maxWeeklyMileage', 15, { shouldValidate: true });
    }
  }, []);

  // Separate effect for weekly workouts
  useEffect(() => {
    // Make sure weeklyWorkouts has a valid value on first render
    const weeklyWorkouts = form.getValues('trainingPreferences.weeklyWorkouts');
    if (!weeklyWorkouts || weeklyWorkouts < 0 || weeklyWorkouts > 5) {
      form.setValue('trainingPreferences.weeklyWorkouts', 1, { shouldValidate: true });
    }
  }, []);

  const renderStepContent = () => {
    const step = visibleSteps[currentStepIndex];
    switch (step.id) {
      case "runningDays":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="trainingPreferences.weeklyRunningDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many days per week do you want to run?</FormLabel>
                  <FormControl>
                    <div className="space-y-6">
                      <Slider
                        value={[field.value]}
                        min={1}
                        max={7}
                        step={1}
                        onValueChange={(value) => {
                          onSliderChange("trainingPreferences.weeklyRunningDays", value);
                        }}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs">1</span>
                        <div className="text-center">
                          <span className="font-bold text-lg">{field.value}</span>
                          <p className="text-sm text-muted-foreground">days per week</p>
                        </div>
                        <span className="text-xs">7</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>Select the number of days you want to run each week.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case "mileage":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="trainingPreferences.maxWeeklyMileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What's your target weekly mileage?</FormLabel>
                  <FormControl>
                    <div className="space-y-6">
                      <Slider
                        value={[field.value]}
                        min={10}
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          onSliderChange("trainingPreferences.maxWeeklyMileage", value);
                        }}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs">10 miles</span>
                        <div className="text-center">
                          <span className="font-bold text-lg">{field.value}</span>
                          <p className="text-sm text-muted-foreground">miles per week</p>
                        </div>
                        <span className="text-xs">100+ miles</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Set your target maximum weekly mileage. This helps calibrate your training intensity.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case "workouts":
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="trainingPreferences.weeklyWorkouts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How many quality sessions do you want per week?</FormLabel>
                  <FormControl>
                    <div className="space-y-6">
                      <Slider
                        value={[field.value]}
                        min={0}
                        max={5}
                        step={1}
                        onValueChange={(value) => {
                          onSliderChange("trainingPreferences.weeklyWorkouts", value);
                        }}
                      />
                      <div className="flex justify-between items-center">
                        <span className="text-xs">0</span>
                        <div className="text-center">
                          <span className="font-bold text-lg">{field.value}</span>
                          <p className="text-sm text-muted-foreground">quality sessions per week</p>
                        </div>
                        <span className="text-xs">5</span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Quality sessions include interval training, tempo runs, and other structured workouts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case "startDate":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">When would you like to start?</h3>
            <div className="flex space-x-2 mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.setValue('startDate', new Date().toISOString(), { shouldValidate: true })}
              >
                Start Today
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => form.setValue('startDate', nextMonday(new Date()).toISOString(), { shouldValidate: true })}
              >
                Start Next Week
              </Button>
            </div>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        form.setValue("startDate", date.toISOString(), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
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

                    // If changing from "Other" to a standard distance, clear custom values
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
                      value={field.value.split(":")[0] || ""}
                      onChange={(e) => {
                        const [_, mm, ss] = field.value.split(":") || ["", "", ""];
                        const newHH = e.target.value.padStart(2, "0");
                        field.onChange(`${newHH}:${mm || "00"}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="MM"
                      value={field.value.split(":")[1] || ""}
                      onChange={(e) => {
                        const [hh, _, ss] = field.value.split(":") || ["", "", ""];
                        const newMM = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${newMM}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="SS"
                      value={field.value.split(":")[2] || ""}
                      onChange={(e) => {
                        const [hh, mm, _] = field.value.split(":") || ["", "", ""];
                        const newSS = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${mm || "00"}:${newSS}`);
                      }}
                    />
                  </div>
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
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="HH"
                      value={field.value.split(":")[0] || ""}
                      onChange={(e) => {
                        const [_, mm, ss] = field.value.split(":") || ["", "", ""];
                        const newHH = e.target.value.padStart(2, "0");
                        field.onChange(`${newHH}:${mm || "00"}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="MM"
                      value={field.value.split(":")[1] || ""}
                      onChange={(e) => {
                        const [hh, _, ss] = field.value.split(":") || ["", "", ""];
                        const newMM = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${newMM}:${ss || "00"}`);
                      }}
                    />
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      placeholder="SS"
                      value={field.value.split(":")[2] || ""}
                      onChange={(e) => {
                        const [hh, mm, _] = field.value.split(":") || ["", "", ""];
                        const newSS = e.target.value.padStart(2, "0");
                        field.onChange(`${hh || "00"}:${mm || "00"}:${newSS}`);
                      }}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                          form.setValue('startDate', today.toISOString(), { shouldValidate: true });
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
                          form.setValue('startDate', nextMondayDate.toISOString(), { shouldValidate: true });
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
                          onSelect={(date) => {
                            if (date) {
                              field.onChange(date.toISOString());
                              form.setValue('startDate', date.toISOString(), { shouldValidate: true });
                            }
                          }}
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
        return (
          <div className="space-y-6">
            {isSubmitting ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">Generating your training plan...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few moments as we tailor a plan to your needs.
                </p>
              </div>
            ) : previewData ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Your Personalized Training Plan</h2>
                <div className="bg-muted p-4 rounded-md text-sm">
                  <p className="font-medium">Training Period:</p>
                  <p>{format(new Date(previewData.startDate), 'MMMM d, yyyy')} - {format(previewData.endDate, 'MMMM d, yyyy')}</p>
                  <p className="font-medium mt-2">Goal:</p>
                  <p>{previewData.goal}: {previewData.goalDescription}</p>
                  <p className="font-medium mt-2">Weekly Schedule:</p>
                  <p>{previewData.trainingPreferences.weeklyRunningDays} days per week, {previewData.trainingPreferences.maxWeeklyMileage} miles max, {previewData.trainingPreferences.weeklyWorkouts} quality sessions</p>
                </div>

                <ProgramOverview
                  plan={previewData}
                  onApprove={handleApprovePlan}
                  onAskQuestion={async (question) => {
                    await handleRequestChanges();
                  }}
                  onRequestChanges={async (changes) => {
                    await handleRequestChanges();
                  }}
                />

                <div className="flex justify-between mt-6">
                  <Button 
                    variant="outline" 
                    onClick={handleBack}
                  >
                    Make Changes
                  </Button>
                  <Button 
                    onClick={handleApprovePlan}
                  >
                    Approve Plan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-lg font-medium">No preview available</p>
                <p className="text-sm text-muted-foreground">
                  Please complete previous steps to generate a plan preview.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setCurrentStepIndex(0)}
                >
                  Start Over
                </Button>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {renderStepContent()}
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

              {currentStepIndex < visibleSteps.length - 1 && (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
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
}

const renderStartDateField = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">When would you like to start?</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.setValue("startDate", new Date().toISOString());
            form.trigger("startDate");
          }}
        >
          Start Today
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            form.setValue("startDate", nextMonday(new Date()).toISOString());
            form.trigger("startDate");
          }}
        >
          Start Next Week
        </Button>
      </div>

      <FormField
        control={form.control}
        name="startDate"
        render={({ field }) => (
          <FormItem className="flex flex-col items-center">
            <Calendar
              className="rounded-md border"
              mode="single"
              selected={field.value ? new Date(field.value) : undefined}
              onSelect={(date) => {
                if (date) {
                  form.setValue("startDate", date.toISOString());
                  form.trigger("startDate");
                }
              }}
              disabled={(date) => date < new Date()}
              initialFocus
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

const renderCurrentStep = () => {
        const currentStep = visibleSteps[currentStepIndex];
        if (!currentStep) return null;

        switch (currentStep.id) {
          case "goal":
            return renderGoalField();
          case "raceDistance":
            return renderRaceDistanceField();
          case "raceDate":
            return renderRaceDateField();
          case "raceTimes":
            return renderRaceTimesField();
          case "experience":
            return renderExperienceLevelField();
          case "fitness":
            return renderFitnessLevelField();
          case "runningDays":
            return renderWeeklyRunningDaysField();
          case "mileage":
            return renderWeeklyMileageField();
          case "workouts":
            return renderQualitySessionsField();
          case "longRunDay":
            return renderLongRunDayField();
          case "coachingStyle":
            return renderCoachingStyleField();
          case "startDate":
            return renderStartDateField();
          case "preview":
            return renderPlanPreview();
          default:
            return null;
        }
      };

const handleSubmitPlan = async (data: PlanGeneratorFormData) => {
    console.log("Submitting plan with data:", data);

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

    try {
      // Calculate end date based on goal and race date
      const planStartDate = new Date(data.startDate);
      let endDate: Date;

      if (data.goal === TrainingGoals.FIRST_RACE || data.goal === TrainingGoals.PERSONAL_BEST) {
        endDate = new Date(data.targetRace!.date);
      } else {
        // For general fitness, set end date to 12 weeks after start
        endDate = addWeeks(planStartDate, 12);
      }

      // Prepare the plan data to preview
      const planData = {
        ...data,
        endDate
      };

      // Send data to the parent component for preview
      if (onPreview) {
        onPreview(planData);
      }

      // Close the dialog
      setOpen(false);

      // Reset form and state
      form.reset();
      setCurrentStepIndex(0);
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