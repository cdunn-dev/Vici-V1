import { useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import WeeklyOverview from "./weekly-overview";
import type { WeeklyPlan } from "@shared/schema";

type ProgramOverviewProps = {
  weeklyPlans: WeeklyPlan[];
  onSelectWeek: (weekNumber: number) => void;
  onSelectDay: (date: Date) => void;
  selectedDate: Date;
};

export default function ProgramOverview({
  weeklyPlans,
  onSelectWeek,
  onSelectDay,
  selectedDate,
}: ProgramOverviewProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);

  const today = new Date();

  return (
    <Accordion 
      type="multiple" 
      value={expandedWeeks}
      onValueChange={setExpandedWeeks}
      className="space-y-4"
    >
      {weeklyPlans.map((week) => {
        const firstDay = new Date(week.workouts[0].day);
        const lastDay = new Date(week.workouts[week.workouts.length - 1].day);
        const isWeekCompleted = lastDay < today;

        return (
          <AccordionItem
            key={week.week}
            value={`week-${week.week}`}
            className="border rounded-lg overflow-hidden"
          >
            <AccordionTrigger className="px-6 py-4 hover:bg-accent/50">
              <div className="flex justify-between items-center w-full">
                <div>
                  <h3 className="font-semibold">Week {week.week}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(firstDay, "MMM d")} - {format(lastDay, "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">{week.totalMileage} miles</p>
                    <p className="text-sm text-muted-foreground">{week.phase}</p>
                  </div>
                  {isWeekCompleted && (
                    <Check className="h-5 w-5 text-green-500" />
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4">
                <WeeklyOverview
                  week={week}
                  onSelectDay={onSelectDay}
                  selectedDate={selectedDate}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}