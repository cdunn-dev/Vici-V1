
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { StravaConnectButton } from "@/components/auth/strava-connect-button";
import { toast } from "@/components/ui/use-toast";

export default function StravaDebugPage() {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkStravaConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/strava/debug");
      const data = await response.json();
      setDebugInfo(data);
      toast({
        title: "Debug info retrieved",
        description: "Check the displayed information below",
      });
    } catch (error) {
      console.error("Error checking Strava config:", error);
      toast({
        title: "Error",
        description: "Failed to check Strava configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Strava Integration Debug</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Strava Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Strava Connected: {user?.connectedApps?.includes("strava") ? "Yes ✅" : "No ❌"}
            </p>
            {!user?.connectedApps?.includes("strava") && (
              <StravaConnectButton 
                onConnect={() => {
                  toast({
                    title: "Redirecting to Strava",
                    description: "You'll be redirected to Strava to authorize access",
                  });
                }}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debug Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={checkStravaConfig} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Checking..." : "Check Strava Configuration"}
            </Button>
            
            {user?.connectedApps?.includes("strava") && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const res = await fetch("/api/activities/sync", {
                      method: "POST",
                    });

                    if (!res.ok) {
                      const errorData = await res.json();
                      throw new Error(errorData.error || "Failed to sync");
                    }

                    toast({
                      title: "Success",
                      description: "Successfully synced Strava activities",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to sync Strava activities",
                      variant: "destructive",
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Test Sync Activities
              </Button>
            )}
          </CardContent>
        </Card>

        {debugInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Strava Configuration Details</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-black/10 p-4 rounded-md overflow-auto text-sm">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
