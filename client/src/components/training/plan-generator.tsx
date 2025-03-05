import { useState } from "react";
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
      startDate: "",
      runningExperience: {
        level: "",
        fitnessLevel: "",
      },
      trainingPreferences: {
        weeklyRunningDays: 1, // Default to 1 day
        maxWeeklyMileage: 0, // Default to 0 miles
        weeklyWorkouts: 0, // Default to 0 sessions
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

  // Update handleNext to reset fields when moving between steps
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

          // Simulate AI processing time
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
      } else {
        toast({
          title: "Please complete all required fields",
          description: "Some required information is missing or invalid.",
          variant: "destructive",
        });
      }
    } else {
      // Get all fields for the current step
      const currentStepFields = getFieldsForStep(currentStep.id);

      // Validate only the current step's fields
      const isValid = await form.trigger(currentStepFields);

      if (isValid) {
        // Reset fields for the next step to ensure proper initialization
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
        // Show specific validation errors
        const errors = form.formState.errors;
        const errorMessages = Object.values(errors)
          .map(error => error.message)
          .join(", ");

        toast({
          title: "Please complete this step",
          description: errorMessages || "Please fill in all required fields correctly.",
          variant: "destructive",
        });
      }
    }
  };

  // Update handleBack to reset fields when moving backward
  const handleBack = () => {
    if (currentStepIndex === visibleSteps.length - 1) {
      setPreviewData(null);
    }

    const prevStepIndex = Math.max(currentStepIndex - 1, 0);
    const prevStepId = visibleSteps[prevStepIndex]?.id;

    // Reset fields for the previous step
    if (prevStepId === 'mileage') {
      form.setValue('trainingPreferences.maxWeeklyMileage', 0);
    } else if (prevStepId === 'workouts') {
      form.setValue('trainingPreferences.weeklyWorkouts', 0);
    } else if (prevStepId === 'runningDays') {
      form.setValue('trainingPreferences.weeklyRunningDays', 1);
    }

    setCurrentStepIndex(prevStepIndex);
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
        return ["targetRace.distance", "targetRace.customDistance.value", "targetRace.customDistance.unit"];
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

  // Update Weekly Running Days field component
  const renderWeeklyRunningDaysField = () => (
    <FormField
      control={form.control}
      name="trainingPreferences.weeklyRunningDays"
      render={({ field }) => {
        const value = typeof field.value === 'number' ? field.value : 1;

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
                  field.onChange(vals[0]);
                }}
              />
            </FormControl>
            <div className="text-sm text-muted-foreground text-center">
              {value} days per week
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  // Update Weekly Mileage field component
  const renderWeeklyMileageField = () => (
    <FormField
      control={form.control}
      name="trainingPreferences.maxWeeklyMileage"
      render={({ field }) => {
        const value = typeof field.value === 'number' ? field.value : 0;

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
                  const roundedValue = Math.round(vals[0] / 5) * 5;
                  field.onChange(roundedValue);
                }}
              />
            </FormControl>
            <div className="text-sm text-muted-foreground text-center">
              {value} miles per week
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

  // Update Quality Sessions field component
  const renderQualitySessionsField = () => (
    <FormField
      control={form.control}
      name="trainingPreferences.weeklyWorkouts"
      render={({ field }) => {
        const value = typeof field.value === 'number' ? field.value : 0;

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
                  field.onChange(vals[0]);
                }}
              />
            </FormControl>
            <div className="text-sm text-muted-foreground text-center">
              {value} quality sessions per week
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );

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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <div className="grid grid-cols-2 gap-4">
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
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
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
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>When would you like to start?</FormLabel>
                <div className="flex gap-4 mb-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => field.onChange(new Date().toISOString())}
                  >
                    Start Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => field.onChange(nextMonday(new Date()).toISOString())}
                  >
                    Start Next Week
                  </Button>
                </div>
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date?.toISOString())}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border mx-auto"
                />
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case "preview":
        return previewData && (
          <div className="space-y-6">
            <div className="p-6 bg-muted rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Training Plan Preview</h3>
              <ProgramOverview
                plan={previewData}
                onApprove={handleApprovePlan}
                onAskQuestion={async (question: string) => {
                  // Handle AI coach interaction
                  console.log("Question asked:", question);
                  // TODO: Implement AI coach interaction
                }}
                onRequestChanges={async (changes: string) => {
                  // Handle plan modification requests
                  console.log("Changes requested:", changes);
                  await handleRequestChanges();
                }}
              />
            </div>
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