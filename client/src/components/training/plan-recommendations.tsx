import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
} from "lucide-react";

type Recommendation = {
  type: "pace" | "distance" | "intensity";
  recommendation: string;
  reason: string;
};

type PlanRecommendationsProps = {
  planId: number;
  recentWorkouts: Array<{
    distance: number;
    actualPace: number;
    targetPace: number;
    perceivedEffort: number;
    notes?: string;
  }>;
};

export default function PlanRecommendations({
  planId,
  recentWorkouts,
}: PlanRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const analyzePlan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/training-plans/${planId}/analyze`,
        { recentWorkouts }
      );
      return res.json();
    },
    onSuccess: (data) => {
      if (data.adjustments?.length > 0) {
        toast({
          title: "Analysis Complete",
          description: "New training recommendations available!",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to analyze training data",
        variant: "destructive",
      });
    },
  });

  const applyRecommendation = useMutation({
    mutationFn: async (adjustment: Recommendation) => {
      // Here you would implement the logic to apply the recommendation
      // to the training plan
      const res = await apiRequest(
        "PATCH",
        `/api/training-plans/${planId}`,
        { adjustment }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-plans"] });
      toast({
        title: "Success",
        description: "Training plan updated with recommendations",
      });
    },
  });

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "pace":
        return <ArrowUpRight className="h-5 w-5 text-blue-500" />;
      case "distance":
        return <ArrowDownRight className="h-5 w-5 text-green-500" />;
      case "intensity":
        return <Minus className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Training Recommendations</CardTitle>
        <CardDescription>
          Get personalized suggestions based on your recent performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button
            onClick={() => analyzePlan.mutate()}
            disabled={analyzePlan.isPending}
            className="w-full"
          >
            {analyzePlan.isPending ? "Analyzing..." : "Analyze Recent Workouts"}
          </Button>

          {analyzePlan.data?.analysis && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm">{analyzePlan.data.analysis}</p>
            </div>
          )}

          {analyzePlan.data?.adjustments?.map((adjustment: Recommendation, index: number) => (
            <Card key={index} className="bg-card">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    {getRecommendationIcon(adjustment.type)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {adjustment.recommendation}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {adjustment.reason}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => applyRecommendation.mutate(adjustment)}
                    disabled={applyRecommendation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
