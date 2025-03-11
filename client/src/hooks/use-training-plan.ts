import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface UseTrainingPlanOptions {
  onPlanCreated?: () => void;
}

export function useTrainingPlan(options: UseTrainingPlanOptions = {}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [previewPlan, setPreviewPlan] = useState<TrainingPlanWithWeeklyPlans | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const { data: trainingPlan, isLoading } = useQuery<TrainingPlanWithWeeklyPlans | null>({
    queryKey: ["/api/training-plans", { userId: user?.id }],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/training-plans?userId=${user?.id}&active=true`);
        if (!response.ok) {
          throw new Error(`Failed to fetch training plan: ${response.statusText}`);
        }
        const plans = await response.json();
        return plans.find((p: TrainingPlanWithWeeklyPlans) => p.isActive) ||
          (plans.length > 0 ? plans[plans.length - 1] : null);
      } catch (error) {
        console.error("Training plan fetch error:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
  });

  const createPlanMutation = useMutation({
    mutationFn: async (plan: TrainingPlanWithWeeklyPlans) => {
      if (!user?.id) {
        throw new Error("Must be logged in to create a plan");
      }

      const response = await fetch(`/api/training-plans/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...plan,
          userId: user.id,
        }),
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
