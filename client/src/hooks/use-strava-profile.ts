import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface StravaProfile {
  gender: string;
  birthday: string;
  measurementPreference: string;
  weight: number;
  runningExperience: {
    level: string;
    weeklyMileage: number;
    preferredRunDays: string[];
    commonWorkoutTypes: string[];
  };
}

export function useStravaProfile() {
  return useQuery<StravaProfile>({
    queryKey: ["/api/strava/profile"],
    queryFn: () => getQueryFn({ on401: "returnNull" })("/api/strava/profile"),
    // Don't show errors if not connected to Strava
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
    throwOnError: false
  });
}