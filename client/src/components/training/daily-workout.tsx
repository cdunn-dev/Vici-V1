import { useState } from "react";
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
  const [selectedOption, setSelectedOption] = useState(0); // Default to recommended workout
  const isEasyWorkout = workout.type.toLowerCase().includes("easy") || 
                       workout.type.toLowerCase().includes("recovery");

  // Only show the recommended workout for easy/recovery days
  const workoutOptions = isEasyWorkout ? 
    [{ title: "Recommended Workout", description: workout.description }] :
    [
      { title: "Recommended Workout", description: workout.description },
      ...workout.options.slice(1) // Skip the first option as it's now the recommended one
    ];

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
          {workoutOptions.map((option, index) => (
            <Card 
              key={index} 
              className={`bg-muted cursor-pointer transition-all ${
                selectedOption === index ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedOption(index)}
            >
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
            {workout.type === "Easy Run" ? 
              "Recovery and aerobic development - keep the effort comfortable and controlled." :
              "Today is a key workout day designed to significantly boost your VO2 max, speed, and running economy."}
          </p>
        </div>

        <div className="flex justify-end">
          <Button>Complete Workout</Button>
        </div>
      </CardContent>
    </Card>
  );
}