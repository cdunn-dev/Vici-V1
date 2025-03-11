import { SiStrava } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface StravaConnectButtonProps {
  className?: string;
  onConnect?: () => void;
}

export function StravaConnectButton({ className, onConnect }: StravaConnectButtonProps) {
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/strava/auth');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get auth URL');
      }

      const { url } = await res.json();
      console.log('Redirecting to Strava auth URL:', url);
      window.location.href = url;

      if (onConnect) {
        onConnect();
      }
    } catch (error) {
      console.error('Error initiating Strava connection:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Strava. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      className={`bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white hover:text-white border-0 ${className}`}
      onClick={handleConnect}
    >
      <SiStrava className="mr-2 h-5 w-5" />
      Connect with Strava
    </Button>
  );
}