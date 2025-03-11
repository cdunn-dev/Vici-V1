import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { RefreshCw, Link2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function StravaDebugPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUrlStatus, setAuthUrlStatus] = useState<{ url?: string, error?: string } | null>(null);
  const [configInfo, setConfigInfo] = useState<{ 
    clientId: boolean, 
    clientSecret: boolean, 
    callbackUrl: string 
  } | null>(null);

  useEffect(() => {
    if (user?.connectedApps?.includes('strava')) {
      setIsConnected(true);
      fetchActivities();
    }

    // Get Strava configuration info
    fetch('/api/strava/config')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch Strava configuration');
        }
        return res.json();
      })
      .then(data => {
        setConfigInfo(data);
      })
      .catch(err => {
        console.error('Error fetching Strava config:', err);
        setConfigInfo({
          clientId: false,
          clientSecret: false,
          callbackUrl: 'Unknown'
        });
      });
  }, [user]);

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/activities');
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }
      const data = await response.json();
      setActivities(data);
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  };

  const testAuthUrl = async () => {
    setLoading(true);
    setAuthUrlStatus(null);
    try {
      const response = await fetch('/api/strava/auth');
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      setAuthUrlStatus({ url: data.url });
      toast({
        title: 'Success',
        description: 'Auth URL generated successfully',
      });
    } catch (err) {
      console.error('Error testing auth URL:', err);
      setAuthUrlStatus({ error: err.message });
      toast({
        title: 'Error',
        description: 'Failed to generate auth URL',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/activities/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync activities');
      }

      await fetchActivities();
      toast({
        title: 'Sync Complete',
        description: 'Your Strava activities have been synced.',
      });
    } catch (err) {
      setError(err.message);
      toast({
        title: 'Sync Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Strava Debug</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Strava Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {configInfo ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Client ID:</span>
                {configInfo.clientId ? (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Configured
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Missing
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className="font-medium">Client Secret:</span>
                {configInfo.clientSecret ? (
                  <span className="text-green-600 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Configured
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-1" /> Missing
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-medium">Callback URL:</span>
                <code className="block p-2 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-auto">
                  {configInfo.callbackUrl}
                </code>
              </div>

              <Button
                variant="outline"
                onClick={testAuthUrl}
                disabled={loading}
                className="mt-2"
              >
                {loading ? 'Testing...' : 'Test Auth URL Generation'}
              </Button>

              {authUrlStatus && (
                <div className="mt-2">
                  {authUrlStatus.url ? (
                    <Alert className="bg-green-50 border-green-200">
                      <AlertTitle className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Auth URL Generated Successfully
                      </AlertTitle>
                      <AlertDescription>
                        <div className="text-xs mt-1 overflow-auto">
                          <code>{authUrlStatus.url}</code>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <AlertTitle>Error Generating Auth URL</AlertTitle>
                      <AlertDescription>{authUrlStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">Loading configuration...</div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <Alert className="bg-green-50 border-green-200">
              <AlertTitle>Connected to Strava</AlertTitle>
              <AlertDescription>
                Your account is connected to Strava.
                {user?.stravaTokens && (
                  <div className="mt-2 text-xs">
                    <div>Access Token: {user.stravaTokens.accessToken?.substring(0, 10)}...</div>
                    <div>Expires At: {new Date(user.stravaTokens.expiresAt * 1000).toLocaleString()}</div>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTitle>Not Connected</AlertTitle>
              <AlertDescription>
                Your account is not connected to Strava.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            variant={isConnected ? "outline" : "default"}
            disabled={loading}
            onClick={testAuthUrl}
            className="mr-2"
          >
            Test Connection
          </Button>
          <Button 
            variant="default"
            disabled={loading}
            onClick={() => window.location.href = '/api/strava/auth'}
          >
            {isConnected ? 'Reconnect Strava' : 'Connect Strava'}
          </Button>
        </CardFooter>
      </Card>

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Strava Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={handleSync} 
              disabled={loading}
              className="mb-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Activities
                </>
              )}
            </Button>

            {activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity: any) => (
                  <div key={activity.activity.id} className="p-4 border rounded-md">
                    <div className="font-medium">{activity.activity.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(activity.activity.startDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm">
                      Distance: {(activity.activity.distance / 1000).toFixed(2)} km
                    </div>
                    <div className="text-sm">
                      Duration: {Math.floor(activity.activity.movingTime / 60)} minutes
                    </div>
                    {activity.activity.stravaId && (
                      <a 
                        href={`https://www.strava.com/activities/${activity.activity.stravaId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 text-sm flex items-center mt-2"
                      >
                        <Link2 className="h-3 w-3 mr-1" /> View on Strava
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No activities found. Click sync to import your Strava activities.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}