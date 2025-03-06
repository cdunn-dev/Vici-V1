import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, MessageSquare, ThumbsUp, Loader2, MapPin, Calendar, Check } from "lucide-react";
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
}

export default function ProgramOverview({
  plan,
  showActions = true,
  onApprove,
  onAskQuestion,
  onRequestChanges,
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

  const calculateWeeklyCompletion = (workouts: typeof plan.weeklyPlans[0]['workouts']) => {
    const completed = workouts.filter(w => w.completed).length;
    return (completed / workouts.length) * 100;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Overview Section */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{plan.goal}</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(plan.startDate), "MMM d, yyyy")} - {format(new Date(plan.endDate), "MMM d, yyyy")}
              </p>
            </div>
            {plan.targetRace && (
              <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{plan.targetRace.distance}</span>
                {plan.targetRace.customDistance && (
                  <span className="text-sm">
                    ({plan.targetRace.customDistance.value} {plan.targetRace.customDistance.unit})
                  </span>
                )}
              </Badge>
            )}
          </div>
        </div>
        <Separator />
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
        {plan.targetRace && (
          <>
            <Separator />
            <div className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold mb-4">Race Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Race Date</p>
                  <p className="text-lg sm:text-xl">{format(new Date(plan.targetRace.date), "PPP")}</p>
                </div>
                {plan.targetRace.previousBest && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Previous Best</p>
                    <p className="text-lg sm:text-xl">{plan.targetRace.previousBest}</p>
                  </div>
                )}
                {plan.targetRace.goalTime && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Goal Time</p>
                    <p className="text-lg sm:text-xl">{plan.targetRace.goalTime}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Weekly Plans Accordion */}
      <Accordion type="single" collapsible className="w-full space-y-2">
        {plan.weeklyPlans.map((week) => (
          <AccordionItem 
            key={week.week} 
            value={`week-${week.week}`}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-3 sm:px-4 py-2 hover:no-underline hover:bg-muted/50">
              <div className="flex flex-1 items-center justify-between w-full">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Week {week.week}</span>
                    <span className="text-sm text-muted-foreground">
                      {week.totalMileage} miles planned
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-20 sm:w-32">
                    <Progress value={calculateWeeklyCompletion(week.workouts)} className="h-2" />
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-3 sm:px-4 py-2 space-y-2">
                {week.workouts.map((workout, workoutIndex) => (
                  <div
                    key={workoutIndex}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-background rounded-lg border gap-3"
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

      {/* Action Buttons */}
      {showActions && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}