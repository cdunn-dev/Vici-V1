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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { userProfileUpdateSchema, GenderEnum, DistanceUnitEnum } from "@shared/schema";
import { 
  SiStrava, 
  SiGarmin, 
  SiNike,
  SiFitbit,
} from "react-icons/si";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Camera, CalendarIcon, Plus, X, Upload } from "lucide-react";
import { apiRequest, invalidateQueries } from "@/lib/api";
import { AddPersonalBestForm } from "@/components/training/add-personal-best-form";

interface PersonalBest {
  distance: string;
  time: string;
  date: string;
}

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [addingPersonalBest, setAddingPersonalBest] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  const form = useForm({
    resolver: zodResolver(userProfileUpdateSchema),
    defaultValues: {
      gender: user?.gender || undefined,
      birthday: user?.birthday || undefined,
      preferredDistanceUnit: user?.preferredDistanceUnit || "miles",
      personalBests: user?.personalBests || [],
    },
  });

  // Update form values when user data changes
  useEffect(() => {
    if (user) {
      form.reset({
        gender: user.gender || undefined,
        birthday: user.birthday || undefined,
        preferredDistanceUnit: user.preferredDistanceUnit || "miles",
        personalBests: user.personalBests || [],
      });
    }
  }, [user, form]);

  // Reset preview when profile picture changes
  useEffect(() => {
    if (user?.profilePicture) {
      setPreviewUrl(user.profilePicture);
    }
  }, [user?.profilePicture]);

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
      setIsEditing(false);
      setAddingPersonalBest(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("profilePicture", file);

    try {
      const response = await fetch(`/api/users/${user?.id}/profile-picture`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload profile picture");

      invalidateQueries(["/api/user"]);
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error) {
      setPreviewUrl(user?.profilePicture || null);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    }
  };

  const handleStravaConnect = async () => {
    if (isConnecting) return;

    try {
      setIsConnecting(true);

      if (!user?.id) {
        throw new Error("User ID is required to connect Strava");
      }

      const res = await fetch(`/api/strava/auth?userId=${user.id}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get auth URL');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      console.error("Strava connection error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to connect to Strava",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutateAsync(data))}>
          {/* Profile Picture */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
              <CardDescription>
                Upload a profile picture to personalize your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-8">
                <div className="relative h-32 w-32">
                  <div className="h-full w-full rounded-full overflow-hidden bg-muted">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium">Upload Requirements</h4>
                  <ul className="text-sm text-muted-foreground">
                    <li>Square image recommended</li>
                    <li>Maximum file size: 5MB</li>
                    <li>Supported formats: JPG, PNG</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Your personal information helps us personalize your training experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(GenderEnum.Values).map((gender) => (
                          <SelectItem
                            key={gender}
                            value={gender}
                            className="capitalize"
                          >
                            {gender.replace("-", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthday"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date of birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={!isEditing}
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
                          onSelect={field.onChange}
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

              <FormField
                control={form.control}
                name="preferredDistanceUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Distance Unit</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isEditing}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.values(DistanceUnitEnum.Values).map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit.charAt(0).toUpperCase() + unit.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing ? (
                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              ) : (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Personal Bests */}
          <Card className="mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Personal Bests</CardTitle>
                <CardDescription>
                  Track your best performances across different distances
                </CardDescription>
              </div>
              <Dialog open={addingPersonalBest} onOpenChange={setAddingPersonalBest}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!isEditing}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Personal Best</DialogTitle>
                  </DialogHeader>
                  <AddPersonalBestForm 
                    onSubmit={(data) => {
                      const personalBests = form.getValues("personalBests");
                      form.setValue("personalBests", [...personalBests, data]);
                      setAddingPersonalBest(false);
                    }}
                    onCancel={() => setAddingPersonalBest(false)}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {form.watch("personalBests")?.map((pb: PersonalBest, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{pb.distance}</p>
                      <p className="text-sm text-muted-foreground">
                        {pb.time} • {format(new Date(pb.date), "PP")}
                      </p>
                    </div>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const personalBests = form.getValues("personalBests");
                          personalBests.splice(index, 1);
                          form.setValue("personalBests", [...personalBests]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Connected Apps */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Apps</CardTitle>
              <CardDescription>
                Connect your fitness tracking apps for better training insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-16 justify-start gap-2"
                  onClick={handleStravaConnect}
                  disabled={user?.connectedApps?.includes("strava") || isConnecting}
                >
                  <SiStrava className="h-5 w-5 text-[#FC4C02]" />
                  <span className="text-sm">
                    {isConnecting
                      ? "Connecting..."
                      : user?.connectedApps?.includes("strava")
                        ? "Connected"
                        : "Strava"
                    }
                  </span>
                </Button>
                <Button variant="outline" className="h-16 justify-start gap-2" disabled>
                  <SiGarmin className="h-5 w-5 text-[#000000]" />
                  <span className="text-sm">Garmin</span>
                </Button>
                <Button variant="outline" className="h-16 justify-start gap-2" disabled>
                  <img src="/coros-logo.svg" alt="Coros" className="h-5 w-5" />
                  <span className="text-sm">Coros</span>
                </Button>
                <Button variant="outline" className="h-16 justify-start gap-2" disabled>
                  <SiFitbit className="h-5 w-5" />
                  <span className="text-sm">Fitbit</span>
                </Button>
                <Button variant="outline" className="h-16 justify-start gap-2" disabled>
                  <SiNike className="h-5 w-5" />
                  <span className="text-sm">Nike Run</span>
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-16 justify-start">
                      <Plus className="h-5 w-5" />
                      <span className="text-sm ml-2">More</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Additional Integrations</DialogTitle>
                    </DialogHeader>
                    <div className="pt-4 space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Support for additional fitness platforms coming soon:
                      </p>
                      <ul className="text-sm space-y-2">
                        <li>• Polar</li>
                        <li>• Suunto</li>
                        <li>• Apple Health</li>
                        <li>• Google Fit</li>
                        <li>• Whoop</li>
                        <li>• Oura Ring</li>
                      </ul>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {user?.connectedApps?.includes("strava") && (
                <Button
                  variant="secondary"
                  className="w-full mt-4"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/activities/sync", {
                        method: "POST",
                      });

                      if (!res.ok) throw new Error("Failed to sync");

                      toast({
                        title: "Success",
                        description: "Successfully synced Strava activities",
                      });
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to sync Strava activities",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Sync Activities
                </Button>
              )}
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}