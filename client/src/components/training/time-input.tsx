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
  // Safely parse initial values
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressCount, setPressCount] = useState(0);

  // Initialize values from prop
  useEffect(() => {
    if (value) {
      const [h, m, s] = value.split(":").map(v => v || "");
      setHours(h);
      setMinutes(m);
      setSeconds(s);
    }
  }, [value]);

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

  const formatTimeValue = (value: string | number): string => {
    if (value === "") return "00";
    const numValue = typeof value === "string" ? parseInt(value) : value;
    return isNaN(numValue) ? "00" : numValue.toString().padStart(2, "0");
  };

  const updateTime = (type: "hours" | "minutes" | "seconds", delta: number) => {
    let newHours = parseInt(hours) || 0;
    let newMinutes = parseInt(minutes) || 0;
    let newSeconds = parseInt(seconds) || 0;

    switch (type) {
      case "hours":
        newHours = Math.max(0, Math.min(23, newHours + delta));
        setHours(newHours.toString());
        break;
      case "minutes":
        newMinutes = Math.max(0, Math.min(59, newMinutes + delta));
        setMinutes(newMinutes.toString());
        break;
      case "seconds":
        newSeconds = Math.max(0, Math.min(59, newSeconds + delta));
        setSeconds(newSeconds.toString());
        break;
    }

    onChange(`${formatTimeValue(newHours)}:${formatTimeValue(newMinutes)}:${formatTimeValue(newSeconds)}`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, type: "hours" | "minutes" | "seconds") => {
    const val = e.target.value;

    // Allow empty input or valid numbers
    if (val === "" || /^\d{0,2}$/.test(val)) {
      let newHours = hours;
      let newMinutes = minutes;
      let newSeconds = seconds;

      switch (type) {
        case "hours":
          newHours = val === "" ? "" : Math.min(23, parseInt(val) || 0).toString();
          setHours(newHours);
          break;
        case "minutes":
          newMinutes = val === "" ? "" : Math.min(59, parseInt(val) || 0).toString();
          setMinutes(newMinutes);
          break;
        case "seconds":
          newSeconds = val === "" ? "" : Math.min(59, parseInt(val) || 0).toString();
          setSeconds(newSeconds);
          break;
      }

      onChange(`${formatTimeValue(newHours)}:${formatTimeValue(newMinutes)}:${formatTimeValue(newSeconds)}`);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {/* Hours */}
        <div className="relative">
          <FormControl>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="HH"
              value={hours}
              onChange={(e) => handleInputChange(e, "hours")}
              className={`pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${error ? "border-destructive" : ""}`}
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
              type="text"
              inputMode="numeric"
              placeholder="MM"
              value={minutes}
              onChange={(e) => handleInputChange(e, "minutes")}
              className={`pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${error ? "border-destructive" : ""}`}
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
              type="text"
              inputMode="numeric"
              placeholder="SS"
              value={seconds}
              onChange={(e) => handleInputChange(e, "seconds")}
              className={`pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${error ? "border-destructive" : ""}`}
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