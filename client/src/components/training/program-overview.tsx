import React from "react";
import { format, parseISO } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ThumbsUp } from "lucide-react";

interface ProgramOverviewProps {
  plan: {
    name: string;
    goal: string;
    goalDescription?: string;
    startDate: string;
    endDate: string;
    weeklyMileage: number;
    weeklyPlans: Array<{
      week: number;
      phase: string;
      totalMileage: number;
      workouts: Array<{
        day: string;
        type: string;
        distance: number;
        description: string;
        completed: boolean;
      }>;
    }>;
    targetRace?: {
      distance: string;
      date: string;
      customDistance?: string;
      previousBest?: string;
      goalTime?: string;
    } | null;
    runningExperience: {
      level: string;
      fitnessLevel: string;
    };
    trainingPreferences: {
      weeklyRunningDays: number;
      maxWeeklyMileage: number;
      weeklyWorkouts: number;
      preferredLongRunDay: string;
      coachingStyle: string;
    };
    is_active: boolean;
  };
  onApprove?: () => void;
  isSubmitting?: boolean;
}

export default function ProgramOverview({
  plan,
  onApprove,
  isSubmitting = false,
}: ProgramOverviewProps) {
  // Calculate metrics
  const totalWeeks = plan.weeklyPlans.length;
  const totalMileage = plan.weeklyPlans.reduce((sum, week) => sum + week.totalMileage, 0);
  const weeklyAverage = Math.round(totalMileage / totalWeeks);

  // Helper function to safely format dates
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-md border-primary/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overview Section */}
            <div>
              <h2 className="text-2xl font-bold mb-2">Training Plan Overview</h2>
              <p className="text-muted-foreground">
                {plan.goal}
                {plan.targetRace && (
                  <span className="block mt-1">
                    {plan.targetRace.distance} - {format(parseISO(plan.targetRace.date), "MMMM d, yyyy")}
                  </span>
                )}
              </p>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Weeks</p>
                <p className="text-2xl font-bold text-primary">{totalWeeks}</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Mileage</p>
                <p className="text-2xl font-bold text-primary">{totalMileage}</p>
                <p className="text-xs text-muted-foreground">miles</p>
              </div>
              <div className="bg-primary/5 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Weekly Average</p>
                <p className="text-2xl font-bold text-primary">{weeklyAverage}</p>
                <p className="text-xs text-muted-foreground">miles</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="w-full space-y-2">
        {plan.weeklyPlans.map((week) => (
          <AccordionItem
            key={week.week}
            value={`week-${week.week}`}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/50">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Week {week.week}</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary">
                      {week.phase}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(week.workouts[0].day)} - {formatDate(week.workouts[week.workouts.length - 1].day)}
                  </div>
                </div>
                <div className="text-sm font-medium">{week.totalMileage} miles</div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 py-2 space-y-2">
                {week.workouts.map((workout, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8">
                        {workout.completed ? (
                          <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-muted" />
                        )}
                      </div>
                      <div>
                        <Badge
                          variant="outline"
                          className={`${
                            workout.type.toLowerCase().includes("easy")
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : workout.type.toLowerCase().includes("long")
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                          }`}
                        >
                          {workout.type}
                        </Badge>
                        <div className="font-medium">
                          {format(parseISO(workout.day), "EEEE, MMM d")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {workout.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap">
                      {workout.distance} miles
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Approve button section */}
      {onApprove && (
        <div className="py-4">
          <Button
            className="w-full"
            onClick={onApprove}
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Plan...
              </>
            ) : (
              <>
                <ThumbsUp className="mr-2 h-4 w-4" />
                Approve Plan
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}