import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Activity,
  Heart,
  Timer,
  Route,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

type ActivityTileProps = {
  workout: {
    date: string;
    type: string;
    distance: number;
    duration: number;
    perceivedEffort?: number;
    notes?: string;
  };
};

function ActivityTile({ workout }: ActivityTileProps) {
  const [showNotes, setShowNotes] = useState(false);
  const pace = workout.duration / 60 / (workout.distance / 1000);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium">
            {format(new Date(workout.date), "MMMM d, yyyy")}
          </CardTitle>
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Distance</div>
              <div className="text-xl">{(workout.distance / 1000).toFixed(2)} km</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Time</div>
              <div className="text-xl">
                {Math.floor(workout.duration / 60)}:{(workout.duration % 60).toString().padStart(2, "0")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Pace</div>
              <div className="text-xl">{pace.toFixed(2)} min/km</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Effort</div>
              <div className="text-xl">{workout.perceivedEffort}/10</div>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? "Hide" : "Show"} Notes
        </Button>

        {showNotes && workout.notes && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{workout.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Log() {
  const [perceivedEffort, setPerceivedEffort] = useState([5]);
  const { data: workouts } = useQuery({
    queryKey: ["/api/workouts", 1], // Assuming user ID 1 for now
  });

  // Mock data for demonstration
  const mockWorkouts = [
    {
      date: "2024-01-10",
      type: "Easy Run",
      distance: 8000, // 8km in meters
      duration: 2400, // 40 minutes in seconds
      perceivedEffort: 6,
      notes: "Felt strong today, maintained consistent pace throughout the run.",
    },
    {
      date: "2024-01-09",
      type: "Tempo Run",
      distance: 10000,
      duration: 3000,
      perceivedEffort: 8,
      notes: "Tough workout but hit all the target paces.",
    },
  ];

  return (
    <div className="space-y-8">
      <Tabs defaultValue="log" className="space-y-6">
        <TabsList>
          <TabsTrigger value="log">Training Log</TabsTrigger>
          <TabsTrigger value="new">Log Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Training Log</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Search activities..."
                className="w-[200px]"
              />
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {mockWorkouts.map((workout, index) => (
              <ActivityTile key={index} workout={workout} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>Log New Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Distance (km)</label>
                    <Input type="number" step="0.01" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration</label>
                    <Input type="time" step="1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Perceived Effort (1-10)</label>
                  <Slider
                    value={perceivedEffort}
                    onValueChange={setPerceivedEffort}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <div className="text-sm text-muted-foreground text-center">
                    {perceivedEffort}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea
                    placeholder="How did your run feel? Any notable achievements or challenges?"
                    className="min-h-[100px]"
                  />
                </div>

                <Button className="w-full">Save Activity</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
