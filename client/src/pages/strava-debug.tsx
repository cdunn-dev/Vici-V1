import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function StravaDebugPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [stravaStatus, setStravaStatus] = useState<string>('Loading...');

  useEffect(() => {
    // Get the auth URL on page load
    fetchAuthUrl();

    // Check Strava connection status
    if (user) {
      if (user.connectedApps?.includes('strava')) {
        setStravaStatus('Connected');
      } else {
        setStravaStatus('Not connected');
      }
    }
  }, [user]);

  const fetchAuthUrl = async () => {
    try {
      const response = await fetch('/api/strava/auth');
      const data = await response.json();
      setAuthUrl(data.url);
    } catch (error) {
      console.error('Error fetching Strava auth URL:', error);
      setAuthUrl(null);
    }
  };

  const handleSyncActivities = async () => {
    try {
      const res = await fetch('/api/activities/sync', {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to sync activities');
      }

      toast({
        title: 'Success',
        description: 'Successfully synced Strava activities',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync Strava activities',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Strava Integration Debug</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>Current status of your Strava connection</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Status: <span className={user?.connectedApps?.includes('strava') ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>{stravaStatus}</span></p>
            {user?.stravaTokens && (
              <div className="mb-4">
                <p>Access Token: {user.stravaTokens.accessToken.substring(0, 10)}...</p>
                <p>Expires At: {new Date(user.stravaTokens.expiresAt * 1000).toLocaleString()}</p>
              </div>
            )}
            {authUrl ? (
              <a href={authUrl} className="bg-[#FC4C02] text-white px-4 py-2 rounded hover:bg-[#FC4C02]/90 inline-block">
                Connect with Strava
              </a>
            ) : (
              <p>Error loading Strava authentication URL</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sync Activities</CardTitle>
            <CardDescription>Manually trigger Strava activity synchronization</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSyncActivities} 
              disabled={!user?.stravaTokens}
              className="bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white"
            >
              Sync Activities
            </Button>
            {!user?.stravaTokens && <p className="mt-2 text-sm text-red-500">Please connect to Strava first</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Current Strava integration configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Callback URL: <code className="bg-muted p-1 rounded">{window.location.origin}/api/auth/strava/callback</code></p>
            <p className="mt-2 text-sm">Make sure this URL is registered in your Strava OAuth application settings.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}