
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Search, RefreshCw, MapPin, Clock, Award, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

// Types
interface ActivityWithWorkout {
  activity: {
    id: number;
    userId: number;
    stravaId: number;
    name: string;
    type: string;
    startDate: string;
    distance: number;
    movingTime: number;
    elapsedTime: number;
    totalElevationGain: number;
    startLatitude: number | null;
    startLongitude: number | null;
    averageSpeed: number;
    maxSpeed: number;
    hasHeartRate: boolean;
    averageHeartRate: number | null;
    maxHeartRate: number | null;
    workoutId: number | null;
  };
  workout?: {
    id: number;
    userId: number;
    planId: number;
    name: string;
    description: string;
    scheduledDate: string;
    type: string;
    distance: number;
    duration: number | null;
    completed: boolean;
    completedDate: string | null;
  } | null;
}

export default function Log() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

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

  // Filter activities based on search query and active tab
  const filteredActivities = activities?.filter(
    (item) => {
      const matchesSearch = item.activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.activity.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeTab === "all") return matchesSearch;
      if (activeTab === "runs") return matchesSearch && item.activity.type.toLowerCase() === "run";
      if (activeTab === "planned") return matchesSearch && item.workout !== null;
      
      return matchesSearch;
    }
  );

  // Format distance to show in miles with one decimal place
  const formatDistance = (meters: number) => {
    const miles = meters / 1609.34;
    return `${miles.toFixed(1)} miles`;
  };

  // Format time in a readable format
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  // Calculate pace in min/mile
  const calculatePace = (meters: number, seconds: number) => {
    const miles = meters / 1609.34;
    const minutesPerMile = (seconds / 60) / miles;
    const paceMinutes = Math.floor(minutesPerMile);
    const paceSeconds = Math.round((minutesPerMile - paceMinutes) * 60);
    
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/mi`;
  };

  // Get activity type icon
  const getActivityIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'run':
        return <Activity className="h-5 w-5" />;
      case 'ride':
        return <Activity className="h-5 w-5 rotate-45" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 pb-20 max-w-4xl">
      <div className="space-y-6">
        {/* Header with title and sync button */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">
              Track your workouts and monitor your progress
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-2 self-end md:self-auto"
          >
            <RefreshCw className={cn("h-4 w-4", syncMutation.isPending && "animate-spin")} />
            {syncMutation.isPending ? "Syncing..." : "Sync Activities"}
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-3 w-full md:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="runs">Runs</TabsTrigger>
              <TabsTrigger value="planned">Planned</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Activities list */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              {filteredActivities?.length || 0} activities found
            </CardDescription>
          </CardHeader>
          
          <ScrollArea className="h-[calc(100vh-300px)]">
            <CardContent className="p-0">
              {isLoading ? (
                // Loading skeletons
                <div className="space-y-4 p-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col space-y-3">
                      <Skeleton className="h-5 w-2/5" />
                      <Skeleton className="h-4 w-4/5" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-px w-full" />
                    </div>
                  ))}
                </div>
              ) : filteredActivities && filteredActivities.length > 0 ? (
                <div className="divide-y">
                  {filteredActivities.map((item) => (
                    <div key={item.activity.id} className="p-4 md:p-6 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col gap-1">
                        {/* Activity header */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              {getActivityIcon(item.activity.type)}
                            </div>
                            <h3 className="font-medium">{item.activity.name}</h3>
                          </div>
                          <Badge variant={item.workout ? "default" : "outline"} className="text-xs">
                            {item.workout ? "Planned Workout" : item.activity.type}
                          </Badge>
                        </div>
                        
                        {/* Date and location */}
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(parseISO(item.activity.startDate), "MMM d, yyyy 'at' h:mm a")}
                          
                          {(item.activity.startLatitude && item.activity.startLongitude) && (
                            <>
                              <span className="mx-1">•</span>
                              <MapPin className="h-3.5 w-3.5" />
                              <span>Tracked</span>
                            </>
                          )}
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mt-3">
                          <div className="bg-muted/50 rounded-md p-2 flex flex-col">
                            <span className="text-xs text-muted-foreground">Distance</span>
                            <span className="font-medium">{formatDistance(item.activity.distance)}</span>
                          </div>
                          
                          <div className="bg-muted/50 rounded-md p-2 flex flex-col">
                            <span className="text-xs text-muted-foreground">Time</span>
                            <span className="font-medium">{formatTime(item.activity.movingTime)}</span>
                          </div>
                          
                          <div className="bg-muted/50 rounded-md p-2 flex flex-col">
                            <span className="text-xs text-muted-foreground">Pace</span>
                            <span className="font-medium">
                              {calculatePace(item.activity.distance, item.activity.movingTime)}
                            </span>
                          </div>
                          
                          <div className="bg-muted/50 rounded-md p-2 flex flex-col">
                            <span className="text-xs text-muted-foreground">Elevation</span>
                            <span className="font-medium">{item.activity.totalElevationGain}m</span>
                          </div>
                        </div>
                        
                        {/* Planned workout details if any */}
                        {item.workout && (
                          <div className="mt-3 p-3 bg-primary/5 border border-primary/10 rounded-md">
                            <div className="text-sm font-medium text-primary">Planned Workout</div>
                            <div className="text-sm mt-1">{item.workout.description}</div>
                            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                              <span>Planned: {formatDistance(item.workout.distance * 1609.34)}</span>
                              <span>•</span>
                              <span>Actual: {formatDistance(item.activity.distance)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground">No activities found</p>
                  {searchQuery && (
                    <Button
                      variant="link"
                      onClick={() => setSearchQuery("")}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </ScrollArea>
          
          <CardFooter className="flex justify-between pt-6">
            <p className="text-sm text-muted-foreground">
              Connect with Strava to sync more activities
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
