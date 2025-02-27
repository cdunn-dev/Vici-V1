import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { CalendarIcon, Activity } from "lucide-react";

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
  onSelectDay?: (date: Date) => void;
  selectedDate?: Date;
};

export default function WeeklyOverview({ week, onSelectDay, selectedDate }: WeeklyOverviewProps) {
  const today = new Date();
  const firstWorkoutDate = new Date(week.workouts[0].day);
  const weekStart = startOfWeek(firstWorkoutDate, { weekStartsOn: 1 });
  const lastWorkoutDate = new Date(week.workouts[week.workouts.length - 1].day);

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle>Week {week.week} - {week.phase}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(firstWorkoutDate, "MMM d")} - {format(lastWorkoutDate, "MMM d, yyyy")}
          </p>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4 text-primary" />
            <span>Total: {week.totalMileage} miles</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.from({ length: 7 }).map((_, index) => {
          const currentDate = addDays(weekStart, index);
          const workout = week.workouts.find(w => 
            isSameDay(new Date(w.day), currentDate)
          );

          return (
            <div
              key={index}
              className={`flex justify-between items-start p-4 border rounded-lg transition-colors cursor-pointer
                ${isSameDay(currentDate, today) ? 'bg-accent/20' : 'hover:bg-accent/10'}
                ${workout && onSelectDay ? 'cursor-pointer' : 'cursor-default opacity-50'}
                ${selectedDate && isSameDay(currentDate, selectedDate) ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => workout && onSelectDay?.(currentDate)}
            >
              <div className="flex-1">
                <div className="font-medium text-sm">{format(currentDate, "EEEE")}</div>
                <div className="text-xs text-muted-foreground">{format(currentDate, "MMM d")}</div>
                {workout ? (
                  <div className="mt-1">
                    <div className="text-sm font-medium text-primary">{workout.type}</div>
                    <div className="text-xs text-muted-foreground">{workout.distance} miles</div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">Rest Day</div>
                )}
              </div>
              {workout && (
                <div className="max-w-[60%] text-right">
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {workout.description}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}