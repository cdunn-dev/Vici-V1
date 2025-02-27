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
import { useToast } from "@/hooks/use-toast";
import { Wand2 } from "lucide-react";

const planGeneratorSchema = z.object({
  goal: z.string().min(1, "Please specify your goal"),
  currentLevel: z.enum(["Beginner", "Intermediate", "Advanced"]),
  weeklyMileage: z.number().min(1, "Please specify weekly mileage"),
  daysPerWeek: z.number().min(1).max(7),
  targetRace: z.object({
    distance: z.string().optional(),
    date: z.string().optional(),
  }).optional(),
});

type PlanGeneratorFormData = z.infer<typeof planGeneratorSchema>;

interface PlanGeneratorProps {
  existingPlan?: boolean;
}

export default function PlanGenerator({ existingPlan }: PlanGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  const form = useForm<PlanGeneratorFormData>({
    resolver: zodResolver(planGeneratorSchema),
    defaultValues: {
      currentLevel: "Beginner",
      weeklyMileage: 20,
      daysPerWeek: 4,
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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2">
            <Wand2 className="h-5 w-5" />
            Create a New Training Plan
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Training Plan</DialogTitle>
            {existingPlan && (
              <DialogDescription>
                You already have an active training plan. Creating a new plan will replace your current one.
              </DialogDescription>
            )}
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handlePlanGeneration)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Goal</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Complete first marathon" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Level</FormLabel>
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
                name="weeklyMileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Weekly Mileage</FormLabel>
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
                name="daysPerWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Days per Week</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={7}
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
                name="targetRace.distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Race Distance (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Marathon, 5K" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetRace.date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Race Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={generatePlan.isPending}
              >
                {generatePlan.isPending ? "Generating..." : "Generate Plan"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Existing Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current training plan. This action cannot be undone.
              Are you sure you want to continue?
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