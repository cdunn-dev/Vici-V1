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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Wand2, ChevronRight, ChevronLeft } from "lucide-react";

const planGeneratorSchema = z.object({
  // Training Goal Section
  goal: z.enum([
    "Personal Best",
    "Run Fast",
    "Run Far",
    "First Race",
    "Get Fit",
    "Be Healthy",
  ]),
  goalDescription: z.string().min(1, "Please describe your goal"),
  targetRace: z.object({
    distance: z.enum([
      "5k",
      "10k",
      "Half-Marathon",
      "Marathon",
      "50k",
      "100k",
      "Other",
    ]).optional(),
    date: z.string().optional(),
    previousBest: z.string().optional(),
    goalTime: z.string().optional(),
  }).optional(),

  // Running Experience Section
  runningExperience: z.object({
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    fitnessLevel: z.enum([
      "Very fit",
      "Solid base",
      "Out of shape",
      "Never run before",
    ]),
    personalBests: z.record(z.string()),
  }),

  // Training Preferences Section
  trainingPreferences: z.object({
    weeklyRunningDays: z.number().min(1).max(7),
    maxWeeklyMileage: z.number().min(1).max(150),
    weeklyWorkouts: z.number().min(0).max(3),
    preferredLongRunDay: z.enum([
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]),
    coachingStyle: z.enum([
      "Authoritative",
      "Directive",
      "Motivational",
      "Collaborative",
      "Hybrid",
    ]),
  }),
});

type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;

interface PlanGeneratorProps {
  existingPlan?: boolean;
}

export default function PlanGenerator({ existingPlan }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
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

  const handlePlanGeneration = (data: PlanGeneratorFormData) => {
    if (existingPlan) {
      setShowConfirmDialog(true);
    } else {
      generatePlan.mutate(data);
    }
  };

  const steps = [
    {
      title: "Training Goal",
      fields: ["goal", "goalDescription", "targetRace"],
    },
    {
      title: "Running Experience",
      fields: ["runningExperience"],
    },
    {
      title: "Training Preferences",
      fields: ["trainingPreferences"],
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Create New Training Plan
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
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
            <form
              onSubmit={form.handleSubmit(handlePlanGeneration)}
              className="space-y-6"
            >
              <div className="space-y-6">
                {currentStep === 0 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Training Goal</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your goal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Personal Best">Personal Best</SelectItem>
                              <SelectItem value="Run Fast">Run Fast</SelectItem>
                              <SelectItem value="Run Far">Run Far</SelectItem>
                              <SelectItem value="First Race">First Race</SelectItem>
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
                          <FormLabel>Goal Description</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Describe your training goal in detail"
                              {...field}
                            />
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
                          <FormLabel>Target Race Distance (Optional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="runningExperience.level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Running Experience Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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

                    <FormField
                      control={form.control}
                      name="runningExperience.fitnessLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Fitness Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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

                    {/* Personal Bests section will be implemented as a separate component */}
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
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

                    <FormField
                      control={form.control}
                      name="trainingPreferences.preferredLongRunDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Long Run Day</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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

                    <FormField
                      control={form.control}
                      name="trainingPreferences.coachingStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desired Coaching Style</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
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
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={generatePlan.isPending}
                  >
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