import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface UseTrainingPlanOptions {
  onPlanCreated?: () => void;
}

interface UseTrainingPlanReturn {
  trainingPlan: TrainingPlanWithWeeklyPlans | null;
  isLoading: boolean;
  previewPlan: TrainingPlanWithWeeklyPlans | null;
  showPreview: boolean;
  setPreviewPlan: (plan: TrainingPlanWithWeeklyPlans | null) => void;
  setShowPreview: (show: boolean) => void;
  createPlan: (plan: TrainingPlanWithWeeklyPlans) => void;
  isCreating: boolean;
  adjustPlan: (params: { feedback: string; plan: TrainingPlanWithWeeklyPlans }) => void;
  isAdjusting: boolean;
  reorderWorkouts: (params: { planId: number; weekId: number; workouts: any[] }) => void;
  isReordering: boolean;
}

export function useTrainingPlan(options: UseTrainingPlanOptions = {}): UseTrainingPlanReturn {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [previewPlan, setPreviewPlan] = useState<TrainingPlanWithWeeklyPlans | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Query for fetching the current training plan
  const { data: trainingPlan, isLoading } = useQuery<TrainingPlanWithWeeklyPlans | null>({
    queryKey: ["/api/training-plans", { userId: user?.id }],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/training-plans?userId=${user?.id}&active=true`);
        if (!response.ok) {
          throw new Error(`Failed to fetch training plan: ${response.statusText}`);
        }
        const plans = await response.json();
        return plans.find((p: TrainingPlanWithWeeklyPlans) => p.is_active) ||
          (plans.length > 0 ? plans[plans.length - 1] : null);
      } catch (error) {
        console.error("Training plan fetch error:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
  });

  // Mutation for creating a new training plan
  const createPlanMutation = useMutation({
    mutationFn: async (planData: TrainingPlanWithWeeklyPlans) => {
      if (!user?.id) {
        throw new Error("Must be logged in to create a plan");
      }

      // Create a clean copy of the plan data without any potential circular references
      const cleanPlan = {
        userId: user.id,
        name: planData.name,
        goal: planData.goal,
        goalDescription: planData.goalDescription || "",
        startDate: new Date(planData.startDate).toISOString(),
        endDate: new Date(planData.endDate).toISOString(),
        weeklyMileage: planData.weeklyMileage,
        weeklyPlans: planData.weeklyPlans.map(week => ({
          week: week.week,
          phase: week.phase,
          totalMileage: week.totalMileage,
          workouts: week.workouts.map(workout => ({
            day: new Date(workout.day).toISOString(),
            type: workout.type,
            distance: workout.distance,
            description: workout.description,
            completed: false
          }))
        })),
        targetRace: planData.targetRace ? {
          distance: planData.targetRace.distance,
          date: new Date(planData.targetRace.date).toISOString(),
          customDistance: planData.targetRace.customDistance,
          previousBest: planData.targetRace.previousBest,
          goalTime: planData.targetRace.goalTime
        } : null,
        runningExperience: {
          level: planData.runningExperience.level,
          fitnessLevel: planData.runningExperience.fitnessLevel
        },
        trainingPreferences: {
          weeklyRunningDays: planData.trainingPreferences.weeklyRunningDays,
          maxWeeklyMileage: planData.trainingPreferences.maxWeeklyMileage,
          weeklyWorkouts: planData.trainingPreferences.weeklyWorkouts,
          preferredLongRunDay: planData.trainingPreferences.preferredLongRunDay,
          coachingStyle: planData.trainingPreferences.coachingStyle
        },
        is_active: true
      };

      console.log('Sending plan data:', JSON.stringify(cleanPlan, null, 2));

      const response = await fetch(`/api/training-plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanPlan),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate plan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
      setShowPreview(false);
      setPreviewPlan(null);
      options.onPlanCreated?.();
      toast({
        title: "Success",
        description: "Training plan has been created",
      });
    },
    onError: (error: Error) => {
      console.error('Plan creation error:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for adjusting an existing plan
  const adjustPlanMutation = useMutation({
    mutationFn: async ({ feedback, plan }: { feedback: string; plan: TrainingPlanWithWeeklyPlans }) => {
      const response = await fetch(`/api/training-plans/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback,
          currentPlan: plan,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || data.error || 'Failed to adjust plan');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPreviewPlan(data);
      toast({
        title: "Plan Adjusted",
        description: "Your training plan has been updated based on your feedback.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for reordering workouts
  const reorderWorkoutsMutation = useMutation({
    mutationFn: async ({ 
      planId, 
      weekId, 
      workouts 
    }: { 
      planId: number; 
      weekId: number; 
      workouts: any[];
    }) => {
      const response = await fetch(
        `/api/training-plans/${planId}/weeks/${weekId}/reorder`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ workouts }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reorder workouts');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
      toast({
        title: "Success",
        description: "Workout schedule updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    trainingPlan,
    isLoading,
    previewPlan,
    showPreview,
    setPreviewPlan,
    setShowPreview,
    createPlan: createPlanMutation.mutate,
    isCreating: createPlanMutation.isPending,
    adjustPlan: adjustPlanMutation.mutate,
    isAdjusting: adjustPlanMutation.isPending,
    reorderWorkouts: reorderWorkoutsMutation.mutate,
    isReordering: reorderWorkoutsMutation.isPending,
  };
}