import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Activity, MapPin, Clock, TrendingUp, Heart, Thermometer, Trophy, Star } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityDetailDialogProps {
  activity: any; // We'll type this properly once we confirm all the fields
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDetailDialog({ activity, open, onOpenChange }: ActivityDetailDialogProps) {
  if (!activity) return null;

  const formatDistance = (meters: number) => {
    const miles = meters / 1609.34;
    return `${miles.toFixed(1)} miles`;
  };

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

  const calculatePace = (meters: number, seconds: number) => {
    const miles = meters / 1609.34;
    const minutesPerMile = (seconds / 60) / miles;
    const paceMinutes = Math.floor(minutesPerMile);
    const paceSeconds = Math.round((minutesPerMile - paceMinutes) * 60);
    
    return `${paceMinutes}:${paceSeconds.toString().padStart(2, '0')}/mi`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Activity className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl">{activity.name}</DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 p-1">
            {/* Date and Location */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                {format(parseISO(activity.startDate), "PPp")}
                
                {activity.startLatitude && activity.startLongitude && (
                  <>
                    <span className="mx-1">•</span>
                    <MapPin className="h-4 w-4" />
                    <span>{activity.startAddress || "Location tracked"}</span>
                  </>
                )}
              </div>
              
              {activity.description && (
                <p className="mt-2 text-sm">{activity.description}</p>
              )}
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Distance</div>
                <div className="text-lg font-semibold">{formatDistance(activity.distance)}</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Time</div>
                <div className="text-lg font-semibold">{formatTime(activity.movingTime)}</div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Pace</div>
                <div className="text-lg font-semibold">
                  {calculatePace(activity.distance, activity.movingTime)}
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Elevation</div>
                <div className="text-lg font-semibold">
                  {activity.totalElevationGain}m <TrendingUp className="h-4 w-4 inline" />
                </div>
              </div>
            </div>

            {/* Additional Stats */}
            {(activity.hasHeartrate || activity.averageTemp || activity.sufferScore) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {activity.hasHeartrate && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Heart className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Heart Rate</div>
                        <div className="font-medium">
                          {activity.averageHeartrate} bpm avg
                          {activity.maxHeartrate && ` • ${activity.maxHeartrate} max`}
                        </div>
                      </div>
                    </div>
                  )}

                  {activity.averageTemp && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Thermometer className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Temperature</div>
                        <div className="font-medium">{activity.averageTemp}°C</div>
                      </div>
                    </div>
                  )}

                  {activity.sufferScore && (
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Trophy className="h-5 w-5 text-primary" />
                      <div>
                        <div className="text-sm text-muted-foreground">Suffer Score</div>
                        <div className="font-medium">{activity.sufferScore}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Splits/Laps */}
            {activity.splitMetrics && activity.splitMetrics.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Splits</h3>
                <div className="space-y-2">
                  {activity.splitMetrics.map((split: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{formatDistance(split.distance)}</div>
                          <div className="text-sm text-muted-foreground">
                            {calculatePace(split.distance, split.movingTime)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatTime(split.movingTime)}</div>
                        {split.elevationDifference && (
                          <div className="text-sm text-muted-foreground">
                            {split.elevationDifference > 0 ? "+" : ""}
                            {split.elevationDifference}m
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {activity.achievementCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>{activity.achievementCount} achievements</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
