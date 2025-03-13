import { SiStrava } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface StravaConnectButtonProps {
  className?: string;
  onConnect?: () => void;
}

export function StravaConnectButton({ className, onConnect }: StravaConnectButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in before connecting to Strava",
          variant: "destructive",
        });
        return;
      }

      setIsConnecting(true);

      // Add state parameter for security
      const res = await fetch('/api/strava/auth', {
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to get Strava authorization URL');
      }

      const data = await res.json();
      console.log('Redirecting to Strava auth URL:', data.url);

      // Ensure we're using the proper URL from the server
      if (!data.url) {
        throw new Error('No authorization URL received from server');
      }

      // Use window.location.assign for more reliable redirect
      window.location.assign(data.url);

      if (onConnect) {
        onConnect();
      }
    } catch (error) {
      console.error('Error initiating Strava connection:', error);
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to Strava. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={`bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white hover:text-white border-0 ${className}`}
      onClick={handleConnect}
      disabled={isConnecting}
    >
      <SiStrava className="mr-2 h-5 w-5" />
      {isConnecting ? "Connecting..." : "Connect with Strava"}
    </Button>
  );
}