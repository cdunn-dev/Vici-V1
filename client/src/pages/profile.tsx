import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { insertUserSchema } from "@shared/schema";
import { SiStrava, SiGarmin, SiNike } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: user?.username || "",
      name: user?.name || "",
      dateOfBirth: user?.dateOfBirth?.split('T')[0] || new Date().toISOString().split('T')[0],
      gender: user?.gender || "",
      personalBests: user?.personalBests || {},
      connectedApps: user?.connectedApps || [],
    },
  });

  const onSubmit = async (data: any) => {
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isEditing ? (
                  <Button type="submit">Save Changes</Button>
                ) : (
                  <Button type="button" onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connected Apps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-20"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/strava/auth?userId=${user?.id}`);
                      const { url } = await res.json();
                      window.location.href = url;
                    } catch (error) {
                      toast({
                        title: "Error",
                        description: "Failed to connect to Strava",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={user?.connectedApps?.includes("strava")}
                >
                  <SiStrava className="h-8 w-8 mr-2" />
                  {user?.connectedApps?.includes("strava") ? "Connected to Strava" : "Connect Strava"}
                </Button>
                <Button variant="outline" className="h-20" disabled>
                  <SiGarmin className="h-8 w-8 mr-2" />
                  Connect Garmin
                </Button>
                <Button variant="outline" className="h-20" disabled>
                  <SiNike className="h-8 w-8 mr-2" />
                  Connect Nike
                </Button>
              </div>

              {user?.connectedApps?.includes("strava") && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/strava/sync", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ userId: user.id }),
                      });

                      if (!res.ok) throw new Error("Failed to sync");

                      const data = await res.json();
                      toast({
                        title: "Success",
                        description: `Synced ${data.count} activities from Strava`,
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
                  Sync Strava Activities
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Bests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["5K", "10K", "Half Marathon", "Marathon"].map((distance) => (
                  <FormField
                    key={distance}
                    control={form.control}
                    name={`personalBests.${distance.toLowerCase().replace(" ", "")}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{distance}</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            step="1"
                            {...field}
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}