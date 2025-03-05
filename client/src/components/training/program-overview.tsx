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
    <div className="space-y-6">
      {/* Overview Section */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">{plan.goal}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(plan.startDate), "MMM d, yyyy")} - {format(new Date(plan.endDate), "MMM d, yyyy")}
            </p>
          </div>
          {plan.targetRace && (
            <Badge variant="secondary" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {plan.targetRace.distance}
            </Badge>
          )}
        </div>
        <Separator />
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium">Experience Level</p>
            <p className="text-2xl font-bold">{plan.runningExperience.level}</p>
            <p className="text-sm text-muted-foreground">{plan.runningExperience.fitnessLevel}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Weekly Schedule</p>
            <p className="text-2xl font-bold">{plan.trainingPreferences.weeklyRunningDays} days</p>
            <p className="text-sm text-muted-foreground">{plan.trainingPreferences.weeklyWorkouts} quality sessions</p>
          </div>
          <div>
            <p className="text-sm font-medium">Peak Mileage</p>
            <p className="text-2xl font-bold">{plan.trainingPreferences.maxWeeklyMileage}</p>
            <p className="text-sm text-muted-foreground">miles per week</p>
          </div>
        </div>
      </div>

      {/* Weekly Plans Accordion */}
      <Accordion type="single" collapsible className="w-full space-y-2">
        {plan.weeklyPlans.map((week) => (
          <AccordionItem 
            key={week.week} 
            value={`week-${week.week}`}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/50">
              <div className="flex flex-1 items-center justify-between">
                <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-4 mr-4">
                  <div className="w-32">
                    <Progress value={calculateWeeklyCompletion(week.workouts)} className="h-2" />
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="px-4 py-2 space-y-2">
                {week.workouts.map((workout, workoutIndex) => (
                  <div
                    key={workoutIndex}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
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
                        <Badge variant="outline" className={getWorkoutTypeColor(workout.type)}>
                          {workout.type}
                        </Badge>
                        <div className="mt-1">
                          <div className="font-medium">
                            {format(new Date(workout.day), "EEEE, MMM d")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {workout.description}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
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
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowQuestionForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
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
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowChangesForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
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
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="outline"
                    className="w-40"
                    onClick={() => setShowQuestionForm(true)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Ask a Question
                  </Button>
                  <Button
                    variant="outline"
                    className="w-40"
                    onClick={() => setShowChangesForm(true)}
                  >
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Request Changes
                  </Button>
                  {onApprove && (
                    <Button className="w-40" onClick={onApprove}>
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