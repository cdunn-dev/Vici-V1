
import { Card, CardContent } from "@/components/ui/card";

type ProgramProgressProps = {
  completedWeeks: number;
  totalWeeks: number;
};

export default function ProgramProgress({ completedWeeks, totalWeeks }: ProgramProgressProps) {
  const percentage = Math.round((completedWeeks / totalWeeks) * 100) || 0;
  const radius = 40;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="relative w-[100px] h-[100px]">
            {/* Background circle */}
            <svg className="w-full h-full -rotate-90">
              <circle
                className="text-muted-foreground/20"
                strokeWidth="8"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="50"
                cy="50"
              />
              {/* Progress circle */}
              <circle
                className="text-primary"
                strokeWidth="8"
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r={radius}
                cx="50"
                cy="50"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: offset,
                  transition: "stroke-dashoffset 0.5s ease",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-semibold">
              {percentage}%
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-2xl font-bold">{completedWeeks}/{totalWeeks}</div>
            <div className="text-sm text-muted-foreground">weeks completed</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
