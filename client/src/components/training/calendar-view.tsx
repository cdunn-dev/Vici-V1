import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Medal, CalendarRange } from "lucide-react";

type CalendarViewProps = {
  selectedDate: Date;
  onSelect: (date: Date | undefined) => void;
  events: Array<{
    date: Date;
    type: string;
    title: string;
  }>;
  startDate: Date;
  endDate: Date;
  targetRace?: {
    distance: string;
    date: string;
  };
};

export default function CalendarView({ 
  selectedDate, 
  onSelect, 
  events,
  startDate,
  endDate,
  targetRace 
}: CalendarViewProps) {
  const isWithinTrainingPeriod = (date: Date) => {
    return date >= startDate && date <= endDate;
  };

  const isRaceDay = (date: Date) => {
    return targetRace && format(date, 'yyyy-MM-dd') === targetRace.date;
  };

  return (
    <div className="space-y-4">
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
              event: events.map(e => e.date),
              race: (date) => isRaceDay(date)
            }}
            modifiersClassNames={{
              selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground text-white",
              training: "bg-primary/10 hover:bg-primary/20",
              race: "bg-primary text-primary-foreground font-bold"
            }}
            disabled={(date) => !isWithinTrainingPeriod(date)}
          />
        </CardContent>
      </Card>

      {targetRace && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-primary">
              <Medal className="h-5 w-5" />
              <div className="font-medium">
                Target Race: {targetRace.distance}
                <div className="text-sm text-muted-foreground">
                  {format(new Date(targetRace.date), 'MMMM d, yyyy')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}