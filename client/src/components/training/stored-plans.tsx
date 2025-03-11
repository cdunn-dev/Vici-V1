import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin, User, Trophy, History } from "lucide-react";
import { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { format } from "date-fns";

interface StoredPlansProps {
  onLoadPlan: (planId: number) => void;
}

export function StoredPlans({ onLoadPlan }: StoredPlansProps) {
  const { data: trainingPlans, isLoading, error } = useQuery<TrainingPlanWithWeeklyPlans[]>({
    queryKey: ["trainingPlans"],
    queryFn: async () => {
      const response = await fetch("/api/training-plans?userId=1");
      if (!response.ok) {
        throw new Error("Failed to fetch training plans");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading saved training plans...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500 py-8">Error loading training plans</div>;
  }

  if (!trainingPlans || trainingPlans.length === 0) {
    return (
      <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed border-muted-foreground/30">
        <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground text-lg">No past training plans found.</p>
        <p className="text-sm mt-2 mb-4">Create a new plan to get started!</p>
        <Button variant="outline" onClick={() => window.location.href = "/training"}>
          Create New Plan
        </Button>
      </div>
    );
  }

  const formatDistance = (distance: string): string => {
    return distance.toLowerCase().replace(/_/g, ' ');
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-center mb-6">Your Past Training Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {trainingPlans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-primary" />
                {plan.goal}
              </CardTitle>
              <CardDescription className="text-sm line-clamp-2">{plan.goalDescription}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {format(new Date(plan.startDate), 'MMM d, yyyy')} to{" "}
                  {format(new Date(plan.endDate), 'MMM d, yyyy')}
                </span>
              </div>

              {plan.targetRace && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Target: {formatDistance(plan.targetRace.distance)}{" "}
                    {plan.targetRace.date && `on ${format(new Date(plan.targetRace.date), 'MMM d, yyyy')}`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Experience Level: {plan.runningExperience?.level || "Not specified"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {plan.trainingPreferences.weeklyRunningDays} days/week,{" "}
                  {plan.trainingPreferences.maxWeeklyMileage} miles max
                </span>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/20 pt-4 pb-4 flex justify-end">
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onLoadPlan(plan.id)}
                className="transition-all hover:translate-y-[-2px]"
              >
                Load Plan
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}