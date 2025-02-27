import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

type WeeklyOverviewProps = {
  week: {
    phase: string;
    workouts: Array<{
      day: string;
      type: string;
      distance: number;
      description: string;
    }>;
  };
};

export default function WeeklyOverview({ week }: WeeklyOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Week 1 - {week.phase}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {week.workouts.map((workout, index) => (
          <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
            <div>
              <div className="font-medium">{format(new Date(workout.day), "EEEE")}</div>
              <div className="text-sm text-muted-foreground">{workout.type}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{workout.distance} miles</div>
              <div className="text-sm text-muted-foreground">{workout.description}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
