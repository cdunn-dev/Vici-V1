import { useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ChevronDown, ChevronRight, Check, Medal, Target, CalendarClock } from "lucide-react";
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
  goal: string;
  endDate: Date;
  targetRace?: {
    distance: string;
    date: string;
  };
};

export default function ProgramOverview({
  weeklyPlans,
  onSelectWeek,
  onSelectDay,
  selectedDate,
  goal,
  endDate,
  targetRace,
}: ProgramOverviewProps) {
  const [expandedWeeks, setExpandedWeeks] = useState<string[]>([]);
  const today = new Date();

  return (
    <div className="space-y-4">
      <Accordion 
        type="multiple" 
        value={expandedWeeks}
        onValueChange={setExpandedWeeks}
        className="space-y-4"
      >
        {weeklyPlans.map((week) => {
          const firstDay = new Date(week.workouts[0].day);
          const weekStart = startOfWeek(firstDay, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const isWeekCompleted = weekEnd < today;

          return (
            <AccordionItem
              key={week.week}
              value={`week-${week.week}`}
              className="border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-accent/50">
                <div className="flex justify-between items-center w-full">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      Week {week.week}
                      <span className="text-primary/80 text-sm font-normal">
                        {week.phase}
                      </span>
                    </h3>
                    <p className="text-sm text-muted-foreground text-left">
                      {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{week.totalMileage} miles</p>
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

      {/* Goal and Target Race Widget */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6 pb-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              <div className="font-medium">
                Training Goal
                <div className="text-sm text-muted-foreground">
                  {goal}
                </div>
              </div>
            </div>

            {targetRace ? (
              <div className="flex items-center gap-2 text-primary">
                <Medal className="h-5 w-5" />
                <div className="font-medium">
                  Race Date
                  <div className="text-sm text-muted-foreground">
                    {targetRace.distance} on {format(new Date(targetRace.date), "MMMM d, yyyy")}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-primary">
                <CalendarClock className="h-5 w-5" />
                <div className="font-medium">
                  Program Completion
                  <div className="text-sm text-muted-foreground">
                    {format(endDate, "MMMM d, yyyy")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}