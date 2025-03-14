import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useStravaProfile } from "@/hooks/use-strava-profile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { userProfileUpdateSchema } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2 } from "lucide-react";
import { apiRequest, invalidateQueries } from "@/lib/api";

export default function ProfileReview() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: stravaProfile, isLoading: isLoadingStrava } = useStravaProfile();
  
  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/user"],
  });

  const form = useForm({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: {
      gender: "",
      birthday: "",
      preferredDistanceUnit: "miles",
      personalBests: [],
      runningExperience: "",
      fitnessLevel: "",
    },
  });

  // Update form when Strava profile loads
  useEffect(() => {
    if (stravaProfile) {
      form.reset({
        gender: stravaProfile.gender,
        birthday: stravaProfile.birthday,
        preferredDistanceUnit: stravaProfile.measurementPreference,
        personalBests: stravaProfile.personalBests || [],
        runningExperience: stravaProfile.runningExperience?.level,
        fitnessLevel: stravaProfile.runningExperience?.fitnessLevel,
      });
    }
  }, [stravaProfile, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiRequest("PATCH", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      invalidateQueries(["/api/user"]);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      // Redirect to training page after successful update
      setLocation("/training");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  if (isLoadingUser || isLoadingStrava) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Strava Profile</CardTitle>
          <CardDescription>
            We've imported your data from Strava. Please review and confirm these details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutateAsync(data))} className="space-y-6">
              {/* Profile Information */}
              <div className="grid gap-6">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="M">Male</SelectItem>
                          <SelectItem value="F">Female</SelectItem>
                          <SelectItem value="O">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Imported from Strava</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <input
                          type="date"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Imported from Strava</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredDistanceUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Distance Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="miles">Miles</SelectItem>
                          <SelectItem value="kilometers">Kilometers</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Based on your Strava settings</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Running Experience */}
              <Card>
                <CardHeader>
                  <CardTitle>Running Profile</CardTitle>
                  <CardDescription>Based on analysis of your Strava activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="runningExperience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Running Experience</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select experience level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {stravaProfile?.runningExperience && (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              Based on your recent Strava activities
                            </div>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Personal Bests */}
                  {stravaProfile?.personalBests && stravaProfile.personalBests.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Personal Bests</h4>
                      <div className="grid gap-2">
                        {stravaProfile.personalBests.map((pb, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{pb.distance}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(pb.date), "MMM d, yyyy")}
                              </div>
                            </div>
                            <div className="font-mono">{pb.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/profile")}
                >
                  Skip for Now
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Confirm & Continue"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
