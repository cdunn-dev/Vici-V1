import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

type HeatMapCalendarProps = {
  selectedDate: Date;
  onSelect: (date: Date | undefined) => void;
  workouts: Array<{
    date: Date;
    intensity: number; // 0-1 scale for heat intensity
    type: string;
    distance: number;
  }>;
  startDate: Date;
  endDate: Date;
};

// Helper function to calculate color based on intensity
function getIntensityColor(intensity: number): string {
  // Scale from light purple to dark purple
  const baseHue = 270; // Purple hue
  const lightness = Math.max(95 - (intensity * 50), 45); // 95% to 45% lightness
  return `hsl(${baseHue}, 70%, ${lightness}%)`;
}

export default function HeatMapCalendar({
  selectedDate,
  onSelect,
  workouts,
  startDate,
  endDate,
}: HeatMapCalendarProps) {
  const isWithinTrainingPeriod = (date: Date) => {
    return date >= startDate && date <= endDate;
  };

  // Calculate intensity for each date
  const intensityMap = new Map(
    workouts.map(workout => [
      format(workout.date, 'yyyy-MM-dd'),
      {
        intensity: Math.min(1, workout.distance / 20), // Normalize based on distance, max at 20 miles
        type: workout.type
      }
    ])
  );

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
          <CalendarRange className="h-4 w-4" />
          <span>Training Period: {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}</span>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          className="rounded-md border"
          modifiers={{
            training: (date) => isWithinTrainingPeriod(date),
            workout: (date) => intensityMap.has(format(date, 'yyyy-MM-dd')),
          }}
          modifiersClassNames={{
            selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground text-white",
          }}
          styles={{
            day: (date) => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const workoutData = intensityMap.get(dateStr);
              if (workoutData) {
                return {
                  backgroundColor: getIntensityColor(workoutData.intensity),
                  color: workoutData.intensity > 0.5 ? 'white' : undefined,
                };
              }
              return {};
            },
          }}
          disabled={(date) => !isWithinTrainingPeriod(date)}
        />
        <div className="flex justify-center mt-4 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-primary opacity-30" />
            <span>Light</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-primary opacity-60" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-primary opacity-90" />
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}