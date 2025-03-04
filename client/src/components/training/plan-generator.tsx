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
import { Wand2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { format, addWeeks, nextMonday } from "date-fns";

interface PlanGeneratorProps {
  existingPlan?: boolean;
  onPreview?: (plan: PlanGeneratorFormData & { endDate: Date }) => void;
}

export default function PlanGenerator({ existingPlan, onPreview }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

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

  const onSubmit = (data: PlanGeneratorFormData) => {
    console.log("Form submitted with data:", data);
    if (onPreview) {
      const endDate = data.targetRace?.date
        ? new Date(data.targetRace.date)
        : addWeeks(new Date(data.startDate), 12);

      const planData = {
        ...data,
        endDate,
      };

      onPreview(planData);
      setOpen(false);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Training Plan</DialogTitle>
          {existingPlan && (
            <p className="text-sm text-muted-foreground">
              You already have an active training plan. Creating a new plan will
              replace your current one.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    className="rounded-md border"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full">Preview Plan</Button>
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