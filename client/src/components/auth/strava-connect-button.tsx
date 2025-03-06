import { SiStrava } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface StravaConnectButtonProps {
  className?: string;
  onConnect?: () => void;
}

export function StravaConnectButton({ className, onConnect }: StravaConnectButtonProps) {
  const { toast } = useToast();

  const handleConnect = () => {
    try {
      const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
      if (!clientId) {
        throw new Error("Strava Client ID not configured");
      }

      const redirectUri = `${window.location.origin}/api/auth/strava/callback`;
      const scope = 'read,activity:read_all';

      const authUrl = new URL('https://www.strava.com/oauth/authorize');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scope);

      window.location.href = authUrl.toString();
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