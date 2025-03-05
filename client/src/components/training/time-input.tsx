import React from "react";
import { Input } from "@/components/ui/input";
import { FormControl } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}

export function TimeInput({ value, onChange, placeholder = "HH:MM:SS", error }: TimeInputProps) {
  const [hours, minutes, seconds] = value?.split(":").map(v => parseInt(v)) || [0, 0, 0];

  const updateTime = (type: "hours" | "minutes" | "seconds", delta: number) => {
    let newHours = hours || 0;
    let newMinutes = minutes || 0;
    let newSeconds = seconds || 0;

    switch (type) {
      case "hours":
        newHours = Math.max(0, Math.min(23, (newHours + delta)));
        break;
      case "minutes":
        newMinutes = Math.max(0, Math.min(59, (newMinutes + delta)));
        break;
      case "seconds":
        newSeconds = Math.max(0, Math.min(59, (newSeconds + delta)));
        break;
    }

    onChange(`${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}:${newSeconds.toString().padStart(2, "0")}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: "hours" | "minutes" | "seconds") => {
    let val = parseInt(e.target.value) || 0;
    
    // Enforce limits
    switch (type) {
      case "hours":
        val = Math.max(0, Math.min(23, val));
        break;
      case "minutes":
      case "seconds":
        val = Math.max(0, Math.min(59, val));
        break;
    }

    let newHours = type === "hours" ? val : (hours || 0);
    let newMinutes = type === "minutes" ? val : (minutes || 0);
    let newSeconds = type === "seconds" ? val : (seconds || 0);

    onChange(`${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}:${newSeconds.toString().padStart(2, "0")}`);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {/* Hours */}
        <div className="relative">
          <FormControl>
            <Input
              type="number"
              min="0"
              max="23"
              placeholder="HH"
              value={hours || ""}
              onChange={(e) => handleInputChange(e, "hours")}
              className={`pr-8 ${error ? "border-destructive" : ""}`}
            />
          </FormControl>
          <div className="absolute right-1 top-1 bottom-1 flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onClick={() => updateTime("hours", 1)}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onClick={() => updateTime("hours", -1)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Minutes */}
        <div className="relative">
          <FormControl>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="MM"
              value={minutes || ""}
              onChange={(e) => handleInputChange(e, "minutes")}
              className={`pr-8 ${error ? "border-destructive" : ""}`}
            />
          </FormControl>
          <div className="absolute right-1 top-1 bottom-1 flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onClick={() => updateTime("minutes", 1)}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onClick={() => updateTime("minutes", -1)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Seconds */}
        <div className="relative">
          <FormControl>
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="SS"
              value={seconds || ""}
              onChange={(e) => handleInputChange(e, "seconds")}
              className={`pr-8 ${error ? "border-destructive" : ""}`}
            />
          </FormControl>
          <div className="absolute right-1 top-1 bottom-1 flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onClick={() => updateTime("seconds", 1)}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onClick={() => updateTime("seconds", -1)}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground text-center">
        {placeholder}
      </div>
    </div>
  );
}
