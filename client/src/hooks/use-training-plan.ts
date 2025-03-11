import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

/**
 * Options for configuring the useTrainingPlan hook
 */
interface UseTrainingPlanOptions {
  /** Callback function to be executed after a plan is successfully created */
  onPlanCreated?: () => void;
}

/**
 * Return type for the useTrainingPlan hook
 */
interface UseTrainingPlanReturn {
  /** The current active training plan */
  trainingPlan: TrainingPlanWithWeeklyPlans | null;
  /** Loading state for the training plan query */
  isLoading: boolean;
  /** Preview data for a new training plan */
  previewPlan: TrainingPlanWithWeeklyPlans | null;
  /** Whether the preview modal is shown */
  showPreview: boolean;
  /** Function to set the preview plan data */
  setPreviewPlan: (plan: TrainingPlanWithWeeklyPlans | null) => void;
  /** Function to toggle the preview modal */
  setShowPreview: (show: boolean) => void;
  /** Function to create a new training plan */
  createPlan: (plan: TrainingPlanWithWeeklyPlans) => void;
  /** Loading state for plan creation */
  isCreating: boolean;
  /** Function to adjust an existing plan */
  adjustPlan: (params: { feedback: string; plan: TrainingPlanWithWeeklyPlans }) => void;
  /** Loading state for plan adjustment */
  isAdjusting: boolean;
  /** Function to reorder workouts in a week */
  reorderWorkouts: (params: { planId: number; weekId: number; workouts: any[] }) => void;
  /** Loading state for workout reordering */
  isReordering: boolean;
}

/**
 * Custom hook for managing training plan state and operations
 * 
 * This hook provides functionality for:
 * - Fetching the current training plan
 * - Creating new training plans
 * - Adjusting existing plans
 * - Managing plan previews
 * - Reordering workouts within a plan
 * 
 * @param options - Configuration options for the hook
 * @returns Object containing training plan state and operations
 * 
 * @example
 * ```typescript
 * const {
 *   trainingPlan,
 *   isLoading,
 *   createPlan,
 *   adjustPlan
 * } = useTrainingPlan({
 *   onPlanCreated: () => console.log('Plan created successfully')
 * });
 * ```
 */
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
        return plans.find((p: TrainingPlanWithWeeklyPlans) => p.active) ||
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