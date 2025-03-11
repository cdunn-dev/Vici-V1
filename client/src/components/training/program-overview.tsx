import React from "react";
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
import {
  type TrainingPlan,
  type WeeklyPlan,
  type Workout,
  calculatePlanMetrics,
  getWorkoutBadgeStyle,
  formatDateForDisplay
} from "@/lib/training-plan-utils";

interface ProgramOverviewProps {
  plan: TrainingPlan;
  onApprove?: () => void;
  isSubmitting?: boolean;
}

export default function ProgramOverview({
  plan,
  onApprove,
  isSubmitting = false,
}: ProgramOverviewProps) {
  const { totalWeeks, totalMileage, weeklyAverage } = calculatePlanMetrics(plan.weeklyPlans);

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
                    {plan.targetRace.distance} - {formatDateForDisplay(plan.targetRace.date, "MMMM d, yyyy")}
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
                    {formatDateForDisplay(week.workouts[0].day)} - {formatDateForDisplay(week.workouts[week.workouts.length - 1].day)}
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
                          className={getWorkoutBadgeStyle(workout.type)}
                        >
                          {workout.type}
                        </Badge>
                        <div className="font-medium">
                          {formatDateForDisplay(workout.day, "EEEE, MMM d")}
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