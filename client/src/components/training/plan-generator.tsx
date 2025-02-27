import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Wand2, ChevronRight, ChevronLeft, CalendarIcon } from "lucide-react";
import { format, addWeeks, nextMonday } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const planGeneratorSchema = z.object({
  goal: z.enum(["First Race", "Personal Best", "Run Fast", "Run Far", "Get Fit", "Be Healthy"]),
  goalDescription: z.string().min(1, "Please describe your goal"),
  startDate: z.string().min(1, "Please select a start date"),
  targetRace: z.object({
    distance: z.enum(["5k", "10k", "Half-Marathon", "Marathon", "50k", "100k", "Other"]).optional(),
    customDistance: z.string().optional(),
    date: z.string().optional(),
    previousBest: z.string().optional(),
    goalTime: z.string().optional(),
  }).optional(),
  runningExperience: z.object({
    level: z.enum(["Beginner", "Intermediate", "Advanced"]),
    fitnessLevel: z.enum(["Very fit", "Solid base", "Out of shape", "Never run before"]),
  }),
  trainingPreferences: z.object({
    weeklyRunningDays: z.number().min(1).max(7),
    maxWeeklyMileage: z.number().min(5).max(150),
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
  onPreview?: (plan: any) => void;
}

export default function PlanGenerator({ existingPlan, onPreview }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState(1);
  const [selectedStartOption, setSelectedStartOption] = useState<'today' | 'next-week' | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      startDate: new Date().toISOString(),
      runningExperience: {
        level: "Beginner",
        fitnessLevel: "Solid base",
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

  const handleNext = () => {
    const targetRaceSelected = form.getValues("targetRace")?.distance;

    if (currentScreen === 2 && !targetRaceSelected) {
      setCurrentScreen(6);
    } else if (currentScreen === 2 && targetRaceSelected === "Other") {
      setCurrentScreen(3);
    } else if (currentScreen === 2 && targetRaceSelected) {
      setCurrentScreen(4);
    } else {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handleBack = () => {
    const targetRaceSelected = form.getValues("targetRace")?.distance;

    if (currentScreen === 6 && !targetRaceSelected) {
      setCurrentScreen(2);
    } else if (currentScreen === 4 && targetRaceSelected === "Other") {
      setCurrentScreen(3);
    } else {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const onSubmit = (data: PlanGeneratorFormData) => {
    console.log("Form submitted with data:", data); // Debug log

    if (onPreview) {
      const endDate = data.targetRace?.date
        ? new Date(data.targetRace.date)
        : addWeeks(new Date(data.startDate), 12);

      const planData = {
        ...data,
        startDate: new Date(data.startDate),
        endDate,
      };

      console.log("Calling onPreview with planData:", planData); // Debug log
      onPreview(planData);
      setOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90">
            <Wand2 className="h-5 w-5" />
            Create New Training Plan
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-full min-h-screen flex flex-col p-0">
          <div className="flex-1 flex flex-col">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>Create Training Plan</DialogTitle>
              {existingPlan && (
                <DialogDescription>
                  You already have an active training plan. Creating a new plan will
                  replace your current one.
                </DialogDescription>
              )}
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                <div className="flex-1 p-6">
                  <div className="max-w-2xl mx-auto space-y-8">
                    <div className="space-y-2">
                      <h2 className="text-2xl font-bold text-center mb-8">
                        {currentScreen === 1 && "What's your training goal?"}
                        {currentScreen === 2 && "Are you training for a specific race?"}
                        {currentScreen === 3 && "What's your custom race distance?"}
                        {currentScreen === 4 && "When is your race?"}
                        {currentScreen === 5 && "What are your time goals? (Optional)"}
                        {currentScreen === 6 && "What's your running experience?"}
                        {currentScreen === 7 && "How fit are you currently?"}
                        {currentScreen === 8 && "How many days can you run per week?"}
                        {currentScreen === 9 && "What's your target weekly mileage?"}
                        {currentScreen === 10 && "How many workouts do you want per week?"}
                        {currentScreen === 11 && "Which coaching style do you prefer?"}
                        {currentScreen === 12 && "When do you want to start your plan?"}
                      </h2>
                      <Progress value={(currentScreen / TOTAL_SCREENS) * 100} className="w-full" />
                    </div>

                    <div className="space-y-8">
                      {currentScreen === 1 && (
                        <>
                          <FormField
                            control={form.control}
                            name="goal"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Training Goal</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select your goal" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="First Race">Complete My First Race</SelectItem>
                                    <SelectItem value="Personal Best">Set a Personal Best</SelectItem>
                                    <SelectItem value="Run Fast">Run Fast</SelectItem>
                                    <SelectItem value="Run Far">Run Far</SelectItem>
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
                        </>
                      )}

                      {currentScreen === 2 && (
                        <FormField
                          control={form.control}
                          name="targetRace.distance"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Are you training for a specific race?</FormLabel>
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
                      )}

                      {currentScreen === 3 && (
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
                      )}

                      {currentScreen === 4 && (
                        <FormField
                          control={form.control}
                          name="targetRace.date"
                          render={({ field }) => (
                            <FormItem className="flex flex-col items-center">
                              <FormLabel className="text-center text-lg mb-4">When is your race?</FormLabel>
                              <div className="w-full max-w-sm mx-auto">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date?.toISOString())}
                                  disabled={(date) => date < new Date()}
                                  className="rounded-md border shadow"
                                />
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {currentScreen === 5 && (
                        <div className="space-y-8">
                          <h3 className="text-center text-lg font-medium">Optional Time Goals</h3>
                          <div className="grid grid-cols-1 gap-8">
                            <FormField
                              control={form.control}
                              name="targetRace.previousBest"
                              render={({ field }) => (
                                <FormItem className="flex flex-col items-center">
                                  <FormLabel className="text-center">Previous Best Time (Optional)</FormLabel>
                                  <FormDescription className="text-center mb-2">
                                    Enter your best time for this distance if you have one
                                  </FormDescription>
                                  <div className="w-64">
                                    <FormControl>
                                      <Input
                                        type="time"
                                        step="1"
                                        {...field}
                                        className="text-center text-2xl h-12"
                                        placeholder="HH:MM:SS"
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="targetRace.goalTime"
                              render={({ field }) => (
                                <FormItem className="flex flex-col items-center">
                                  <FormLabel className="text-center">Goal Time (Optional)</FormLabel>
                                  <FormDescription className="text-center mb-2">
                                    Enter your target time for this race if you have one in mind
                                  </FormDescription>
                                  <div className="w-64">
                                    <FormControl>
                                      <Input
                                        type="time"
                                        step="1"
                                        {...field}
                                        className="text-center text-2xl h-12"
                                        placeholder="HH:MM:SS"
                                      />
                                    </FormControl>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}

                      {currentScreen === 6 && (
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
                      )}

                      {currentScreen === 7 && (
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
                      )}

                      {currentScreen === 8 && (
                        <FormField
                          control={form.control}
                          name="trainingPreferences.weeklyRunningDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weekly Running Days</FormLabel>
                              <FormDescription>How many days per week would you like to run?</FormDescription>
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
                      )}

                      {currentScreen === 9 && (
                        <FormField
                          control={form.control}
                          name="trainingPreferences.maxWeeklyMileage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Weekly Mileage</FormLabel>
                              <FormDescription>
                                What's the highest weekly mileage you'd like to reach during training?
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
                      )}

                      {currentScreen === 10 && (
                        <FormField
                          control={form.control}
                          name="trainingPreferences.weeklyWorkouts"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weekly Workouts/Sessions</FormLabel>
                              <FormDescription>
                                How many workout sessions would you like per week? A workout session is a harder
                                effort like a fartlek or threshold run where you will be running at a higher
                                pace/heart rate.
                              </FormDescription>
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
                      )}

                      {currentScreen === 11 && (
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
                      )}

                      {currentScreen === 12 && (
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col items-center">
                              <FormLabel className="text-center text-lg mb-4">When would you like to start?</FormLabel>
                              <div className="flex gap-4 mb-6">
                                <Button
                                  type="button"
                                  variant={selectedStartOption === 'today' ? "default" : "outline"}
                                  onClick={() => {
                                    const today = new Date();
                                    field.onChange(today.toISOString());
                                    setSelectedStartOption('today');
                                  }}
                                  className={selectedStartOption === 'today' ? "bg-primary text-primary-foreground" : ""}
                                >
                                  Start Today
                                </Button>
                                <Button
                                  type="button"
                                  variant={selectedStartOption === 'next-week' ? "default" : "outline"}
                                  className={`gap-2 ${selectedStartOption === 'next-week' ? "bg-primary text-primary-foreground" : ""}`}
                                  onClick={() => {
                                    const nextMondayDate = nextMonday(new Date());
                                    field.onChange(nextMondayDate.toISOString());
                                    setSelectedStartOption('next-week');
                                  }}
                                >
                                  Start Next Week
                                  <CalendarIcon className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="w-full max-w-sm mx-auto">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => {
                                    if (date) {
                                      field.onChange(date.toISOString());
                                      setSelectedStartOption(null);
                                    }
                                  }}
                                  disabled={(date) => date < new Date()}
                                  className="rounded-md border shadow"
                                />
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t p-6">
                  <div className="max-w-2xl mx-auto flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentScreen === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>

                    {currentScreen < TOTAL_SCREENS ? (
                      <Button type="button" onClick={handleNext}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button type="submit" onClick={() => console.log("Submit button clicked")}>
                        Preview Plan
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </>
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

const TOTAL_SCREENS = 12;