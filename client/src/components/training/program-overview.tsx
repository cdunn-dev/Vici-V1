import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, MessageSquare, ThumbsUp, Loader2, MapPin, Calendar, Check } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import type { TrainingPlanWithWeeklyPlans } from "@shared/schema";

interface ProgramOverviewProps {
  plan: TrainingPlanWithWeeklyPlans;
  showActions?: boolean;
  onApprove?: () => void;
  onAskQuestion?: (question: string) => void;
  onRequestChanges?: (changes: string) => void;
  onSelectWeek?: (weekNumber: number) => void;
  onSelectDay?: (date: Date | null) => void;
  selectedDate?: Date;
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
}: ProgramOverviewProps) {
  const [question, setQuestion] = useState("");
  const [changes, setChanges] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showChangesForm, setShowChangesForm] = useState(false);

  const handleAskQuestion = async () => {
    if (!question.trim() || !onAskQuestion) return;
    setIsSubmitting(true);
    try {
      await onAskQuestion(question);
      setQuestion("");
      setShowQuestionForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!changes.trim() || !onRequestChanges) return;
    setIsSubmitting(true);
    try {
      await onRequestChanges(changes);
      setChanges("");
      setShowChangesForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getWorkoutTypeColor = (type: string) => {
    switch (type) {
      case "Easy Run":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "Long Run":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "Speed Work":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "Tempo Run":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase.toLowerCase()) {
      case "base building":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "peak training":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "tapering":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const calculateWeeklyCompletion = (workouts: typeof plan.weeklyPlans[0]['workouts']) => {
    const completed = workouts.filter(w => w.completed).length;
    return (completed / workouts.length) * 100;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4"> {/* Added overflow-y-auto here */}
        <div className="space-y-4 py-4">
          <Card className="shadow-md border-primary/20">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Experience Level</p>
                  <p className="text-xl sm:text-2xl font-bold">{plan.runningExperience.level}</p>
                  <p className="text-sm text-muted-foreground">{plan.runningExperience.fitnessLevel}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Weekly Schedule</p>
                  <p className="text-xl sm:text-2xl font-bold">{plan.trainingPreferences.weeklyRunningDays} days</p>
                  <p className="text-sm text-muted-foreground">{plan.trainingPreferences.weeklyWorkouts} quality sessions</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Peak Mileage</p>
                  <p className="text-xl sm:text-2xl font-bold">{plan.trainingPreferences.maxWeeklyMileage}</p>
                  <p className="text-sm text-muted-foreground">miles per week</p>
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
                <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/50" onClick={() => onSelectWeek?.(week.week)}>
                  <div className="flex flex-1 items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Week {week.week}</span>
                          <Badge variant="outline" className={`${getPhaseColor(week.phase)} text-xs`}>
                            {week.phase}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {week.totalMileage} miles planned
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <Progress value={calculateWeeklyCompletion(week.workouts)} className="h-2" />
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="px-4 py-2 space-y-2">
                    {week.workouts.map((workout, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background rounded-lg border gap-3 cursor-pointer"
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
                            <Badge variant="outline" className={`mb-1 ${getWorkoutTypeColor(workout.type)}`}>
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
        </div>
      </div>

      {showActions && (
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
          {showQuestionForm ? (
            <div className="space-y-4">
              <Textarea
                placeholder="Ask your AI coach a question about your training plan..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowQuestionForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleAskQuestion}
                  disabled={isSubmitting || !question.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Asking...
                    </>
                  ) : (
                    "Ask Question"
                  )}
                </Button>
              </div>
            </div>
          ) : showChangesForm ? (
            <div className="space-y-4">
              <Textarea
                placeholder="Describe what changes you'd like to make to your training plan..."
                value={changes}
                onChange={(e) => setChanges(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setShowChangesForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleRequestChanges}
                  disabled={isSubmitting || !changes.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Request Changes"
                  )}
                </Button>
              </div>
            </div>
          ) : (
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
              {onApprove && (
                <Button className="w-full sm:w-40" onClick={onApprove}>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Approve Plan
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}