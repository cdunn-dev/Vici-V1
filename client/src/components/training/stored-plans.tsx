
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, MapPin, User } from "lucide-react";
import { formatDistance } from "@/lib/utils";

interface StoredPlansProps {
  onLoadPlan: (planId: number) => void;
}

export function StoredPlans({ onLoadPlan }: StoredPlansProps) {
  const { data: trainingPlans, isLoading, error } = useQuery({
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
      <div className="text-center py-8">
        <p className="text-muted-foreground">No saved training plans found.</p>
        <p className="text-sm mt-2">Create a new plan to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Your Saved Training Plans</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {trainingPlans.map((plan) => (
          <Card key={plan.id} className="overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.goalDescription}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(plan.startDate).toLocaleDateString()} to{" "}
                  {new Date(plan.endDate).toLocaleDateString()}
                </span>
              </div>
              
              {plan.targetRace && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Target: {plan.targetRace.distance}{" "}
                    {plan.targetRace.date && `on ${new Date(plan.targetRace.date).toLocaleDateString()}`}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {plan.runningExperience.level} runner, {plan.runningExperience.fitnessLevel}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {plan.trainingPreferences.weeklyRunningDays} days/week, {plan.weeklyMileage} miles max
                </span>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 flex justify-end">
              <Button 
                variant="secondary" 
                onClick={() => onLoadPlan(plan.id)}
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
