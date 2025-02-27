import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Wand2, ChevronRight, ChevronLeft } from "lucide-react";

const planGeneratorSchema = z.object({
  // Screen 1
  goal: z.enum(["Personal Best", "Run Fast", "Run Far", "First Race", "Get Fit", "Be Healthy"]),
  goalDescription: z.string().min(1, "Please describe your goal"),

  // Screen 2-5 (Race Details)
  targetRace: z.object({
    distance: z.enum(["5k", "10k", "Half-Marathon", "Marathon", "50k", "100k", "Other"]).optional(),
    customDistance: z.string().optional(),
    date: z.string().optional(),
    previousBest: z.string().optional(),
    goalTime: z.string().optional(),
  }).optional(),

  // Screen 6-8 (Experience)
  runningExperience: z.object({
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    fitnessLevel: z.enum(["Very fit", "Solid base", "Out of shape", "Never run before"]),
    personalBests: z.record(z.string()),
  }),

  // Screen 9-13 (Preferences)
  trainingPreferences: z.object({
    weeklyRunningDays: z.number().min(1).max(7),
    maxWeeklyMileage: z.number().min(1).max(150),
    weeklyWorkouts: z.number().min(0).max(3),
    preferredLongRunDay: z.enum([
      "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    ]),
    coachingStyle: z.enum([
      "Authoritative", "Directive", "Motivational", "Collaborative", "Hybrid"
    ]),
  }),
});

type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;

interface PlanGeneratorProps {
  existingPlan?: boolean;
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

export default function PlanGenerator({ existingPlan }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(1);
  const { toast } = useToast();

  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      runningExperience: {
        level: "Beginner",
        fitnessLevel: "Out of shape",
        personalBests: {},
      },
      trainingPreferences: {
        weeklyRunningDays: 4,
        maxWeeklyMileage: 20,
        weeklyWorkouts: 1,
        preferredLongRunDay: "Saturday",
        coachingStyle: "Collaborative",
      },
    },
  });

  const generatePlan = useMutation({
    mutationFn: async (data: PlanGeneratorFormData) => {
      const res = await apiRequest("POST", "/api/training-plans/generate", {
        ...data,
        userId: 1, // Hardcoded for now
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
      setOpen(false);
      toast({
        title: "Success!",
        description: "Your AI training plan has been generated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to generate training plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    const targetRaceSelected = form.getValues("targetRace")?.distance;
    const hasRaceDate = form.getValues("targetRace")?.date;

    if (currentScreen === 2 && !targetRaceSelected) {
      setCurrentScreen(6); // Skip race-specific screens
    } else if (currentScreen === 8 && (!targetRaceSelected || !hasRaceDate)) {
      setCurrentScreen(9); // Skip personal bests if no race selected
    } else {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handleBack = () => {
    const targetRaceSelected = form.getValues("targetRace")?.distance;
    const hasRaceDate = form.getValues("targetRace")?.date;

    if (currentScreen === 6 && !targetRaceSelected) {
      setCurrentScreen(2); // Go back to race distance screen
    } else if (currentScreen === 9 && (!targetRaceSelected || !hasRaceDate)) {
      setCurrentScreen(7); // Skip personal bests when going back
    } else {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const handleSubmit = (data: PlanGeneratorFormData) => {
    if (existingPlan) {
      setShowConfirmDialog(true);
    } else {
      generatePlan.mutate(data);
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 1:
        return (
          <div className="space-y-4">
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
                      <SelectItem value="Personal Best">Set a Personal Best</SelectItem>
                      <SelectItem value="Run Fast">Run Fast</SelectItem>
                      <SelectItem value="Run Far">Run Far</SelectItem>
                      <SelectItem value="First Race">Complete My First Race</SelectItem>
                      <SelectItem value="Get Fit">Get Fit</SelectItem>
                      <SelectItem value="Be Healthy">Be Healthy</SelectItem>
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
          </div>
        );

      case 2:
        return (
          <FormField
            control={form.control}
            name="targetRace.distance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Are you training for a specific race distance?</FormLabel>
                <FormDescription>Optional - select if you're targeting a specific race</FormDescription>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select race distance" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="5k">5K</SelectItem>
                    <SelectItem value="10k">10K</SelectItem>
                    <SelectItem value="Half-Marathon">Half Marathon</SelectItem>
                    <SelectItem value="Marathon">Marathon</SelectItem>
                    <SelectItem value="50k">50K</SelectItem>
                    <SelectItem value="100k">100K</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 3:
        return (
          <FormField
            control={form.control}
            name="targetRace.customDistance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Race Distance</FormLabel>
                <FormControl>
                  <Input placeholder="Enter custom distance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 4:
          return (
            <FormField
              control={form.control}
              name="targetRace.date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Race Date (Optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
      case 5:
        return (
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="targetRace.previousBest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previous Best Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      step="1"
                      {...field}
                      placeholder="HH:MM:SS"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetRace.goalTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      step="1"
                      {...field}
                      placeholder="HH:MM:SS"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );
      case 6:
        return (
          <FormField
            control={form.control}
            name="runningExperience.level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Running Experience Level</FormLabel>
                <FormDescription>{experienceLevelDescriptions[field.value as keyof typeof experienceLevelDescriptions]}</FormDescription>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 7:
        return (
          <FormField
            control={form.control}
            name="runningExperience.fitnessLevel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Fitness Level</FormLabel>
                <FormDescription>{fitnessLevelDescriptions[field.value as keyof typeof fitnessLevelDescriptions]}</FormDescription>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your fitness level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Very fit">Very fit</SelectItem>
                    <SelectItem value="Solid base">Solid base</SelectItem>
                    <SelectItem value="Out of shape">Out of shape</SelectItem>
                    <SelectItem value="Never run before">Never run before</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 8:
        return (
          <div>
            {/* Personal Bests section (to be implemented) */}
          </div>
        );
      case 9:
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.weeklyRunningDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weekly Running Days</FormLabel>
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
        );
      case 10:
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.maxWeeklyMileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Weekly Mileage</FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={150}
                    step={5}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground text-center">
                  {field.value} miles per week
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 11:
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.weeklyWorkouts"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weekly Workouts/Sessions</FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={3}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <div className="text-sm text-muted-foreground text-center">
                  {field.value} workouts per week
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 12:
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.preferredLongRunDay"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preferred Long Run Day</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 13:
        return (
          <FormField
            control={form.control}
            name="trainingPreferences.coachingStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desired Coaching Style</FormLabel>
                <FormDescription>{coachingStyleDescriptions[field.value as keyof typeof coachingStyleDescriptions]}</FormDescription>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coaching style" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Authoritative">Authoritative</SelectItem>
                    <SelectItem value="Directive">Directive</SelectItem>
                    <SelectItem value="Motivational">Motivational</SelectItem>
                    <SelectItem value="Collaborative">Collaborative</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Create New Training Plan
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Training Plan</DialogTitle>
            {existingPlan && (
              <DialogDescription>
                You already have an active training plan. Creating a new plan will
                replace your current one.
              </DialogDescription>
            )}
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="min-h-[300px]">
                {renderScreen()}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentScreen === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentScreen < 13 ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={generatePlan.isPending}>
                    {generatePlan.isPending ? "Generating..." : "Generate Plan"}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current training plan. This action cannot be
              undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowConfirmDialog(false);
                generatePlan.mutate(form.getValues());
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}