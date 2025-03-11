import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  CheckCircle2,
  Watch,
  MessageSquare,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DayViewProps {
  date: Date;
  workout: {
    type: string;
    distance: number;
    description: string;
    completed?: boolean;
    options?: Array<{
      title: string;
      description: string;
    }>;
  };
  onClose: () => void;
  onComplete?: () => void;
  onAskQuestion?: (question: string) => Promise<void>;
  onRequestChange?: (request: string) => Promise<void>;
  onSyncToWatch?: () => Promise<void>;
  isOpen: boolean;
}

export default function DayView({
  date,
  workout,
  onClose,
  onComplete,
  onAskQuestion,
  onRequestChange,
  onSyncToWatch,
  isOpen,
}: DayViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [question, setQuestion] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const { toast } = useToast();

  const handleSyncToWatch = async () => {
    if (!onSyncToWatch) return;
    setIsSubmitting(true);
    try {
      await onSyncToWatch();
      toast({
        title: "Success",
        description: "Workout synced to watch successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync workout to watch",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
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
            {format(date, 'EEEE, MMMM d')}
          </DialogTitle>
          <DialogDescription>
            {workout.distance} miles
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Workout Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Workout Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {workout.description}
              </p>
            </CardContent>
          </Card>

          {/* Alternative Options */}
          {workout.options && workout.options.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Alternative Options</CardTitle>
                <CardDescription>
                  Choose from these variations based on how you're feeling today
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workout.options.map((option, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border hover:bg-accent/5 cursor-pointer transition-colors"
                  >
                    <h4 className="font-medium mb-2">{option.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Interaction Forms */}
          {showQuestionForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ask AI Coach</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Ask about this workout..."
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
                    {isSubmitting ? "Sending..." : "Ask Question"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : showChangeForm ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Request Workout Change</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Describe the changes you'd like to make..."
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
                    {isSubmitting ? "Sending..." : "Request Change"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <DialogFooter className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQuestionForm(true)}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Ask Question
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangeForm(true)}
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Request Change
            </Button>
            {onSyncToWatch && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncToWatch}
                disabled={isSubmitting}
                className="gap-2"
              >
                <Watch className="h-4 w-4" />
                Sync to Watch
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Close
            </Button>
            {onComplete && (
              <Button
                size="sm"
                onClick={onComplete}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete Workout
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
