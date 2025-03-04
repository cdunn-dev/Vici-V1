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
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: user?.email || "",
      connectedApps: user?.connectedApps || [],
    },
  });

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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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
                  onClick={handleStravaConnect}
                  disabled={user?.connectedApps?.includes("strava") || isConnecting}
                >
                  <SiStrava className="h-8 w-8 mr-2" />
                  {isConnecting
                    ? "Connecting..."
                    : user?.connectedApps?.includes("strava")
                      ? "Connected to Strava"
                      : "Connect Strava"
                  }
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
        </form>
      </Form>
    </div>
  );
}