import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { useState } from "react";

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
  // Get Monday as start of week
  const today = new Date();
  const firstWorkoutDate = new Date(week.workouts[0].day);
  const weekStart = startOfWeek(firstWorkoutDate, { weekStartsOn: 1 });

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
        {Array.from({ length: 7 }).map((_, index) => {
          const currentDate = addDays(weekStart, index);
          const workout = week.workouts.find(w => 
            isSameDay(new Date(w.day), currentDate)
          );

          return (
            <div
              key={index}
              className={`flex justify-between items-start p-4 border rounded-lg transition-colors cursor-pointer
                ${isSameDay(currentDate, today) ? 'bg-accent' : 'hover:bg-accent/50'}
                ${workout && onSelectDay ? 'cursor-pointer' : 'cursor-default opacity-50'}
                ${selectedDate && isSameDay(currentDate, selectedDate) ? 'ring-2 ring-primary' : ''}
              `}
              onClick={() => workout && onSelectDay?.(currentDate)}
            >
              <div>
                <div className="font-medium">{format(currentDate, "EEEE, MMM d")}</div>
                {workout ? (
                  <>
                    <div className="text-sm text-muted-foreground">{workout.type}</div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Rest Day</div>
                )}
              </div>
              {workout && (
                <div className="text-right">
                  <div className="font-medium">{workout.distance} miles</div>
                  <div className="text-sm text-muted-foreground max-w-[300px] whitespace-pre-wrap">
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