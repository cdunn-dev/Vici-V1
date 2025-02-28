
import { useState } from "react";
import { format } from "date-fns";
import { X, CheckCircle2, XCircle, InfoIcon, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type WorkoutDetailProps = {
  date: Date;
  workout: {
    type: string;
    distance: number;
    description: string;
    options: Array<{
      title: string;
      description: string;
    }>;
  };
  expandable?: boolean;
};

export default function WorkoutDetail({ date, workout, expandable = true }: WorkoutDetailProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(0);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const workoutTypeInfo = {
    "Easy Run": "Easy runs build aerobic endurance while allowing your body to recover. Keep the effort conversational - you should be able to talk in complete sentences throughout the run.",
    "Long Run": "Long runs build endurance and mental toughness. Focus on time on feet rather than pace. These runs teach your body to use fat as fuel and improve your running economy.",
    "Tempo Run": "Tempo runs build lactate threshold, helping you sustain faster paces for longer. Run at a 'comfortably hard' effort - about 85-90% of max heart rate or a pace you could sustain for about an hour.",
    "Interval": "Interval workouts improve VO2 max and running economy. Push hard during the work intervals and recover completely during rest periods to maximize benefits.",
    "Recovery": "Recovery runs promote blood flow to damaged muscles, accelerating healing while maintaining running volume. Keep these very easy - slower than you think you need to go.",
    "Hill Workout": "Hill workouts build strength, power, and running economy. Focus on maintaining good form - high knees, powerful arm swing, and an upright posture.",
    "Fartlek": "Fartlek (Swedish for 'speed play') workouts blend continuous training with speed intervals. These workouts improve anaerobic threshold while keeping running fun and playful."
  };

  // Find the info about this workout type
  const workoutInfo = Object.entries(workoutTypeInfo).find(([key]) => 
    workout.type.includes(key)
  )?.[1] || "Focus on maintaining good form and consistent effort throughout this workout.";
  
  const isEasyWorkout = workout.type.toLowerCase().includes('easy') || 
                         workout.type.toLowerCase().includes('recovery');

  const workoutOptions = isEasyWorkout ? 
    [{ title: "Recommended Workout", description: workout.description }] :
    [
      { title: "Recommended Workout", description: workout.description },
      ...workout.options.slice(1)
    ];

  return (
    <>
      <Card className={expandable ? "cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all" : ""} 
            onClick={() => expandable && setIsOpen(true)}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{format(date, "EEEE, MMMM d")}</CardTitle>
            {expandable && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <InfoIcon className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription>
            <div className="flex items-center">
              <span className="font-medium text-primary">{workout.type}</span>
              <span className="mx-2">•</span>
              <span>{workout.distance} miles</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{workout.description}</p>
          
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Today's Goal</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {isEasyWorkout ? 
                "Recovery and aerobic development - keep the effort comfortable and controlled." :
                "Key workout designed to boost your running performance and economy."}
            </p>
            {expandable && (
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}>
                View Workout Details
              </Button>
            )}
          </div>v>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <XCircle className="h-3 w-3" />
              Skip
            </Button>
            <Button size="sm" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="absolute left-4 top-4">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-center flex-1">{format(date, "EEEE, MMMM d")}</DialogTitle>
            </div>
            <DialogDescription className="text-center">
              <div className="flex justify-center items-center mt-2">
                <span className="font-medium text-primary text-lg">{workout.type}</span>
                <span className="mx-2">•</span>
                <span>{workout.distance} miles</span>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-2">Workout Options</h3>
              <div className="grid grid-cols-1 gap-4">
                {workoutOptions.map((option, index) => (
                  <Card 
                    key={index} 
                    className={`bg-muted cursor-pointer transition-all ${
                      selectedOption === index ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedOption(index)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-sm">{option.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{option.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Workout Information</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowMoreInfo(!showMoreInfo)}>
                  {showMoreInfo ? "Show Less" : "Show More"}
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Today's Goal</h4>
                  <p className="text-sm text-muted-foreground">
                    {isEasyWorkout ? 
                      "Recovery and aerobic development - keep the effort comfortable and controlled." :
                      "This is a key workout day designed to significantly boost your VO2 max, speed, and running economy."}
                  </p>
                </div>
                
                {showMoreInfo && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">About {workout.type.split(' ')[0]} Workouts</h4>
                    <p className="text-sm text-muted-foreground">{workoutInfo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-6">
            <div className="flex justify-between w-full">
              <Button variant="outline" className="gap-2">
                <XCircle className="h-4 w-4" />
                Skip Workout
              </Button>
              <Button className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Complete Workout
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
