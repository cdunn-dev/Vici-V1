import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, MessageSquare, ThumbsUp, Loader2 } from "lucide-react";
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
import type { PlanGeneratorFormData } from "./plan-generator-schema";

interface ProgramOverviewProps {
  plan: PlanGeneratorFormData & { endDate: Date };
  onApprove: () => void;
  onAskQuestion: (question: string) => void;
  onRequestChanges: (changes: string) => void;
}

export default function ProgramOverview({
  plan,
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
    if (!question.trim()) return;
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
    if (!changes.trim()) return;
    setIsSubmitting(true);
    try {
      await onRequestChanges(changes);
      setChanges("");
      setShowChangesForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="overview">
          <AccordionTrigger>Plan Overview</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <span className="font-medium">Goal:</span> {plan.goal}
              {plan.goalDescription && (
                <p className="text-sm text-muted-foreground mt-1">
                  {plan.goalDescription}
                </p>
              )}
            </div>
            {plan.targetRace && (
              <>
                <div>
                  <span className="font-medium">Target Race:</span>{" "}
                  {plan.targetRace.distance}
                  {plan.targetRace.customDistance && (
                    <> ({plan.targetRace.customDistance.value} {plan.targetRace.customDistance.unit})</>
                  )}
                </div>
                <div>
                  <span className="font-medium">Race Date:</span>{" "}
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
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="experience">
          <AccordionTrigger>Runner Profile</AccordionTrigger>
          <AccordionContent className="space-y-4">
            <div>
              <span className="font-medium">Experience Level:</span>{" "}
              {plan.runningExperience.level}
            </div>
            <div>
              <span className="font-medium">Current Fitness:</span>{" "}
              {plan.runningExperience.fitnessLevel}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="schedule">
          <AccordionTrigger>Training Schedule</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
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
              <div>
                <span className="font-medium">Long Run Day:</span>{" "}
                {plan.trainingPreferences.preferredLongRunDay}
              </div>
              <div>
                <span className="font-medium">Start Date:</span>{" "}
                {format(new Date(plan.startDate), "PPP")}
              </div>
              <div>
                <span className="font-medium">End Date:</span>{" "}
                {format(new Date(plan.endDate), "PPP")}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="mt-6">
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
                <Button className="w-40" onClick={onApprove}>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Approve Plan
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}