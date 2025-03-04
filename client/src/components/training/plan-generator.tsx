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
import { Wand2, Loader2, ChevronRight, ChevronLeft, ThumbsUp, MessageSquare } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { format, addWeeks, nextMonday } from "date-fns";
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

interface PlanGeneratorProps {
  existingPlan?: boolean;
  onPreview?: (plan: PlanGeneratorFormData & { endDate: Date }) => void;
}

const TOTAL_STEPS = 5;

export default function PlanGenerator({ existingPlan, onPreview }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const { toast } = useToast();

  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      goal: TrainingGoals.FIRST_RACE,
      goalDescription: "",
      startDate: new Date().toISOString(),
      runningExperience: {
        level: ExperienceLevels.BEGINNER,
        fitnessLevel: FitnessLevels.SOLID_BASE,
      },
      trainingPreferences: {
        weeklyRunningDays: 4,
        maxWeeklyMileage: 20,
        weeklyWorkouts: 1,
        preferredLongRunDay: DaysOfWeek.SATURDAY,
        coachingStyle: CoachingStyles.COLLABORATIVE,
      },
    },
  });

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
      setCurrentStep(TOTAL_STEPS);
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

  const handleApprovePlan = () => {
    if (onPreview && previewData) {
      onPreview(previewData);
      setOpen(false);
    }
  };

  const handleRequestChanges = async () => {
    try {
      setIsRequestingChanges(true);

      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update the plan based on AI suggestions
      const updatedPlan = {
        ...previewData,
        trainingPreferences: {
          ...previewData.trainingPreferences,
          weeklyRunningDays: Math.min(previewData.trainingPreferences.weeklyRunningDays + 1, 7),
        },
      };

      setPreviewData(updatedPlan);
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
    } finally {
      setIsRequestingChanges(false);
    }
  };

  const handleNext = () => {
    if (currentStep === TOTAL_STEPS - 1) {
      form.handleSubmit(onSubmit)();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, TOTAL_STEPS));
    }
  };

  const handleBack = () => {
    if (currentStep === TOTAL_STEPS) {
      setPreviewData(null);
    }
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const isRaceGoal = form.watch("goal") === TrainingGoals.FIRST_RACE ||
                     form.watch("goal") === TrainingGoals.PERSONAL_BEST;

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
          <DialogTitle>Create Training Plan</DialogTitle>
          {existingPlan && (
            <p className="text-sm text-muted-foreground">
              You already have an active training plan. Creating a new plan will
              replace your current one.
            </p>
          )}
        </DialogHeader>

        <div className="px-6 py-4 border-b">
          <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
          <div className="mt-2 text-sm text-muted-foreground text-center">
            Step {currentStep} of {TOTAL_STEPS}:
            {currentStep === 1 && " Training Goal"}
            {currentStep === 2 && " Experience Level"}
            {currentStep === 3 && " Training Preferences"}
            {currentStep === 4 && " Schedule"}
            {currentStep === 5 && " Preview Plan"}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What's your training goal?</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  <FormField
                    control={form.control}
                    name="goalDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tell us more about your goal</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., I want to complete my first marathon in under 4 hours"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isRaceGoal && (
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
                  )}
                </div>
              )}
              {currentStep === 2 && (
                <div className="space-y-6">
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
                </div>
              )}
              {currentStep === 3 && (
                <div className="space-y-6">
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
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground text-center">
                          {field.value} days per week
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            min={5}
                            max={150}
                            step={5}
                            value={[field.value]}
                            onValueChange={(vals) => field.onChange(Math.round(vals[0] / 5) * 5)}
                          />
                        </FormControl>
                        <div className="text-sm text-muted-foreground text-center">
                          {field.value} miles per week
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>
              )}
              {currentStep === 4 && (
                <div className="space-y-6">
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
                </div>
              )}

              {currentStep === 5 && previewData && (
                <div className="space-y-6">
                  <div className="p-6 bg-muted rounded-lg">
                    <h3 className="text-lg font-semibold mb-4">Training Plan Preview</h3>
                    <div className="space-y-4">
                      <div>
                        <span className="font-medium">Goal:</span> {previewData.goal}
                      </div>
                      <div>
                        <span className="font-medium">Start Date:</span>{" "}
                        {format(new Date(previewData.startDate), "PPP")}
                      </div>
                      <div>
                        <span className="font-medium">End Date:</span>{" "}
                        {format(new Date(previewData.endDate), "PPP")}
                      </div>
                      <div>
                        <span className="font-medium">Weekly Running Days:</span>{" "}
                        {previewData.trainingPreferences.weeklyRunningDays}
                      </div>
                      <div>
                        <span className="font-medium">Peak Weekly Mileage:</span>{" "}
                        {previewData.trainingPreferences.maxWeeklyMileage} miles
                      </div>
                      {/* Add more preview details as needed */}
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-40"
                      onClick={handleRequestChanges}
                      disabled={isRequestingChanges}
                    >
                      {isRequestingChanges ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Request Changes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      className="w-40"
                      onClick={handleApprovePlan}
                      disabled={isRequestingChanges}
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Approve Plan
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t px-6 py-4 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1 || currentStep === 5}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep < TOTAL_STEPS - 1 ? (
                <Button type="button" onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : currentStep === TOTAL_STEPS - 1 ? (
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
                  ) : (
                    "Preview Plan"
                  )}
                </Button>
              ) : null}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const experienceLevelDescriptions = {
  Beginner: "New to running or just starting structured training",
  Intermediate: "Regular runner with some race experience",
  Advanced: "Experienced runner with multiple races completed",
};

const fitnessLevelDescriptions = {
  "Very fit": "Currently training regularly and feeling strong",
  "Solid base": "Maintaining regular activity but room for improvement",
  "Out of shape": "Getting back into fitness after a break",
  "Never run before": "Starting from scratch with running",
};

const coachingStyleDescriptions = {
  Authoritative: "Clear, structured guidance with detailed explanations",
  Directive: "Direct instructions focusing on what needs to be done",
  Motivational: "Encouraging approach emphasizing positive reinforcement",
  Collaborative: "Interactive style working together to achieve goals",
  Hybrid: "Flexible combination of different coaching approaches",
};