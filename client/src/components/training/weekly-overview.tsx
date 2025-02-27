import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

type WeeklyOverviewProps = {
  week: {
    week: number;
    phase: string;
    totalMileage: number;
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
        <div className="flex justify-between items-center">
          <CardTitle>Week {week.week} - {week.phase}</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total: {week.totalMileage} miles
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {week.workouts.map((workout, index) => (
          <div key={index} className="flex justify-between items-start p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <div>
              <div className="font-medium">{format(new Date(workout.day), "EEEE, MMM d")}</div>
              <div className="text-sm text-muted-foreground">{workout.type}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{workout.distance} miles</div>
              <div className="text-sm text-muted-foreground max-w-[300px] whitespace-pre-wrap">
                {workout.description}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}