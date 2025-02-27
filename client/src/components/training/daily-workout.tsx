import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

type DailyWorkoutProps = {
  date: Date;
  workout: {
    type: string;
    distance: number;
    description: string;
    options: Array<{
      title: string;
      description: string;
    }>;
  };
};

export default function DailyWorkout({ date, workout }: DailyWorkoutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{format(date, "EEEE, MMMM d")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="font-medium">{workout.type}</h3>
          <p className="text-sm text-muted-foreground">{workout.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workout.options.map((option, index) => (
            <Card key={index} className="bg-muted">
              <CardHeader>
                <CardTitle className="text-sm">{option.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{option.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Today's Goal</h4>
          <p className="text-sm text-muted-foreground">
            Today is a key workout day designed to significantly boost your VO2 max, speed, and running economy.
          </p>
        </div>

        <div className="flex justify-end">
          <Button>Complete Workout</Button>
        </div>
      </CardContent>
    </Card>
  );
}
