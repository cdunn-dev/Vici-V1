import React, { useState } from "react";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";
import { Calendar, Check, ChevronDown, MessageSquare, ThumbsUp, Loader2 } from "lucide-react";

interface ProgramOverviewProps {
  plan: TrainingPlanWithWeeklyPlans;
  showActions?: boolean;
  onApprove?: () => void;
  onAskQuestion?: (question: string) => void;
  onRequestChanges?: (changes: string) => void;
  onSelectWeek?: (weekNumber: number) => void;
  onSelectDay?: (date: Date | null) => void;
  selectedDate?: Date;
  isSubmitting?: boolean;
}

export default function ProgramOverview({
  plan,
  showActions = true,
  onApprove,
  onAskQuestion,
  onRequestChanges,
  onSelectWeek,
  onSelectDay,
  selectedDate,
  isSubmitting = false,
}: ProgramOverviewProps) {
  const [question, setQuestion] = useState("");
  const [changes, setChanges] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showChangesForm, setShowChangesForm] = useState(false);

  // Calculate metrics
  const totalWeeks = plan.weeklyPlans.length;
  const totalMileage = plan.weeklyPlans.reduce((sum, week) => sum + week.totalMileage, 0);
  const completedWeeks = plan.weeklyPlans.filter(week =>
    week.workouts.every(workout => workout.completed)
  ).length;
  const completedWorkouts = plan.weeklyPlans.reduce((sum, week) =>
    sum + week.workouts.filter(w => w.completed).length, 0
  );
  const totalWorkouts = plan.weeklyPlans.reduce((sum, week) =>
    sum + week.workouts.length, 0
  );
  const completionPercentage = (completedWeeks / totalWeeks) * 100;
  const followThroughPercentage = (completedWorkouts / totalWorkouts) * 100;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-bold">
                {plan.goal}
                {plan.targetRace && (
                  <span className="block text-lg font-normal text-muted-foreground mt-1">
                    {plan.targetRace.distance} - {format(new Date(plan.targetRace.date), "MMMM d, yyyy")}
                  </span>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-2xl font-bold">Week {completedWeeks}/{totalWeeks}</p>
                <Progress value={completionPercentage} className="h-2 mt-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Follow Through</p>
                <p className="text-2xl font-bold">{Math.round(followThroughPercentage)}%</p>
                <Progress value={followThroughPercentage} className="h-2 mt-2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Weeks</p>
              <p className="text-xl font-semibold">{totalWeeks}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Mileage</p>
              <p className="text-xl font-semibold">{totalMileage} miles</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Weekly Average</p>
              <p className="text-xl font-semibold">{Math.round(totalMileage / totalWeeks)} miles</p>
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
            <AccordionTrigger
              className="px-4 py-2 hover:no-underline hover:bg-muted/50"
              onClick={() => onSelectWeek?.(week.week)}
            >
              <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Week {week.week}</span>
                      <Badge variant="outline" className="bg-primary/10 text-primary">
                        {week.phase}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{format(new Date(week.workouts[0].day), "MMM d")} - </span>
                      <span>{format(new Date(week.workouts[week.workouts.length - 1].day), "MMM d")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">{week.totalMileage} miles</span>
                  <div className="w-32">
                    <Progress
                      value={week.workouts.filter(w => w.completed).length / week.workouts.length * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 py-2 space-y-2">
                {week.workouts.map((workout, index) => (
                  <div
                    key={index}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background rounded-lg border gap-3 cursor-pointer transition-colors ${
                      selectedDate && new Date(workout.day).toDateString() === selectedDate.toDateString()
                        ? 'border-primary'
                        : 'hover:bg-accent/5'
                    }`}
                    onClick={() => onSelectDay?.(new Date(workout.day))}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="flex items-center justify-center h-8 w-8 flex-shrink-0">
                        {workout.completed ? (
                          <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Badge
                          variant="outline"
                          className={`mb-1 ${
                            workout.type.toLowerCase().includes('easy')
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : workout.type.toLowerCase().includes('long')
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                              : workout.type.toLowerCase().includes('tempo')
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}
                        >
                          {workout.type}
                        </Badge>
                        <div>
                          <div className="font-medium">
                            {format(new Date(workout.day), "EEEE, MMM d")}
                          </div>
                          <div className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">
                            {workout.description}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium pl-11 sm:pl-0">
                      {workout.distance} miles
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Show approve button only in preview mode */}
      {onApprove && (
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
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

      {/* Show AI interaction section only when not in preview mode */}
      {showActions && !onApprove && (
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-40"
              onClick={() => setShowQuestionForm(true)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Ask a Question
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-40"
              onClick={() => setShowChangesForm(true)}
            >
              <ChevronDown className="mr-2 h-4 w-4" />
              Request Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}