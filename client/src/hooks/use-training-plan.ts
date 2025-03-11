import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  APIError,
  ErrorMessages,
  handleAPIResponse,
  showErrorToast,
  validateRequired 
} from "@/lib/error-utils";
import {
  type TrainingPlan,
  type Workout,
  preparePlanData,
  validatePlanData
} from "@/lib/training-plan-utils";

interface UseTrainingPlanOptions {
  onPlanCreated?: () => void;
}

interface UseTrainingPlanReturn {
  trainingPlan: TrainingPlan | null;
  isLoading: boolean;
  previewPlan: TrainingPlan | null;
  showPreview: boolean;
  setPreviewPlan: (plan: TrainingPlan | null) => void;
  setShowPreview: (show: boolean) => void;
  createPlan: (plan: TrainingPlan) => void;
  isCreating: boolean;
  adjustPlan: (params: { feedback: string; plan: TrainingPlan }) => void;
  isAdjusting: boolean;
  reorderWorkouts: (params: { planId: number; weekId: number; workouts: Workout[] }) => void;
  isReordering: boolean;
}

export function useTrainingPlan(options: UseTrainingPlanOptions = {}): UseTrainingPlanReturn {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewPlan, setPreviewPlan] = useState<TrainingPlan | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Query for fetching the current training plan
  const { data: trainingPlan, isLoading } = useQuery<TrainingPlan | null>({
    queryKey: ["/api/training-plans", { userId: user?.id }],
    queryFn: async () => {
      try {
        if (!user?.id) {
          throw new Error(ErrorMessages.UNAUTHORIZED);
        }

        const response = await fetch(`/api/training-plans?userId=${user.id}&active=true`);
        const data = await handleAPIResponse(response);

        return data.find((p: TrainingPlan) => p.is_active) ||
          (data.length > 0 ? data[data.length - 1] : null);
      } catch (error) {
        console.error("Failed to fetch training plan:", error);
        showErrorToast(error);
        throw error;
      }
    },
    enabled: !!user?.id,
  });

  // Mutation for creating a new training plan
  const createPlanMutation = useMutation({
    mutationFn: async (planData: TrainingPlan) => {
      try {
        if (!user?.id) {
          throw new Error(ErrorMessages.UNAUTHORIZED);
        }

        console.log('Creating plan with data:', {
          goal: planData.goal,
          goalLength: planData?.goal?.length,
          startDate: planData.startDate,
          endDate: planData.endDate,
          weeklyPlansCount: planData.weeklyPlans?.length
        });

        // Validate plan data before sending to API
        validatePlanData(planData);

        const cleanPlan = preparePlanData(planData, user.id);
        console.log('Prepared plan data:', JSON.stringify(cleanPlan, null, 2));

        const response = await fetch(`/api/training-plans/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanPlan),
          credentials: 'include',
        });

        return handleAPIResponse(response);
      } catch (error) {
        console.error("Failed to create training plan:", error);
        throw error;
      }
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
    onError: (error: unknown) => {
      showErrorToast(error);
    },
  });

  // Mutation for adjusting an existing plan
  const adjustPlanMutation = useMutation({
    mutationFn: async ({ feedback, plan }: { feedback: string; plan: TrainingPlan }) => {
      try {
        const response = await fetch(`/api/training-plans/adjust`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback, currentPlan: plan }),
        });

        return handleAPIResponse(response);
      } catch (error) {
        console.error("Failed to adjust training plan:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setPreviewPlan(data);
      toast({
        title: "Plan Adjusted",
        description: "Your training plan has been updated based on your feedback.",
      });
    },
    onError: (error: unknown) => {
      showErrorToast(error);
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
      workouts: Workout[];
    }) => {
      try {
        const response = await fetch(
          `/api/training-plans/${planId}/weeks/${weekId}/reorder`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workouts }),
          }
        );

        return handleAPIResponse(response);
      } catch (error) {
        console.error("Failed to reorder workouts:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
      toast({
        title: "Success",
        description: "Workout schedule updated successfully",
      });
    },
    onError: (error: unknown) => {
      showErrorToast(error);
    },
  });

  return {
    trainingPlan: trainingPlan ?? null,
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