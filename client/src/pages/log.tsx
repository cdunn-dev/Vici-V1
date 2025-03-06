import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ActivityWithWorkout = {
  activity: {
    id: number;
    name: string;
    type: string;
    startDate: string;
    distance: number;
    movingTime: number;
    elapsedTime: number;
    averageSpeed: number;
    maxSpeed: number;
    averageHeartrate?: number;
    maxHeartrate?: number;
    totalElevationGain: number;
  };
  workout?: {
    id: number;
    type: string;
    description: string;
    distance: number;
    completed: boolean;
  };
};

function ActivityTile({ data }: { data: ActivityWithWorkout }) {
  const [showNotes, setShowNotes] = useState(false);
  const { activity, workout } = data;

  // Convert distance from meters to kilometers and pace to min/km
  const distanceKm = activity.distance / 1000;
  const paceMinPerKm = (activity.movingTime / 60) / distanceKm;
  const paceMinutes = Math.floor(paceMinPerKm);
  const paceSeconds = Math.round((paceMinPerKm - paceMinutes) * 60);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-medium">
              {activity.name}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(activity.startDate), "MMMM d, yyyy h:mm a")}
            </p>
          </div>
          {workout && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Planned Workout</span>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Distance</div>
              <div className="text-xl">{distanceKm.toFixed(2)} km</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Pace</div>
              <div className="text-xl">
                {paceMinutes}:{paceSeconds.toString().padStart(2, "0")} /km
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Time</div>
              <div className="text-xl">
                {Math.floor(activity.movingTime / 60)}:{(activity.movingTime % 60).toString().padStart(2, "0")}
              </div>
            </div>
          </div>
          {activity.averageHeartrate && (
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Avg HR</div>
                <div className="text-xl">{Math.round(activity.averageHeartrate)} bpm</div>
              </div>
            </div>
          )}
        </div>

        {workout && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Planned Workout</h4>
            <p className="text-sm text-muted-foreground">{workout.description}</p>
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start mt-4"
          onClick={() => setShowNotes(!showNotes)}
        >
          {showNotes ? "Hide" : "Show"} Details
        </Button>

        {showNotes && (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Elevation Gain:</span>{" "}
                {activity.totalElevationGain}m
              </div>
              {activity.maxHeartrate && (
                <div>
                  <span className="font-medium">Max HR:</span>{" "}
                  {activity.maxHeartrate} bpm
                </div>
              )}
              <div>
                <span className="font-medium">Moving Time:</span>{" "}
                {Math.floor(activity.movingTime / 60)}:{(activity.movingTime % 60).toString().padStart(2, "0")}
              </div>
              <div>
                <span className="font-medium">Total Time:</span>{" "}
                {Math.floor(activity.elapsedTime / 60)}:{(activity.elapsedTime % 60).toString().padStart(2, "0")}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Log() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: activities, isLoading } = useQuery<ActivityWithWorkout[]>({
    queryKey: ["/api/activities"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/activities/sync");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync activities");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      toast({
        title: "Activities Synced",
        description: "Your Strava activities have been synced successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter activities based on search query
  const filteredActivities = activities?.filter(
    (item) =>
      item.activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.activity.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Training Log</h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search activities..."
            className="w-[200px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync Strava
          </Button>
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading activities...</div>
      ) : filteredActivities?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No activities found. Connect with Strava to import your activities.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredActivities?.map((activity) => (
            <ActivityTile key={activity.activity.id} data={activity} />
          ))}
        </div>
      )}
    </div>
  );
}