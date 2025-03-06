import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { personalBestSchema } from "@shared/schema";

const commonDistances = [
  "5K",
  "10K",
  "Half Marathon",
  "Marathon",
  "1 Mile",
  "5 Mile",
  "10 Mile",
  "Other"
];

interface AddPersonalBestFormProps {
  onSubmit: (data: { distance: string; time: string; date: string }) => void;
  onCancel: () => void;
}

export function AddPersonalBestForm({ onSubmit, onCancel }: AddPersonalBestFormProps) {
  const form = useForm({
    resolver: zodResolver(personalBestSchema),
    defaultValues: {
      distance: "",
      time: "",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  });

  // Handle custom distance input
  useEffect(() => {
    const distance = form.watch("distance");
    if (distance === "Other") {
      form.setValue("distance", "");
    }
  }, [form.watch("distance")]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="distance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Distance</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or enter distance" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {commonDistances.map((distance) => (
                    <SelectItem key={distance} value={distance}>
                      {distance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {field.value === "Other" && (
                <Input
                  placeholder="Enter custom distance"
                  onChange={(e) => field.onChange(e.target.value)}
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="HH:MM:SS"
                  pattern="^(?:(?:([01]?\d|2[0-3]):)?([0-5]?\d):)?([0-5]?\d)$"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date Achieved</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Add Record</Button>
        </div>
      </form>
    </Form>
  );
}
