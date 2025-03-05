import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, MessageSquare, ThumbsUp, Loader2, MapPin, Calendar } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
        return "bg-green-100 text-green-800";
      case "Long Run":
        return "bg-blue-100 text-blue-800";
      case "Speed Work":
        return "bg-red-100 text-red-800";
      case "Tempo Run":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="overview">
          <AccordionTrigger className="text-lg font-semibold">
            Program Overview
          </AccordionTrigger>
          <AccordionContent className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Goal:</span> {plan.goal}
              </div>
              <div>
                <span className="font-medium">Experience Level:</span>{" "}
                {plan.runningExperience.level}
              </div>
              <div>
                <span className="font-medium">Current Fitness:</span>{" "}
                {plan.runningExperience.fitnessLevel}
              </div>
              <div>
                <span className="font-medium">Weekly Running Days:</span>{" "}
                {plan.trainingPreferences.weeklyRunningDays}
              </div>
              <div>
                <span className="font-medium">Peak Weekly Mileage:</span>{" "}
                {plan.trainingPreferences.maxWeeklyMileage} miles
              </div>
              <div>
                <span className="font-medium">Quality Sessions:</span>{" "}
                {plan.trainingPreferences.weeklyWorkouts} per week
              </div>
            </div>
            {plan.targetRace && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Race Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Distance:</span>{" "}
                    {plan.targetRace.distance}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{" "}
                    {format(new Date(plan.targetRace.date), "PPP")}
                  </div>
                  {plan.targetRace.previousBest && (
                    <div>
                      <span className="font-medium">Previous Best:</span>{" "}
                      {plan.targetRace.previousBest}
                    </div>
                  )}
                  {plan.targetRace.goalTime && (
                    <div>
                      <span className="font-medium">Goal Time:</span>{" "}
                      {plan.targetRace.goalTime}
                    </div>
                  )}
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {plan.weeklyPlans.map((week, index) => (
          <AccordionItem key={week.week} value={`week-${week.week}`}>
            <AccordionTrigger className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <span>Week {week.week}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {week.totalMileage} miles
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-2">
              <div className="space-y-3">
                {week.workouts.map((workout, workoutIndex) => (
                  <div
                    key={workoutIndex}
                    className="flex items-center justify-between p-3 bg-background rounded-lg border"
                  >
                    <div className="flex items-center space-x-4">
                      <Badge variant="outline" className={getWorkoutTypeColor(workout.type)}>
                        {workout.type}
                      </Badge>
                      <div>
                        <div className="font-medium">
                          {format(new Date(workout.day), "EEEE, MMM d")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {workout.description}
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