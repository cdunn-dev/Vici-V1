import React, { useState, useEffect } from "react";
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
  const [hours, minutes, seconds] = value?.split(":").map(v => v ? parseInt(v) : "") || ["", "", ""];
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressCount, setPressCount] = useState(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimer) {
        clearInterval(pressTimer);
      }
    };
  }, [pressTimer]);

  const getIncrementAmount = (count: number) => {
    if (count < 10) return 1;
    if (count < 20) return 5;
    return 10;
  };

  const startIncrement = (type: "hours" | "minutes" | "seconds", delta: number) => {
    setPressCount(0);
    updateTime(type, delta);

    const timer = setInterval(() => {
      setPressCount(count => {
        const newCount = count + 1;
        updateTime(type, delta * getIncrementAmount(newCount));
        return newCount;
      });
    }, 150);

    setPressTimer(timer);
  };

  const stopIncrement = () => {
    if (pressTimer) {
      clearInterval(pressTimer);
      setPressTimer(null);
    }
    setPressCount(0);
  };

  const updateTime = (type: "hours" | "minutes" | "seconds", delta: number) => {
    let newHours = hours === "" ? 0 : hours;
    let newMinutes = minutes === "" ? 0 : minutes;
    let newSeconds = seconds === "" ? 0 : seconds;

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
    const val = e.target.value === "" ? "" : parseInt(e.target.value);

    // Allow empty string or valid number
    if (val === "" || !isNaN(val)) {
      let newHours = type === "hours" ? val : hours;
      let newMinutes = type === "minutes" ? val : minutes;
      let newSeconds = type === "seconds" ? val : seconds;

      // Enforce limits if value is a number
      if (typeof val === "number") {
        switch (type) {
          case "hours":
            newHours = Math.max(0, Math.min(23, val));
            break;
          case "minutes":
          case "seconds":
            if (type === "minutes") newMinutes = Math.max(0, Math.min(59, val));
            if (type === "seconds") newSeconds = Math.max(0, Math.min(59, val));
            break;
        }
      }

      // Only format as HH:MM:SS if all fields have values
      if (newHours !== "" && newMinutes !== "" && newSeconds !== "") {
        onChange(`${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}:${newSeconds.toString().padStart(2, "0")}`);
      } else {
        // Keep the raw values in the form state
        onChange(`${newHours || "00"}:${newMinutes || "00"}:${newSeconds || "00"}`);
      }
    }
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
              value={hours}
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
              onMouseDown={() => startIncrement("hours", 1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onMouseDown={() => startIncrement("hours", -1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
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
              value={minutes}
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
              onMouseDown={() => startIncrement("minutes", 1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onMouseDown={() => startIncrement("minutes", -1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
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
              value={seconds}
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
              onMouseDown={() => startIncrement("seconds", 1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-1/2 w-6 p-0"
              onMouseDown={() => startIncrement("seconds", -1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
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