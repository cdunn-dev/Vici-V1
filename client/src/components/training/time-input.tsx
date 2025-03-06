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
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [pressCount, setPressCount] = useState(0);
  const [activeField, setActiveField] = useState<"hours" | "minutes" | "seconds" | null>(null);

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
    setActiveField(type);
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
    setActiveField(null);
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
    const numVal = parseInt(val);

    if (val === "" || /^\d{0,2}$/.test(val)) {
      const maxValue = type === "hours" ? 23 : 59;
      const newValue = val === "" ? "" : Math.min(maxValue, isNaN(numVal) ? 0 : numVal).toString();

      switch (type) {
        case "hours":
          setHours(newValue);
          break;
        case "minutes":
          setMinutes(newValue);
          break;
        case "seconds":
          setSeconds(newValue);
          break;
      }

      onChange(`${formatTimeValue(type === "hours" ? newValue : hours)}:${formatTimeValue(type === "minutes" ? newValue : minutes)}:${formatTimeValue(type === "seconds" ? newValue : seconds)}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-6 items-center">
        {/* Hours */}
        <div className="relative">
          <FormControl>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="HH"
              value={hours}
              onChange={(e) => handleInputChange(e, "hours")}
              onFocus={() => setActiveField("hours")}
              onBlur={() => setActiveField(null)}
              className={`
                text-center text-2xl h-14 pr-12
                ${error ? "border-destructive" : ""}
                ${activeField === "hours" ? "border-primary ring-2 ring-primary/20" : ""}
              `}
              aria-label="Hours"
            />
          </FormControl>
          <div className="absolute right-1 inset-y-1 flex flex-col">
            <Button
              type="button"
              variant={activeField === "hours" ? "default" : "ghost"}
              size="icon"
              className={`h-1/2 w-10 ${activeField === "hours" ? "bg-primary text-primary-foreground" : ""}`}
              onMouseDown={() => startIncrement("hours", 1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
              onTouchStart={() => startIncrement("hours", 1)}
              onTouchEnd={stopIncrement}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={activeField === "hours" ? "default" : "ghost"}
              size="icon"
              className={`h-1/2 w-10 ${activeField === "hours" ? "bg-primary text-primary-foreground" : ""}`}
              onMouseDown={() => startIncrement("hours", -1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
              onTouchStart={() => startIncrement("hours", -1)}
              onTouchEnd={stopIncrement}
            >
              <ChevronDown className="h-4 w-4" />
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
              onFocus={() => setActiveField("minutes")}
              onBlur={() => setActiveField(null)}
              className={`
                text-center text-2xl h-14 pr-12
                ${error ? "border-destructive" : ""}
                ${activeField === "minutes" ? "border-primary ring-2 ring-primary/20" : ""}
              `}
              aria-label="Minutes"
            />
          </FormControl>
          <div className="absolute right-1 inset-y-1 flex flex-col">
            <Button
              type="button"
              variant={activeField === "minutes" ? "default" : "ghost"}
              size="icon"
              className={`h-1/2 w-10 ${activeField === "minutes" ? "bg-primary text-primary-foreground" : ""}`}
              onMouseDown={() => startIncrement("minutes", 1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
              onTouchStart={() => startIncrement("minutes", 1)}
              onTouchEnd={stopIncrement}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={activeField === "minutes" ? "default" : "ghost"}
              size="icon"
              className={`h-1/2 w-10 ${activeField === "minutes" ? "bg-primary text-primary-foreground" : ""}`}
              onMouseDown={() => startIncrement("minutes", -1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
              onTouchStart={() => startIncrement("minutes", -1)}
              onTouchEnd={stopIncrement}
            >
              <ChevronDown className="h-4 w-4" />
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
              onFocus={() => setActiveField("seconds")}
              onBlur={() => setActiveField(null)}
              className={`
                text-center text-2xl h-14 pr-12
                ${error ? "border-destructive" : ""}
                ${activeField === "seconds" ? "border-primary ring-2 ring-primary/20" : ""}
              `}
              aria-label="Seconds"
            />
          </FormControl>
          <div className="absolute right-1 inset-y-1 flex flex-col">
            <Button
              type="button"
              variant={activeField === "seconds" ? "default" : "ghost"}
              size="icon"
              className={`h-1/2 w-10 ${activeField === "seconds" ? "bg-primary text-primary-foreground" : ""}`}
              onMouseDown={() => startIncrement("seconds", 1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
              onTouchStart={() => startIncrement("seconds", 1)}
              onTouchEnd={stopIncrement}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={activeField === "seconds" ? "default" : "ghost"}
              size="icon"
              className={`h-1/2 w-10 ${activeField === "seconds" ? "bg-primary text-primary-foreground" : ""}`}
              onMouseDown={() => startIncrement("seconds", -1)}
              onMouseUp={stopIncrement}
              onMouseLeave={stopIncrement}
              onTouchStart={() => startIncrement("seconds", -1)}
              onTouchEnd={stopIncrement}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <div className="text-sm text-muted-foreground text-center">
        {placeholder}
      </div>
    </div>
  );
}