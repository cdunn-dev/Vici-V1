
import React from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const goalOptions = [
  {
    value: "5k",
    label: "5K Race",
    description: "Train for a 5 kilometer race",
  },
  {
    value: "10k",
    label: "10K Race",
    description: "Train for a 10 kilometer race",
  },
  {
    value: "half-marathon",
    label: "Half Marathon",
    description: "Train for a 21.1 kilometer race",
  },
  {
    value: "marathon",
    label: "Marathon",
    description: "Train for a 42.2 kilometer race",
  },
  {
    value: "general-fitness",
    label: "General Fitness",
    description: "Improve overall fitness and running ability",
  },
];

export function TrainingGoals({ form, control }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold mb-4">What's your training goal?</h2>
      <FormField
        control={form.control}
        name="goal"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Select your goal</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                {goalOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-muted/50">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label htmlFor={option.value} className="flex flex-col cursor-pointer">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-sm text-muted-foreground">{option.description}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
