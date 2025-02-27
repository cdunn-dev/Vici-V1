import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CalendarViewProps = {
  selectedDate: Date;
  onSelect: (date: Date | undefined) => void;
  events: Array<{
    date: Date;
    type: string;
  }>;
};

export default function CalendarView({ selectedDate, onSelect, events }: CalendarViewProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={onSelect}
          className="rounded-md border"
          modifiers={{
            event: events.map(e => e.date),
          }}
          modifiersStyles={{
            event: {
              color: "var(--primary)",
              fontWeight: "bold",
            },
          }}
        />
      </CardContent>
    </Card>
  );
}