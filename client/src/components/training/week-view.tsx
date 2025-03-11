import React, { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  MessageSquare,
  AlertCircle,
  GripVertical,
  Check,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WeekViewProps {
  week: {
    week: number;
    phase: string;
    totalMileage: number;
    workouts: Array<{
      id: string;
      day: string;
      type: string;
      distance: number;
      description: string;
      completed?: boolean;
    }>;
  };
  onReorderWorkouts?: (workouts: typeof week.workouts) => Promise<void>;
  onAskQuestion?: (question: string) => Promise<void>;
  onRequestChange?: (request: string) => Promise<void>;
  onSelectWorkout?: (date: Date) => void;
}

export default function WeekView({
  week,
  onReorderWorkouts,
  onAskQuestion,
  onRequestChange,
  onSelectWorkout,
}: WeekViewProps) {
  const [workouts, setWorkouts] = useState(week.workouts);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const { toast } = useToast();

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !onReorderWorkouts) return;

    const items = Array.from(workouts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setWorkouts(items);
    try {
      await onReorderWorkouts(items);
      toast({
        title: "Success",
        description: "Workout schedule updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update workout schedule",
        variant: "destructive",
      });
      // Revert to original order
      setWorkouts(week.workouts);
    }
  };

  const handleAskQuestion = async () => {
    if (!onAskQuestion || !question.trim()) return;
    setIsSubmitting(true);
    try {
      await onAskQuestion(question);
      setQuestion("");
      setShowQuestionForm(false);
      toast({
        title: "Success",
        description: "Question sent to AI coach",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send question",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChange = async () => {
    if (!onRequestChange || !changeRequest.trim()) return;
    setIsSubmitting(true);
    try {
      await onRequestChange(changeRequest);
      setChangeRequest("");
      setShowChangeForm(false);
      toast({
        title: "Success",
        description: "Change request sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send change request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              Week {week.week} - {week.phase}
            </CardTitle>
            <Badge variant="outline" className="text-primary">
              {week.totalMileage} miles
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="workouts">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-4"
                >
                  {workouts.map((workout, index) => (
                    <Draggable
                      key={workout.id}
                      draggableId={workout.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border rounded-lg p-4 bg-background hover:bg-accent/5 transition-colors"
                        >
                          <div className="flex items-start gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="mt-1.5 text-muted-foreground"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() =>
                                onSelectWorkout?.(new Date(workout.day))
                              }
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant="outline"
                                  className={`${
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
                                <span className="text-sm font-medium">
                                  {format(new Date(workout.day), "EEEE")}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {workout.distance} miles
                                </span>
                                {workout.completed && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {workout.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={() => setShowQuestionForm(true)}
          className="gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Ask About Week
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowChangeForm(true)}
          className="gap-2"
        >
          <AlertCircle className="h-4 w-4" />
          Request Changes
        </Button>
      </div>

      {showQuestionForm && (
        <Card>
          <CardHeader>
            <CardTitle>Ask AI Coach</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ask about this week's training..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button
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
                    Sending...
                  </>
                ) : (
                  "Ask Question"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showChangeForm && (
        <Card>
          <CardHeader>
            <CardTitle>Request Week Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Describe the changes you'd like to make to this week's schedule..."
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowChangeForm(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestChange}
                disabled={isSubmitting || !changeRequest.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Request Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
