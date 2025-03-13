import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Info, ExternalLink } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { addWeeks } from "date-fns";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { TimeInput } from "./time-input";
import { planGeneratorSchema } from "./plan-generator-schema";
import * as z from "zod";
import { useStravaProfile } from "@/hooks/use-strava-profile";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

import {
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
  TrainingGoals,
} from "./plan-generator-constants";

type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;

interface PlanGeneratorProps {
  existingPlan: boolean;
  onPreview: (planDetails: TrainingPlanWithWeeklyPlans) => void;
}

export default function PlanGenerator({ existingPlan, onPreview }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runningDaysValue, setRunningDaysValue] = useState(3);
  const [mileageValue, setMileageValue] = useState(15);
  const [workoutsValue, setWorkoutsValue] = useState(1);
  const { toast } = useToast();

  // Fetch Strava profile data
  const { data: stravaProfile, isLoading: isLoadingStrava } = useStravaProfile();

  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      startDate: new Date().toISOString(),
      age: undefined,
      gender: undefined,
      preferredDistanceUnit: "miles", // Will be updated from Strava if available
      runningExperience: {
        level: undefined,
        fitnessLevel: undefined
      },
      trainingPreferences: {
        weeklyRunningDays: 3,
        maxWeeklyMileage: 15,
        weeklyWorkouts: 1,
        preferredLongRunDay: "Sunday",
        coachingStyle: "directive"
      },
      goal: undefined,
      targetRace: undefined,
    }
  });

  // Update form when Strava data loads
  useEffect(() => {
    if (stravaProfile) {
      console.log('Updating form with Strava profile:', stravaProfile);

      // Update gender if available
      if (stravaProfile.gender) {
        form.setValue("gender", stravaProfile.gender);
      }

      // Update distance preference
      if (stravaProfile.measurementPreference) {
        form.setValue("preferredDistanceUnit",
          stravaProfile.measurementPreference === "meters" ? "kilometers" : "miles"
        );
      }

      // Update running experience if available
      if (stravaProfile.runningExperience?.level) {
        form.setValue("runningExperience.level", stravaProfile.runningExperience.level);
        form.setValue("runningExperience.fitnessLevel", stravaProfile.runningExperience.level);
      }

      // Update training preferences from Strava data
      const runDays = stravaProfile.runningExperience?.preferredRunDays?.length || 3;
      const mileage = stravaProfile.runningExperience?.weeklyMileage || 15;
      const workouts = stravaProfile.runningExperience?.commonWorkoutTypes?.length || 1;

      form.setValue("trainingPreferences.weeklyRunningDays", runDays);
      form.setValue("trainingPreferences.maxWeeklyMileage", mileage);
      form.setValue("trainingPreferences.weeklyWorkouts", workouts);

      // Update slider values
      setRunningDaysValue(runDays);
      setMileageValue(mileage);
      setWorkoutsValue(workouts);

      // If preferred run days includes Sunday, set it as long run day
      if (stravaProfile.runningExperience?.preferredRunDays?.includes("sunday")) {
        form.setValue("trainingPreferences.preferredLongRunDay", "Sunday");
      }
    }
  }, [stravaProfile, form]);

  const handleClose = () => {
    setOpen(false);
    setCurrentStepIndex(0);
    form.reset();
  };

  const onSubmit = async (values: PlanGeneratorFormData) => {
    try {
      setIsSubmitting(true);

      // Log submission values for debugging
      console.log('Form submission started with values:', {
        goal: values.goal,
        startDate: values.startDate,
        runningExperience: values.runningExperience,
        trainingPreferences: values.trainingPreferences,
        targetRace: values.targetRace
      });

      // Calculate dates
      const startDate = new Date();
      const endDate = values.targetRace?.date
        ? new Date(values.targetRace.date)
        : addWeeks(startDate, 12);

      // Create preview data with all required fields
      const previewData = {
        goal: values.goal,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        runningExperience: values.runningExperience,
        trainingPreferences: values.trainingPreferences,
        targetRace: values.targetRace
      };

      console.log('Sending preview request with data:', previewData);

      // Generate preview plan
      const response = await fetch('/api/training-plans/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(previewData),
      });

      if (!response.ok) {
        console.error('Preview generation failed:', {
          status: response.status,
          statusText: response.statusText
        });
        throw new Error('Error generating plan preview');
      }

      const previewPlan = await response.json();
      console.log('Received preview plan:', previewPlan);

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

  const STEPS = [
    { id: "connect-strava", label: "Connect Strava",
      conditional: () => !stravaProfile && !isLoadingStrava }, // Only show if not connected
    { id: "welcome", label: "Welcome" },
    { id: "basicProfile", label: "Basic Profile" },
    { id: "runningProfile", label: "Running Profile" },
    { id: "goal", label: "Training Goal" },
    {
      id: "raceDetails",
      label: "Race Details",
      conditional: (values: PlanGeneratorFormData) => values.goal === TrainingGoals.RACE_TRAINING,
    },
    { id: "trainingPreferences", label: "Training Preferences" },
  ];

  const handleNext = async () => {
    const currentStep = STEPS[currentStepIndex];
    const currentFields = getFieldsForStep(currentStep.id);

    if (currentFields.length > 0) {
      const isValid = await form.trigger(currentFields as any);
      if (!isValid) return;
    }

    setCurrentStepIndex((prev) => prev + 1);
  };

  const handleBack = () => {
    setCurrentStepIndex((prev) => prev - 1);
  };

  // Only show steps that meet their conditions
  const visibleSteps = STEPS.filter(
    (step) => !step.conditional || step.conditional(form.getValues())
  );

  const currentStep = visibleSteps[currentStepIndex];
  const isLastStep = currentStepIndex === visibleSteps.length - 1;

  const renderStepContent = () => {
    switch (currentStep.id) {
      case "connect-strava":
        return (
          <div className="space-y-6">
            {isLoadingStrava ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : stravaProfile ? (
              <Card>
                <CardHeader>
                  <CardTitle>Connected to Strava</CardTitle>
                  <CardDescription>
                    We'll use your Strava data to create a personalized training plan:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Recent running volume: {(stravaProfile.runningExperience?.weeklyMileage || 0)} miles/week</li>
                    <li>Preferred running days: {(stravaProfile.runningExperience?.preferredRunDays?.join(", ") || "Not set")}</li>
                    <li>Common workout types: {(stravaProfile.runningExperience?.commonWorkoutTypes?.join(", ") || "Not set")}</li>
                  </ul>
                  <Button className="w-full mt-4" onClick={handleNext}>
                    Continue
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Connect with Strava</CardTitle>
                  <CardDescription>
                    Connecting your Strava account helps us create a more personalized training plan by:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Analyzing your current running patterns and volume</li>
                    <li>Understanding your preferred running days and times</li>
                    <li>Detecting your common workout types (easy runs, long runs, tempo, etc.)</li>
                    <li>Using your preferred distance units (miles/kilometers)</li>
                  </ul>

                  <div className="mt-6 space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        You'll be redirected to Strava to sign in. If you have two-factor authentication (2FA) enabled:
                        <ul className="list-disc pl-6 mt-2">
                          <li>You'll receive a verification code from Strava (not from us)</li>
                          <li>Check your spam folder if you don't see the code</li>
                          <li>The code is valid for a limited time</li>
                        </ul>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Tip: For smoother authorization, you can log in to Strava first in another tab, then return here to connect.
                          This will skip the verification code step entirely.
                        </p>
                      </AlertDescription>
                    </Alert>

                    <Button className="w-full" onClick={async () => {
                      try {
                        // Include current step in return URL
                        const returnPath = `/training?planGeneratorStep=${currentStepIndex}`;
                        const response = await fetch(`/api/auth/strava?returnTo=${encodeURIComponent(returnPath)}`);
                        const data = await response.json();

                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          toast({
                            title: "Error",
                            description: "Failed to get Strava authorization URL",
                            variant: "destructive"
                          });
                        }
                      } catch (error) {
                        console.error('Error connecting to Strava:', error);
                        toast({
                          title: "Error",
                          description: "Failed to connect to Strava",
                          variant: "destructive"
                        });
                      }
                    }}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Connect with Strava
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "welcome":
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Welcome to Training Plan Generator</h2>
            <p className="text-muted-foreground">
              Let's create a personalized training plan that matches your goals and preferences.
            </p>
            {isLoadingStrava && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            {stravaProfile && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  We've pre-filled some of your preferences based on your Strava data.
                  You can adjust these as needed.
                </AlertDescription>
              </Alert>
            )}
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
                      <SelectItem value={TrainingGoals.RACE_TRAINING}>Training for a Race</SelectItem>
                      <SelectItem value={TrainingGoals.GENERAL_FITNESS}>Improve General Health & Fitness</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "basicProfile":
        return (
          <div className="space-y-6">
            {isLoadingStrava ? (
              <>
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
              </>
            ) : (
              <>
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
                      {stravaProfile && (
                        <FormDescription>
                          Based on your Strava settings
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </div>
        );

      case "runningProfile":
        return (
          <div className="space-y-6">
            {isLoadingStrava ? (
              <>
                <Skeleton className="h-[72px] w-full" />
                <Skeleton className="h-[72px] w-full" />
              </>
            ) : (
              <>
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
                        {stravaProfile?.runningExperience ? (
                          <>Based on your Strava history: {stravaProfile.runningExperience.level}</>
                        ) : field.value && ExperienceLevelDescriptions[field.value as keyof typeof ExperienceLevelDescriptions]}
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
              </>
            )}
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
                  {stravaProfile?.runningExperience && (
                    <FormDescription>
                      Based on your Strava history: {(stravaProfile.runningExperience.preferredRunDays?.length || 0)} days/week
                    </FormDescription>
                  )}
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
                  {stravaProfile?.runningExperience && (
                    <FormDescription>
                      Based on your Strava history: {(stravaProfile.runningExperience.weeklyMileage || 0)} miles/week
                    </FormDescription>
                  )}
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

  const getFieldsForStep = (step: string): string[] => {
    switch (step) {
      case "connect-strava":
        return [];
      case "welcome":
        return [];
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

  // Add step handling from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('planGeneratorStep');
    if (step) {
      setCurrentStepIndex(parseInt(step));
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {existingPlan ? "Create New Plan" : "Create Training Plan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle>Create Training Plan</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1">
            {/* Main content area with scroll */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(90vh-8rem)]">
                <div className="px-6 py-4 space-y-6">
                  {renderStepContent()}
                </div>
              </ScrollArea>
            </div>

            {/* Fixed navigation footer */}
            <div className="flex justify-between items-center px-6 py-4 border-t bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className={currentStepIndex === 0 ? "invisible" : ""}
              >
                Back
              </Button>
              <div className="flex-1" />
              {currentStep.id === "connect-strava" ? (
                <Button type="button" variant="outline" onClick={handleNext}>
                  Skip for now
                </Button>
              ) : !isLastStep ? (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Plan
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}