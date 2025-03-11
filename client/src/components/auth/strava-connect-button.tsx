import { SiStrava } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface StravaConnectButtonProps {
  className?: string;
  onConnect?: () => void;
}

export function StravaConnectButton({ className, onConnect }: StravaConnectButtonProps) {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      const res = await fetch('/api/strava/auth');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get Strava authorization URL');
      }

      console.log('Redirecting to Strava auth URL:', data.url);
      window.location.href = data.url;

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